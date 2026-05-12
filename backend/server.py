"""Smart Lost & Found Ecosystem - FastAPI backend."""
import os
import logging
import asyncio
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Optional

import httpx
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Query
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import io

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from models import (  # noqa: E402
    new_id, utc_now,
    User, UserPublic, AdminRegister, AdminLogin, GoogleSessionRequest, ProfileUpdate,
    FoundItemCreate, FoundItem, LostItemCreate, LostItem,
    ClaimCreate, Claim, ClaimDecision,
    CentreCreate, Centre,
    Notification, MatchResult,
)
from auth import (  # noqa: E402
    hash_password, verify_password, create_admin_token,
    get_current_user, get_current_user_optional, require_admin, require_student,
)
from qr_utils import build_qr_png, build_qr_dataurl  # noqa: E402
from ai_matcher import ai_match_lost_to_found  # noqa: E402
from json_mirror import dump_collection, dump_many, dump_all  # noqa: E402


# ---------- App + DB ----------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ.get("DB_NAME", "lost_found_db")
APP_BASE_URL = os.environ.get("APP_BASE_URL", "")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="Smart Lost & Found Ecosystem API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s :: %(message)s")
logger = logging.getLogger(__name__)


# ---------- Helpers ----------
def _public_user(u: dict) -> dict:
    if not u:
        return {}
    return {
        "user_id": u.get("user_id"),
        "email": u.get("email"),
        "name": u.get("name"),
        "picture": u.get("picture"),
        "role": u.get("role"),
        "points": u.get("points", 0),
        "badges": u.get("badges", []),
        "institute": u.get("institute"),
        "roll_no": u.get("roll_no"),
        "phone": u.get("phone"),
        "profile_complete": bool(u.get("profile_complete")),
    }


def _timeline_entry(status: str, by: Optional[dict] = None, notes: Optional[str] = None) -> dict:
    return {
        "status": status,
        "at": utc_now(),
        "by_user_id": by.get("user_id") if by else None,
        "by_name": by.get("name") if by else None,
        "notes": notes,
    }


async def _notify(user_id: str, ntype: str, title: str, body: str, link: Optional[str] = None):
    note = {
        "notification_id": new_id("ntf_"),
        "user_id": user_id,
        "type": ntype,
        "title": title,
        "body": body,
        "link": link,
        "read": False,
        "created_at": utc_now(),
    }
    await db.notifications.insert_one(note)
    await dump_collection(db, "notifications")


async def _award_points(user_id: str, points: int, badge: Optional[str] = None, reason: Optional[str] = None):
    update = {"$inc": {"points": points}}
    if badge:
        update["$addToSet"] = {"badges": badge}
    await db.users.update_one({"user_id": user_id}, update)
    if reason:
        await _notify(user_id, "reward", "You earned points!", reason)
    await dump_collection(db, "users")


async def _award_finder_by_roll_no(found_item: dict, claim: dict):
    """When a claim is closed (item collected), find the original finder by
    submitted_by_roll_no + submitted_by_institute and award them a Reunited badge + points."""
    roll_no = (found_item or {}).get("submitted_by_roll_no")
    institute = (found_item or {}).get("submitted_by_institute")
    if not roll_no:
        return
    query: dict = {"roll_no": roll_no, "role": "student"}
    if institute:
        query["institute"] = institute
    finder = await db.users.find_one(query, {"_id": 0})
    if not finder:
        logger.info(f"No finder found for roll_no={roll_no} institute={institute}")
        return
    await _award_points(
        finder["user_id"], 50, badge="Trusted Finder",
        reason=f"You helped reunite '{found_item.get('title')}' with its owner! +50 pts"
    )
    await _notify(
        finder["user_id"], "reward", "Item you handed in was reunited! 🎉",
        f"'{found_item.get('title')}' you submitted has been collected by its owner. +50 pts and the Trusted Finder badge!",
        link=f"/items/{found_item.get('item_id')}"
    )


# ---------- AUTH ROUTES ----------
@api.post("/auth/admin/register")
async def admin_register(payload: AdminRegister):
    existing = await db.users.find_one({"email": payload.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = new_id("adm_")
    doc = {
        "user_id": user_id,
        "email": payload.email.lower(),
        "name": payload.name,
        "role": "admin",
        "password_hash": hash_password(payload.password),
        "picture": None,
        "points": 0,
        "badges": [],
        "institute": None,
        "phone": None,
        "profile_complete": False,
        "created_at": utc_now(),
    }
    await db.users.insert_one(doc)
    await dump_collection(db, "users")
    token = create_admin_token(user_id, payload.email.lower())
    return {"access_token": token, "token_type": "bearer", "user": _public_user(doc)}


@api.post("/auth/admin/login")
async def admin_login(payload: AdminLogin):
    user = await db.users.find_one({"email": payload.email.lower(), "role": "admin"})
    if not user or not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_admin_token(user["user_id"], user["email"])
    return {"access_token": token, "token_type": "bearer", "user": _public_user(user)}


@api.post("/auth/google/session")
async def google_session(payload: GoogleSessionRequest, response: Response):
    """Exchange Emergent Google session_id for our session_token cookie (students only)."""
    try:
        async with httpx.AsyncClient(timeout=15) as http:
            r = await http.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": payload.session_id},
            )
        if r.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        data = r.json()
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Google session validation failed: %s", e)
        raise HTTPException(status_code=500, detail="Auth service unreachable")

    email = (data.get("email") or "").lower()
    name = data.get("name") or email
    picture = data.get("picture")
    session_token = data.get("session_token")
    if not email or not session_token:
        raise HTTPException(status_code=400, detail="Incomplete session data")

    # Upsert student user
    existing = await db.users.find_one({"email": email})
    if existing:
        if existing.get("role") == "admin":
            # Don't downgrade. Allow login but keep admin role.
            user_id = existing["user_id"]
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {"name": name, "picture": picture}},
            )
        else:
            user_id = existing["user_id"]
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {"name": name, "picture": picture}},
            )
    else:
        user_id = new_id("stu_")
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "role": "student",
            "points": 0,
            "badges": [],
            "institute": None,
            "roll_no": None,
            "phone": None,
            "profile_complete": False,
            "created_at": utc_now(),
        })
        await dump_collection(db, "users")
        await _notify(user_id, "system", "Welcome to FindIt!", "Complete your profile so admins can attribute finds to you.")

    # Store session
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "session_token": session_token,
        "user_id": user_id,
        "expires_at": expires_at,
        "created_at": utc_now(),
    })

    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 60 * 60,
        path="/",
    )

    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    return {"user": _public_user(user)}


@api.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {"user": _public_user(user)}


@api.patch("/auth/profile")
async def update_profile(payload: ProfileUpdate, user: dict = Depends(get_current_user)):
    update: dict = {}
    # Students can edit all profile fields; admins can edit name/picture/phone/institute
    fields = ["name", "picture", "institute", "phone"]
    if user.get("role") == "student":
        fields += ["roll_no"]
    for f in fields:
        v = getattr(payload, f, None)
        if v is not None:
            update[f] = v
    if not update:
        raise HTTPException(status_code=400, detail="Nothing to update")

    # Determine profile_complete based on role-specific required fields
    merged = {**user, **update}
    if merged.get("role") == "student":
        complete = bool(merged.get("name") and merged.get("institute") and merged.get("roll_no"))
    else:
        complete = bool(merged.get("name") and merged.get("institute"))
    update["profile_complete"] = complete

    await db.users.update_one({"user_id": user["user_id"]}, {"$set": update})
    await dump_collection(db, "users")
    fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "password_hash": 0})
    return {"user": _public_user(fresh)}


@api.get("/admin/onboarding-status")
async def admin_onboarding_status(admin: dict = Depends(require_admin)):
    centres_count = await db.centres.count_documents({"managed_by_admin_id": admin["user_id"]})
    return {
        "profile_complete": bool(admin.get("profile_complete")),
        "has_centre": centres_count > 0,
        "needs_onboarding": not (admin.get("profile_complete") and centres_count > 0),
    }


@api.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if not token:
        auth_header = request.headers.get("authorization") or ""
        if auth_header.lower().startswith("bearer "):
            token = auth_header.split()[1]
    if token:
        await db.user_sessions.delete_many({"session_token": token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


# ---------- FOUND ITEMS ----------
@api.get("/items/found", response_model=List[FoundItem])
async def list_found_items(
    q: Optional[str] = None,
    category: Optional[str] = None,
    building: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 100,
):
    query: dict = {}
    if status:
        query["status"] = status
    if category:
        query["category"] = {"$regex": f"^{category}$", "$options": "i"}
    if building:
        query["building"] = {"$regex": building, "$options": "i"}
    if date_from or date_to:
        date_filter = {}
        if date_from:
            date_filter["$gte"] = date_from
        if date_to:
            date_filter["$lte"] = date_to
        query["date_found"] = date_filter
    if q:
        query["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
            {"brand": {"$regex": q, "$options": "i"}},
            {"color": {"$regex": q, "$options": "i"}},
            {"location_found": {"$regex": q, "$options": "i"}},
        ]
    cursor = db.found_items.find(query, {"_id": 0}).sort("created_at", -1).limit(limit)
    items = await cursor.to_list(length=limit)
    return items


@api.get("/items/found/recent", response_model=List[FoundItem])
async def recent_found_items(limit: int = 8):
    cursor = db.found_items.find({"status": {"$in": ["open", "matched", "claim_pending"]}}, {"_id": 0}).sort("created_at", -1).limit(limit)
    return await cursor.to_list(length=limit)


@api.get("/items/found/{item_id}", response_model=FoundItem)
async def get_found_item(item_id: str):
    item = await db.found_items.find_one({"item_id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    return item


@api.get("/items/found/{item_id}/qr")
async def get_found_item_qr(item_id: str):
    item = await db.found_items.find_one({"item_id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    payload = item.get("qr_payload") or f"{APP_BASE_URL}/items/{item_id}"
    png = build_qr_png(payload)
    return StreamingResponse(io.BytesIO(png), media_type="image/png")


@api.post("/items/found", response_model=FoundItem)
async def create_found_item(payload: FoundItemCreate, admin: dict = Depends(require_admin)):
    # Enforce onboarding: admin must complete profile + own at least one centre
    if not admin.get("profile_complete"):
        raise HTTPException(status_code=400, detail="Complete your admin profile before posting items")
    own_centre = await db.centres.find_one({"managed_by_admin_id": admin["user_id"]}, {"_id": 0})
    if not own_centre:
        raise HTTPException(status_code=400, detail="Create your Lost & Found Centre before posting items")

    item_id = new_id("fnd_")
    qr_payload = f"{APP_BASE_URL}/items/{item_id}"
    doc = payload.model_dump()
    # Centre defaults to admin's own centre if not supplied
    if not doc.get("centre_id"):
        doc["centre_id"] = own_centre.get("centre_id")
    # If admin didn't supply finder institute, default to centre's institute
    if doc.get("submitted_by_roll_no") and not doc.get("submitted_by_institute"):
        doc["submitted_by_institute"] = own_centre.get("institute") or admin.get("institute")
    doc.update({
        "item_id": item_id,
        "qr_payload": qr_payload,
        "status": "open",
        "posted_by_admin_id": admin["user_id"],
        "posted_by_admin_name": admin.get("name"),
        "created_at": utc_now(),
        "updated_at": utc_now(),
    })
    await db.found_items.insert_one(doc)
    await dump_collection(db, "found_items")
    # Trigger AI matching against open lost items (fire-and-forget)
    asyncio.create_task(_auto_match_for_new_found(doc))
    return {k: v for k, v in doc.items() if k not in ("_id", "submitted_by_roll_no", "submitted_by_institute")}


@api.put("/items/found/{item_id}", response_model=FoundItem)
async def update_found_item(item_id: str, payload: FoundItemCreate, admin: dict = Depends(require_admin)):
    update_doc = payload.model_dump()
    update_doc["updated_at"] = utc_now()
    res = await db.found_items.update_one({"item_id": item_id}, {"$set": update_doc})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    await dump_collection(db, "found_items")
    item = await db.found_items.find_one({"item_id": item_id}, {"_id": 0})
    return item


@api.delete("/items/found/{item_id}")
async def delete_found_item(item_id: str, admin: dict = Depends(require_admin)):
    res = await db.found_items.delete_one({"item_id": item_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    await dump_collection(db, "found_items")
    return {"ok": True}


@api.get("/items/found/by-centre/{centre_id}", response_model=List[FoundItem])
async def items_by_centre(centre_id: str):
    """Public — list all items belonging to a specific centre."""
    cursor = db.found_items.find({"centre_id": centre_id}, {"_id": 0}).sort("created_at", -1).limit(200)
    return await cursor.to_list(length=200)


async def _auto_match_for_new_found(found_doc: dict):
    """When a new found item is posted, scan open lost reports for candidates and create notifications."""
    try:
        cursor = db.lost_items.find({"status": "open"}, {"_id": 0})
        lost_items = await cursor.to_list(length=200)
        for lost in lost_items:
            matches = await ai_match_lost_to_found(lost, [found_doc])
            if matches and matches[0]["similarity"] >= 60:
                m = matches[0]
                await _notify(
                    user_id=lost["reported_by_user_id"],
                    ntype="match",
                    title="Potential match found!",
                    body=f"A found item '{found_doc['title']}' may be your lost {lost['title']} ({m['similarity']}% match).",
                    link=f"/items/{found_doc['item_id']}",
                )
                await db.lost_items.update_one({"item_id": lost["item_id"]}, {"$set": {"status": "matched"}})
    except Exception as e:
        logger.warning(f"Auto-match failed: {e}")


# ---------- LOST ITEMS ----------
@api.post("/items/lost", response_model=LostItem)
async def create_lost_item(payload: LostItemCreate, user: dict = Depends(get_current_user)):
    item_id = new_id("lst_")
    doc = payload.model_dump()
    doc.update({
        "item_id": item_id,
        "status": "open",
        "reported_by_user_id": user["user_id"],
        "reported_by_name": user.get("name"),
        "reported_by_email": user.get("email"),
        "reported_by_institute": user.get("institute"),
        "created_at": utc_now(),
    })
    await db.lost_items.insert_one(doc)
    await dump_collection(db, "lost_items")
    # Broadcast to admins
    admins = await db.users.find({"role": "admin"}, {"_id": 0, "user_id": 1}).to_list(length=50)
    for a in admins:
        await _notify(
            user_id=a["user_id"],
            ntype="lost_alert",
            title="New lost item alert",
            body=f"{user.get('name','A student')} reported a lost {payload.category}: {payload.title}.",
            link=f"/admin/lost/{item_id}",
        )
    # Auto-match against existing found items
    asyncio.create_task(_auto_match_for_new_lost(doc, user))
    return {k: v for k, v in doc.items() if k != "_id"}


async def _auto_match_for_new_lost(lost_doc: dict, user: dict):
    try:
        cursor = db.found_items.find({"status": {"$in": ["open"]}}, {"_id": 0})
        found_items = await cursor.to_list(length=200)
        if not found_items:
            return
        matches = await ai_match_lost_to_found(lost_doc, found_items)
        # Persist top matches
        await db.matches.delete_many({"lost_item_id": lost_doc["item_id"]})
        if matches:
            now = utc_now()
            await db.matches.insert_many([
                {**m, "lost_item_id": lost_doc["item_id"], "created_at": now} for m in matches[:10]
            ])
        if matches and matches[0]["similarity"] >= 60:
            m = matches[0]
            await _notify(
                user_id=user["user_id"],
                ntype="match",
                title="Potential match found!",
                body=f"Found item '{m['title']}' may be your lost {lost_doc['title']} ({m['similarity']}% match).",
                link=f"/items/{m['found_item_id']}",
            )
            await db.lost_items.update_one({"item_id": lost_doc["item_id"]}, {"$set": {"status": "matched"}})
    except Exception as e:
        logger.warning(f"Auto-match (lost) failed: {e}")


@api.get("/items/lost", response_model=List[LostItem])
async def list_lost_items(
    user: dict = Depends(get_current_user),
    mine: bool = False,
    status: Optional[str] = None,
    limit: int = 100,
):
    query: dict = {}
    if user.get("role") == "student" or mine:
        query["reported_by_user_id"] = user["user_id"]
    if status:
        query["status"] = status
    cursor = db.lost_items.find(query, {"_id": 0}).sort("created_at", -1).limit(limit)
    return await cursor.to_list(length=limit)


@api.get("/items/lost/alerts/recent", response_model=List[LostItem])
async def recent_lost_alerts(limit: int = 10):
    """Public endpoint for the homepage alert banner — only basic fields."""
    cursor = db.lost_items.find({"status": {"$in": ["open", "matched"]}}, {"_id": 0, "contact": 0, "reported_by_email": 0}).sort("created_at", -1).limit(limit)
    return await cursor.to_list(length=limit)


@api.get("/items/lost/{item_id}", response_model=LostItem)
async def get_lost_item(item_id: str, user: dict = Depends(get_current_user)):
    item = await db.lost_items.find_one({"item_id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    if user.get("role") != "admin" and item["reported_by_user_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    return item


# ---------- AI MATCHES ----------
@api.get("/ai/match/{lost_item_id}", response_model=List[MatchResult])
async def get_matches_for_lost(lost_item_id: str, user: dict = Depends(get_current_user)):
    lost = await db.lost_items.find_one({"item_id": lost_item_id}, {"_id": 0})
    if not lost:
        raise HTTPException(status_code=404, detail="Lost item not found")
    if user.get("role") != "admin" and lost["reported_by_user_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    cached = await db.matches.find({"lost_item_id": lost_item_id}, {"_id": 0}).sort("similarity", -1).to_list(length=50)
    if cached:
        return cached
    # No cache yet, compute now
    cursor = db.found_items.find({"status": {"$in": ["open"]}}, {"_id": 0})
    found_items = await cursor.to_list(length=200)
    matches = await ai_match_lost_to_found(lost, found_items)
    if matches:
        now = utc_now()
        await db.matches.insert_many([{**m, "lost_item_id": lost_item_id, "created_at": now} for m in matches[:10]])
    return matches


@api.post("/ai/match/{lost_item_id}/refresh", response_model=List[MatchResult])
async def refresh_matches(lost_item_id: str, user: dict = Depends(get_current_user)):
    lost = await db.lost_items.find_one({"item_id": lost_item_id}, {"_id": 0})
    if not lost:
        raise HTTPException(status_code=404, detail="Lost item not found")
    if user.get("role") != "admin" and lost["reported_by_user_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    cursor = db.found_items.find({"status": {"$in": ["open"]}}, {"_id": 0})
    found_items = await cursor.to_list(length=200)
    matches = await ai_match_lost_to_found(lost, found_items)
    await db.matches.delete_many({"lost_item_id": lost_item_id})
    if matches:
        now = utc_now()
        await db.matches.insert_many([{**m, "lost_item_id": lost_item_id, "created_at": now} for m in matches[:10]])
    return matches


# ---------- CLAIMS (5-stage flow + rejected side branch) ----------
ACTIVE_CLAIM_STATUSES = ["submitted", "verifying", "more_proof_requested", "approved", "ready_for_pickup"]
TERMINAL_CLAIM_STATUSES = ["closed", "rejected"]


@api.post("/claims", response_model=Claim)
async def create_claim(payload: ClaimCreate, user: dict = Depends(get_current_user)):
    item = await db.found_items.find_one({"item_id": payload.found_item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Found item not found")
    if item.get("status") in ("returned", "closed"):
        raise HTTPException(status_code=400, detail="Item is no longer available")
    # Prevent duplicate active claim by same user
    existing = await db.claims.find_one({
        "found_item_id": payload.found_item_id,
        "claimant_user_id": user["user_id"],
        "status": {"$in": ACTIVE_CLAIM_STATUSES},
    })
    if existing:
        raise HTTPException(status_code=400, detail="You already have an active claim for this item")

    claim_id = new_id("clm_")
    doc = {
        "claim_id": claim_id,
        "found_item_id": payload.found_item_id,
        "found_item_title": item.get("title"),
        "claimant_user_id": user["user_id"],
        "claimant_name": user.get("name"),
        "claimant_email": user.get("email"),
        "claimant_roll_no": user.get("roll_no"),
        "claimant_institute": user.get("institute"),
        "ownership_proof": payload.ownership_proof,
        "proof_images": payload.proof_images,
        "contact": payload.contact,
        "status": "submitted",
        "timeline": [_timeline_entry("submitted", by=user, notes="Claim filed by student")],
        "created_at": utc_now(),
    }
    await db.claims.insert_one(doc)
    await db.found_items.update_one({"item_id": payload.found_item_id}, {"$set": {"status": "claim_pending"}})
    await dump_many(db, ["claims", "found_items"])

    admins = await db.users.find({"role": "admin"}, {"_id": 0, "user_id": 1}).to_list(length=50)
    for a in admins:
        await _notify(a["user_id"], "claim_update", "New claim filed",
                      f"{user.get('name','A user')} claimed: {item.get('title')}.",
                      link=f"/admin/claims/{claim_id}")
    return {k: v for k, v in doc.items() if k != "_id"}


@api.get("/claims", response_model=List[Claim])
async def list_claims(user: dict = Depends(get_current_user), status: Optional[str] = None):
    query: dict = {}
    if user.get("role") != "admin":
        query["claimant_user_id"] = user["user_id"]
    if status:
        query["status"] = status
    cursor = db.claims.find(query, {"_id": 0}).sort("created_at", -1)
    return await cursor.to_list(length=300)


@api.get("/claims/{claim_id}", response_model=Claim)
async def get_claim(claim_id: str, user: dict = Depends(get_current_user)):
    claim = await db.claims.find_one({"claim_id": claim_id}, {"_id": 0})
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    if user.get("role") != "admin" and claim["claimant_user_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    return claim


async def _transition_claim(claim_id: str, admin: dict, new_status: str,
                            notes: Optional[str], notify_title: str, notify_body: str):
    """Generic claim transition: validates source status, updates record,
    appends timeline entry, fires notification."""
    claim = await db.claims.find_one({"claim_id": claim_id}, {"_id": 0})
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    timeline = claim.get("timeline") or []
    timeline.append(_timeline_entry(new_status, by=admin, notes=notes))
    await db.claims.update_one(
        {"claim_id": claim_id},
        {"$set": {
            "status": new_status,
            "admin_notes": notes,
            "decided_by_admin_id": admin["user_id"],
            "decided_at": utc_now(),
            "timeline": timeline,
        }},
    )
    await _notify(claim["claimant_user_id"], "claim_update", notify_title, notify_body,
                  link=f"/student/my-claims")
    await dump_collection(db, "claims")
    return await db.claims.find_one({"claim_id": claim_id}, {"_id": 0})


@api.post("/claims/{claim_id}/start-verifying", response_model=Claim)
async def start_verifying(claim_id: str, decision: ClaimDecision, admin: dict = Depends(require_admin)):
    return await _transition_claim(
        claim_id, admin, "verifying", decision.notes,
        "Claim under review",
        f"An admin started verifying your claim. We'll let you know the outcome soon."
    )


@api.post("/claims/{claim_id}/request-proof", response_model=Claim)
async def request_more_proof(claim_id: str, decision: ClaimDecision, admin: dict = Depends(require_admin)):
    return await _transition_claim(
        claim_id, admin, "more_proof_requested", decision.notes,
        "More proof needed",
        f"Admin requested more proof for your claim. {decision.notes or ''}"
    )


@api.post("/claims/{claim_id}/approve", response_model=Claim)
async def approve_claim(claim_id: str, decision: ClaimDecision, admin: dict = Depends(require_admin)):
    claim = await db.claims.find_one({"claim_id": claim_id}, {"_id": 0})
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    updated = await _transition_claim(
        claim_id, admin, "approved", decision.notes,
        "Claim approved",
        f"Your proof was accepted. The centre will prepare '{claim['found_item_title']}' for pickup."
    )
    # Auto-reject other active claims for same item
    await db.claims.update_many(
        {"found_item_id": claim["found_item_id"], "claim_id": {"$ne": claim_id}, "status": {"$in": ACTIVE_CLAIM_STATUSES}},
        {"$set": {"status": "rejected", "admin_notes": "Another claim approved",
                  "decided_by_admin_id": admin["user_id"], "decided_at": utc_now()}},
    )
    await dump_collection(db, "claims")
    return updated


@api.post("/claims/{claim_id}/mark-ready", response_model=Claim)
async def mark_ready_for_pickup(claim_id: str, decision: ClaimDecision, admin: dict = Depends(require_admin)):
    claim = await db.claims.find_one({"claim_id": claim_id}, {"_id": 0})
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    if claim.get("status") not in ("approved", "ready_for_pickup"):
        raise HTTPException(status_code=400, detail="Approve the claim first")
    return await _transition_claim(
        claim_id, admin, "ready_for_pickup", decision.notes,
        "Item ready for pickup 🎒",
        f"'{claim['found_item_title']}' is ready at the centre. Bring your roll-no/ID to collect."
    )


@api.post("/claims/{claim_id}/close", response_model=Claim)
async def close_claim(claim_id: str, decision: ClaimDecision, admin: dict = Depends(require_admin)):
    claim = await db.claims.find_one({"claim_id": claim_id}, {"_id": 0})
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    if claim.get("status") not in ("approved", "ready_for_pickup"):
        raise HTTPException(status_code=400, detail="Claim must be approved before closing")

    updated = await _transition_claim(
        claim_id, admin, "closed", decision.notes,
        "Item collected — claim closed",
        f"'{claim['found_item_title']}' was collected. Thanks for using FindIt!"
    )
    # Set item status to returned
    await db.found_items.update_one(
        {"item_id": claim["found_item_id"]},
        {"$set": {"status": "returned", "updated_at": utc_now()}},
    )
    await dump_collection(db, "found_items")
    # Set lost item (if any) to closed
    await db.lost_items.update_many(
        {"reported_by_user_id": claim["claimant_user_id"], "status": {"$in": ["open", "matched"]}},
        {"$set": {"status": "claimed"}}
    )
    # Award claimant
    await _award_points(claim["claimant_user_id"], 30, badge="Reunited",
                        reason=f"You recovered '{claim['found_item_title']}'! +30 pts")
    # Award the original finder (by roll_no on the found item)
    found_item = await db.found_items.find_one({"item_id": claim["found_item_id"]}, {"_id": 0})
    await _award_finder_by_roll_no(found_item, claim)
    return updated


@api.post("/claims/{claim_id}/reject", response_model=Claim)
async def reject_claim(claim_id: str, decision: ClaimDecision, admin: dict = Depends(require_admin)):
    claim = await db.claims.find_one({"claim_id": claim_id}, {"_id": 0})
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    updated = await _transition_claim(
        claim_id, admin, "rejected", decision.notes,
        "Claim rejected",
        f"Your claim for '{claim['found_item_title']}' was rejected." + (f" Notes: {decision.notes}" if decision.notes else "")
    )
    # If no other active claims, set item back to open
    remaining = await db.claims.count_documents({"found_item_id": claim["found_item_id"], "status": {"$in": ACTIVE_CLAIM_STATUSES}})
    if remaining == 0:
        await db.found_items.update_one({"item_id": claim["found_item_id"]}, {"$set": {"status": "open", "updated_at": utc_now()}})
        await dump_collection(db, "found_items")
    return updated


# ---------- CENTRES ----------
@api.get("/centres", response_model=List[Centre])
async def list_centres(institute: Optional[str] = None, mine: bool = False, user: Optional[dict] = Depends(get_current_user_optional)):
    """Centres list. `institute` filter for nearby matching. `mine=true` for
    admin to see only their own centres."""
    query: dict = {}
    if mine and user and user.get("role") == "admin":
        query["managed_by_admin_id"] = user["user_id"]
    if institute:
        # Case-insensitive partial match so 'IIT' matches 'IIT Bombay' etc.
        query["institute"] = {"$regex": institute, "$options": "i"}
    cursor = db.centres.find(query, {"_id": 0}).sort("created_at", -1)
    return await cursor.to_list(length=200)


@api.post("/centres", response_model=Centre)
async def create_centre(payload: CentreCreate, admin: dict = Depends(require_admin)):
    doc = payload.model_dump()
    doc["centre_id"] = new_id("ctr_")
    doc["managed_by_admin_id"] = admin["user_id"]
    doc["managed_by_admin_name"] = admin.get("name")
    doc["created_at"] = utc_now()
    await db.centres.insert_one(doc)
    await dump_collection(db, "centres")
    return {k: v for k, v in doc.items() if k != "_id"}


@api.put("/centres/{centre_id}", response_model=Centre)
async def update_centre(centre_id: str, payload: CentreCreate, admin: dict = Depends(require_admin)):
    existing = await db.centres.find_one({"centre_id": centre_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Not found")
    # Only the owning admin (or any admin if unowned) can update
    if existing.get("managed_by_admin_id") and existing["managed_by_admin_id"] != admin["user_id"]:
        raise HTTPException(status_code=403, detail="You can only edit centres you manage")
    update_doc = payload.model_dump()
    await db.centres.update_one({"centre_id": centre_id}, {"$set": update_doc})
    await dump_collection(db, "centres")
    item = await db.centres.find_one({"centre_id": centre_id}, {"_id": 0})
    return item


@api.delete("/centres/{centre_id}")
async def delete_centre(centre_id: str, admin: dict = Depends(require_admin)):
    existing = await db.centres.find_one({"centre_id": centre_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Not found")
    if existing.get("managed_by_admin_id") and existing["managed_by_admin_id"] != admin["user_id"]:
        raise HTTPException(status_code=403, detail="You can only delete centres you manage")
    await db.centres.delete_one({"centre_id": centre_id})
    await dump_collection(db, "centres")
    return {"ok": True}


# ---------- NOTIFICATIONS ----------
@api.get("/notifications")
async def my_notifications(user: dict = Depends(get_current_user), limit: int = 50):
    cursor = db.notifications.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).limit(limit)
    items = await cursor.to_list(length=limit)
    unread = await db.notifications.count_documents({"user_id": user["user_id"], "read": False})
    return {"items": items, "unread": unread}


@api.post("/notifications/{notification_id}/read")
async def mark_read(notification_id: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one({"notification_id": notification_id, "user_id": user["user_id"]}, {"$set": {"read": True}})
    await dump_collection(db, "notifications")
    return {"ok": True}


@api.post("/notifications/read-all")
async def mark_all_read(user: dict = Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["user_id"], "read": False}, {"$set": {"read": True}})
    await dump_collection(db, "notifications")
    return {"ok": True}


# ---------- ANALYTICS DASHBOARD ----------
@api.get("/dashboard/analytics")
async def admin_dashboard_analytics(admin: dict = Depends(require_admin)):
    found_total = await db.found_items.count_documents({})
    lost_total = await db.lost_items.count_documents({})
    open_found = await db.found_items.count_documents({"status": "open"})
    pending_claims = await db.claims.count_documents({"status": {"$in": ACTIVE_CLAIM_STATUSES}})
    returned = await db.found_items.count_documents({"status": "returned"})
    centres = await db.centres.count_documents({})
    students = await db.users.count_documents({"role": "student"})

    # Recovery rate
    recovery_rate = round((returned / found_total) * 100, 1) if found_total else 0

    # By category breakdown
    cat_pipeline = [
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 8},
    ]
    by_category = await db.found_items.aggregate(cat_pipeline).to_list(length=20)
    by_category = [{"category": c["_id"] or "Other", "count": c["count"]} for c in by_category]

    # Last 7 day trend
    from datetime import datetime, timedelta
    today = datetime.now(timezone.utc).date()
    days = [today - timedelta(days=i) for i in range(6, -1, -1)]
    trend = []
    for d in days:
        start = datetime(d.year, d.month, d.day, tzinfo=timezone.utc)
        end = start + timedelta(days=1)
        f_count = await db.found_items.count_documents({"created_at": {"$gte": start, "$lt": end}})
        l_count = await db.lost_items.count_documents({"created_at": {"$gte": start, "$lt": end}})
        trend.append({"day": d.strftime("%a"), "found": f_count, "lost": l_count})

    return {
        "totals": {
            "found": found_total,
            "lost": lost_total,
            "open_found": open_found,
            "pending_claims": pending_claims,
            "returned": returned,
            "recovery_rate": recovery_rate,
            "centres": centres,
            "students": students,
        },
        "by_category": by_category,
        "weekly_trend": trend,
    }


# ---------- TOP USERS (Leaderboard) ----------
@api.get("/leaderboard")
async def leaderboard():
    cursor = db.users.find({"role": "student", "points": {"$gt": 0}}, {"_id": 0, "password_hash": 0}).sort("points", -1).limit(10)
    users = await cursor.to_list(length=10)
    return [{"name": u.get("name"), "points": u.get("points", 0), "badges": u.get("badges", []), "picture": u.get("picture")} for u in users]


# ---------- ROOT ----------
@api.get("/")
async def root():
    return {"service": "Smart Lost & Found Ecosystem", "status": "ok"}


@api.get("/health")
async def health():
    try:
        await db.command("ping")
        return {"ok": True}
    except Exception as e:
        return {"ok": False, "error": str(e)}


# ---------- SEED HOOK ----------
@app.on_event("startup")
async def on_startup():
    # Ensure indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.found_items.create_index("item_id", unique=True)
    await db.lost_items.create_index("item_id", unique=True)
    await db.claims.create_index("claim_id", unique=True)
    await db.centres.create_index("centre_id", unique=True)
    await db.notifications.create_index([("user_id", 1), ("created_at", -1)])

    # Seed demo data only if empty
    try:
        from seed_data import seed_if_empty
        await seed_if_empty(db)
    except Exception as e:
        logger.warning(f"Seeding skipped/failed: {e}")

    # Initial JSON mirror dump of all collections
    try:
        await dump_all(db)
    except Exception as e:
        logger.warning(f"Initial JSON mirror failed: {e}")


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origin_regex=os.environ.get("CORS_ORIGIN_REGEX", ".*"),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

"""Smart Lost & Found Ecosystem - FastAPI backend (FINAL CLEAN VERSION)."""

import os
import logging
import asyncio
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Optional

import httpx
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import io

from models import (
    new_id, utc_now,
    User, UserPublic, AdminRegister, AdminLogin, GoogleSessionRequest, ProfileUpdate,
    FoundItemCreate, FoundItem, LostItemCreate, LostItem,
    ClaimCreate, Claim, ClaimDecision,
    CentreCreate, Centre,
    Notification, MatchResult,
)

from auth import (
    hash_password, verify_password, create_admin_token,
    get_current_user, get_current_user_optional, require_admin
)

from qr_utils import build_qr_png
from ai_matcher import ai_match_lost_to_found
from json_mirror import dump_collection, dump_many, dump_all


# ---------- ENV ----------
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ.get("DB_NAME", "lost_found_db")
APP_BASE_URL = os.environ.get("APP_BASE_URL", "")

# 🔥 FIXED: OAuth URL now from ENV (NOT hardcoded)
OAUTH_SESSION_URL = os.environ.get(
    "OAUTH_SESSION_URL",
    "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"
)

JWT_SECRET = os.environ.get("JWT_SECRET", "")

# ---------- APP ----------
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="Smart Lost & Found API")
api = APIRouter(prefix="/api")


# ---------- LOGGING ----------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ---------- ADMIN LOGIN (ONLY ONE, CLEAN) ----------
@api.post("/auth/admin/login")
async def admin_login(payload: AdminLogin):
    user = await db.users.find_one({"email": payload.email.lower(), "role": "admin"})

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_admin_token(user["user_id"], user["email"])

    return {
        "access_token": token,
        "user": {
            "user_id": user["user_id"],
            "email": user["email"],
            "role": user["role"]
        }
    }


# ---------- GOOGLE OAUTH ----------
@api.post("/auth/google/session")
async def google_session(payload: GoogleSessionRequest, response: Response):
    try:
        async with httpx.AsyncClient(timeout=15) as http:
            r = await http.get(
                OAUTH_SESSION_URL,   # 🔥 FIXED HERE
                headers={"X-Session-ID": payload.session_id},
            )

        if r.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")

        data = r.json()

    except Exception as e:
        logger.error(f"OAuth error: {e}")
        raise HTTPException(status_code=500, detail="Auth service error")

    email = (data.get("email") or "").lower()
    name = data.get("name") or email
    picture = data.get("picture")
    session_token = data.get("session_token")

    if not email or not session_token:
        raise HTTPException(status_code=400, detail="Invalid OAuth response")

    existing = await db.users.find_one({"email": email})

    if not existing:
        user_id = new_id("stu_")
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "role": "student",
            "points": 0,
            "badges": [],
            "created_at": utc_now(),
        })
    else:
        user_id = existing["user_id"]

    await db.user_sessions.insert_one({
        "session_token": session_token,
        "user_id": user_id,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
    })

    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 60 * 60,
    )

    return {"ok": True}


# ---------- ROOT ----------
@api.get("/")
async def root():
    return {"status": "Smart Lost & Found API running"}


@api.get("/health")
async def health():
    await db.command("ping")
    return {"ok": True}


# ---------- STARTUP ----------
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.found_items.create_index("item_id", unique=True)
    await db.lost_items.create_index("item_id", unique=True)
    await db.claims.create_index("claim_id", unique=True)
    await db.centres.create_index("centre_id", unique=True)

    try:
        await dump_all(db)
    except Exception as e:
        logger.warning(f"Dump failed: {e}")


app.include_router(api, prefix="/api")


# ---------- CORS (FIXED FOR RENDER + FRONTEND) ----------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://smartlostandfound.onrender.com",
        "https://smart-lost-and-found-1phw.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown():
    client.close()
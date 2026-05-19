"""Pydantic models for Smart Lost & Found Ecosystem."""
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Literal
from datetime import datetime, timezone
import uuid


def new_id(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex[:12]}"


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


# ---------- Auth / User ----------
Role = Literal["student", "admin"]


class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    role: Role = "student"
    password_hash: Optional[str] = None  # only for admins
    points: int = 0
    badges: List[str] = Field(default_factory=list)
    # Profile fields (filled after first login)
    institute: Optional[str] = None
    roll_no: Optional[str] = None      # students; admins can set institute only
    phone: Optional[str] = None
    profile_complete: bool = False
    created_at: datetime = Field(default_factory=utc_now)


class UserPublic(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    role: Role
    points: int = 0
    badges: List[str] = Field(default_factory=list)
    institute: Optional[str] = None
    roll_no: Optional[str] = None
    phone: Optional[str] = None
    profile_complete: bool = False


class AdminRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str


class AdminLogin(BaseModel):
    email: EmailStr
    password: str


class GoogleSessionRequest(BaseModel):
    session_id: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None
    picture: Optional[str] = None
    session_token: Optional[str] = None

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    picture: Optional[str] = None
    institute: Optional[str] = None
    roll_no: Optional[str] = None
    phone: Optional[str] = None


# ---------- Items ----------
ItemStatus = Literal["open", "matched", "claim_pending", "returned", "closed"]
LostStatus = Literal["open", "matched", "claimed", "closed"]


class FoundItemCreate(BaseModel):
    title: str
    description: str
    category: str
    color: Optional[str] = None
    brand: Optional[str] = None
    location_found: str
    building: Optional[str] = None
    date_found: Optional[str] = None  # ISO date string
    submitted_by_name: Optional[str] = None  # who handed in physically (display name)
    submitted_by_roll_no: Optional[str] = None  # student roll no — backend only
    submitted_by_institute: Optional[str] = None  # for badge attribution
    submitted_by_contact: Optional[str] = None
    images: List[str] = Field(default_factory=list)  # base64 or URLs
    centre_id: Optional[str] = None


class FoundItem(BaseModel):
    item_id: str
    title: str
    description: str
    category: str
    color: Optional[str] = None
    brand: Optional[str] = None
    location_found: str
    building: Optional[str] = None
    date_found: Optional[str] = None
    submitted_by_name: Optional[str] = None
    submitted_by_contact: Optional[str] = None
    # NOTE: submitted_by_roll_no & submitted_by_institute exist in DB but are
    # intentionally NOT in the public response model. Admin-only views can read them.
    images: List[str] = Field(default_factory=list)
    centre_id: Optional[str] = None
    qr_payload: Optional[str] = None
    status: ItemStatus = "open"
    posted_by_admin_id: Optional[str] = None
    posted_by_admin_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class FoundItemAdmin(FoundItem):
    """Same as FoundItem but exposes the hidden finder roll_no for admin views."""
    submitted_by_roll_no: Optional[str] = None
    submitted_by_institute: Optional[str] = None


class LostItemCreate(BaseModel):
    title: str
    description: str
    category: str
    color: Optional[str] = None
    brand: Optional[str] = None
    last_seen_location: str
    building: Optional[str] = None
    date_lost: Optional[str] = None
    contact: Optional[str] = None
    images: List[str] = Field(default_factory=list)
    visibility: Literal["public", "institute_only"] = "public"


class LostItem(BaseModel):
    item_id: str
    title: str
    description: str
    category: str
    color: Optional[str] = None
    brand: Optional[str] = None
    last_seen_location: str
    building: Optional[str] = None
    date_lost: Optional[str] = None
    contact: Optional[str] = None
    images: List[str] = Field(default_factory=list)
    visibility: Literal["public", "institute_only"] = "public"
    status: LostStatus = "open"
    reported_by_user_id: str
    reported_by_name: Optional[str] = None
    reported_by_email: Optional[str] = None
    reported_by_institute: Optional[str] = None
    created_at: datetime = Field(default_factory=utc_now)


# ---------- Claims ----------
# 5-stage success flow + 2 side states
ClaimStatus = Literal[
    "submitted",            # student just filed (replaces 'pending')
    "verifying",            # admin started checking
    "more_proof_requested", # side branch
    "approved",             # admin approved proof
    "ready_for_pickup",     # item physically prepared at the centre
    "closed",               # collected by owner / closed by admin
    "rejected",             # side branch
]


class ClaimCreate(BaseModel):
    found_item_id: str
    ownership_proof: str  # description text
    proof_images: List[str] = Field(default_factory=list)
    contact: Optional[str] = None


class ClaimTimelineEntry(BaseModel):
    status: ClaimStatus
    at: datetime
    by_user_id: Optional[str] = None
    by_name: Optional[str] = None
    notes: Optional[str] = None


class Claim(BaseModel):
    claim_id: str
    found_item_id: str
    found_item_title: Optional[str] = None
    claimant_user_id: str
    claimant_name: Optional[str] = None
    claimant_email: Optional[str] = None
    claimant_roll_no: Optional[str] = None
    claimant_institute: Optional[str] = None
    ownership_proof: str
    proof_images: List[str] = Field(default_factory=list)
    contact: Optional[str] = None
    status: ClaimStatus = "submitted"
    admin_notes: Optional[str] = None
    decided_by_admin_id: Optional[str] = None
    decided_at: Optional[datetime] = None
    timeline: List[ClaimTimelineEntry] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=utc_now)


class ClaimDecision(BaseModel):
    notes: Optional[str] = None


# ---------- Centres ----------
class CentreCreate(BaseModel):
    name: str
    description: Optional[str] = None
    location: str
    building: Optional[str] = None
    institute: Optional[str] = None     # NEW — used for nearby matching
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    hours: Optional[str] = None
    image: Optional[str] = None
    is_open: bool = True  # NEW — centre open/closed status


class Centre(BaseModel):
    centre_id: str
    name: str
    description: Optional[str] = None
    location: str
    building: Optional[str] = None
    institute: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    hours: Optional[str] = None
    image: Optional[str] = None
    is_open: bool = True  # NEW — centre open/closed status
    managed_by_admin_id: Optional[str] = None
    managed_by_admin_name: Optional[str] = None
    created_at: datetime = Field(default_factory=utc_now)


# ---------- Notifications ----------
NotificationType = Literal["match", "claim_update", "lost_alert", "system", "reward"]


class Notification(BaseModel):
    notification_id: str
    user_id: str
    type: NotificationType
    title: str
    body: str
    link: Optional[str] = None
    read: bool = False
    created_at: datetime = Field(default_factory=utc_now)


# ---------- AI Matching ----------
class MatchResult(BaseModel):
    found_item_id: str
    title: str
    similarity: int  # 0-100
    reasoning: str
    image: Optional[str] = None
    category: str
    location_found: str
    date_found: Optional[str] = None

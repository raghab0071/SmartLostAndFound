"""Auth utilities for JWT (admins) and Google OAuth session (students)."""
import os
from datetime import datetime, timedelta, timezone
from typing import Optional
import jwt
from passlib.context import CryptContext
from fastapi import Request, HTTPException, status, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

JWT_SECRET = os.environ.get("JWT_SECRET", "changeme")
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
JWT_EXPIRES_MIN = int(os.environ.get("JWT_EXPIRES_MIN", "10080"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    try:
        return pwd_context.verify(password, hashed)
    except Exception:
        return False


def create_admin_token(admin_id: str, email: str) -> str:
    payload = {
        "sub": admin_id,
        "email": email,
        "role": "admin",
        "type": "jwt",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRES_MIN),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_jwt(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except Exception:
        return None


def _bearer_token(request: Request) -> Optional[str]:
    auth_header = request.headers.get("authorization") or request.headers.get("Authorization")
    if not auth_header:
        return None
    parts = auth_header.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return None


async def _get_user_by_jwt_token(token: str, db) -> Optional[dict]:
    """Try to decode token as JWT admin first."""
    payload = decode_jwt(token)
    if payload and payload.get("role") == "admin":
        user = await db.users.find_one({"user_id": payload.get("sub")}, {"_id": 0, "password_hash": 0})
        return user
    return None


async def _get_user_by_session_token(token: str, db) -> Optional[dict]:
    """Look up a student session by session_token."""
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        return None
    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at and expires_at < datetime.now(timezone.utc):
        return None
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0, "password_hash": 0})
    return user


async def get_current_user_optional(request: Request) -> Optional[dict]:
    from server import db  # late import to avoid circular
    # 1. Try session_token cookie
    token = request.cookies.get("session_token")
    if token:
        user = await _get_user_by_session_token(token, db)
        if user:
            return user
    # 2. Try bearer token (JWT for admins, or session_token)
    bearer = _bearer_token(request)
    if bearer:
        user = await _get_user_by_jwt_token(bearer, db)
        if user:
            return user
        user = await _get_user_by_session_token(bearer, db)
        if user:
            return user
    return None


async def get_current_user(request: Request) -> dict:
    user = await get_current_user_optional(request)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return user


async def require_admin(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return user


async def require_student(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Student access only")
    return user

"""Shared fixtures for backend API tests."""
import os
import time
import subprocess
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://campus-recovery-14.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@campus.edu"
ADMIN_PASSWORD = "Admin@123"


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def api_url():
    return API


@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


def _mk_session(email: str) -> str:
    """Create a session_token in mongosh for the given seeded student."""
    label = email.split("@")[0].replace(".", "_")
    token = f"test_session_{label}_{int(time.time()*1000)}"
    script = f"""
use('lost_found_db');
var u = db.users.findOne({{email: '{email}'}});
if (u) {{
  db.user_sessions.insertOne({{user_id: u.user_id, session_token: '{token}',
    expires_at: new Date(Date.now()+7*86400000), created_at: new Date()}});
  print('OK|' + u.user_id);
}} else {{ print('MISSING'); }}
"""
    res = subprocess.run(["mongosh", "--quiet", "--eval", script], capture_output=True, text=True, timeout=20)
    out = (res.stdout or "").strip()
    assert "OK|" in out, f"Could not create session for {email}: {out} {res.stderr}"
    user_id = out.split("OK|")[-1].strip().splitlines()[0]
    return token, user_id


@pytest.fixture(scope="session")
def alice_session():
    return _mk_session("alice.student@campus.edu")


@pytest.fixture(scope="session")
def bob_session():
    return _mk_session("bob.student@campus.edu")


@pytest.fixture(scope="session")
def alice_headers(alice_session):
    return {"Authorization": f"Bearer {alice_session[0]}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def bob_headers(bob_session):
    return {"Authorization": f"Bearer {bob_session[0]}", "Content-Type": "application/json"}

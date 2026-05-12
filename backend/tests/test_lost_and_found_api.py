"""End-to-end backend API tests for Smart Lost & Found Ecosystem."""
import time
import requests
import pytest

API = None  # populated in fixture below


@pytest.fixture(scope="module", autouse=True)
def _set_api(api_url):
    global API
    API = api_url


# ---------- Health & basics ----------
class TestHealth:
    def test_health(self):
        r = requests.get(f"{API}/health", timeout=10)
        assert r.status_code == 200
        body = r.json()
        assert body.get("ok") is True


# ---------- Auth ----------
class TestAuth:
    def test_admin_login_success(self):
        r = requests.post(f"{API}/auth/admin/login",
                          json={"email": "admin@campus.edu", "password": "Admin@123"})
        assert r.status_code == 200
        d = r.json()
        assert "access_token" in d and isinstance(d["access_token"], str)
        assert d["token_type"] == "bearer"
        assert d["user"]["role"] == "admin"
        assert d["user"]["email"] == "admin@campus.edu"

    def test_admin_login_wrong_password(self):
        r = requests.post(f"{API}/auth/admin/login",
                          json={"email": "admin@campus.edu", "password": "wrong"})
        assert r.status_code == 401

    def test_admin_login_unknown_user(self):
        r = requests.post(f"{API}/auth/admin/login",
                          json={"email": "nobody@campus.edu", "password": "whatever"})
        assert r.status_code == 401

    def test_me_admin(self, admin_headers):
        r = requests.get(f"{API}/auth/me", headers=admin_headers)
        assert r.status_code == 200
        u = r.json()["user"]
        assert u["role"] == "admin"
        assert u["email"] == "admin@campus.edu"

    def test_me_no_auth(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_me_student(self, alice_headers, alice_session):
        r = requests.get(f"{API}/auth/me", headers=alice_headers)
        assert r.status_code == 200
        u = r.json()["user"]
        assert u["role"] == "student"
        assert u["user_id"] == alice_session[1]

    def test_logout(self):
        # Make ad-hoc session, then logout it via header
        from conftest import _mk_session
        tok, _uid = _mk_session("priya.student@campus.edu")
        h = {"Authorization": f"Bearer {tok}"}
        r1 = requests.get(f"{API}/auth/me", headers=h)
        assert r1.status_code == 200
        r2 = requests.post(f"{API}/auth/logout", headers=h)
        assert r2.status_code == 200
        assert r2.json().get("ok") is True
        # Now session should be invalid
        r3 = requests.get(f"{API}/auth/me", headers=h)
        assert r3.status_code == 401


# ---------- Found Items ----------
class TestFoundItems:
    def test_recent_found_at_least_8(self):
        r = requests.get(f"{API}/items/found/recent")
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        assert len(items) >= 8
        # No mongo _id leak
        for it in items:
            assert "_id" not in it
            assert "item_id" in it

    def test_found_list_filters(self):
        # No filter
        r = requests.get(f"{API}/items/found", params={"limit": 50})
        assert r.status_code == 200
        all_items = r.json()
        assert len(all_items) >= 8

        # Filter by category - use category from existing item
        cats = [i["category"] for i in all_items if i.get("category")]
        if cats:
            cat = cats[0]
            r2 = requests.get(f"{API}/items/found", params={"category": cat})
            assert r2.status_code == 200
            for it in r2.json():
                assert it["category"].lower() == cat.lower()

        # Status filter
        r3 = requests.get(f"{API}/items/found", params={"status": "open"})
        assert r3.status_code == 200
        for it in r3.json():
            assert it["status"] == "open"

        # q text search - use a token from an existing title
        if all_items:
            token = all_items[0]["title"].split()[0]
            r4 = requests.get(f"{API}/items/found", params={"q": token})
            assert r4.status_code == 200

    def test_get_found_by_id_and_404(self):
        r = requests.get(f"{API}/items/found/recent")
        item_id = r.json()[0]["item_id"]
        r2 = requests.get(f"{API}/items/found/{item_id}")
        assert r2.status_code == 200
        assert r2.json()["item_id"] == item_id

        r3 = requests.get(f"{API}/items/found/does_not_exist_xyz")
        assert r3.status_code == 404

    def test_found_qr_png(self):
        r = requests.get(f"{API}/items/found/recent")
        item_id = r.json()[0]["item_id"]
        r2 = requests.get(f"{API}/items/found/{item_id}/qr")
        assert r2.status_code == 200
        assert r2.headers.get("content-type", "").startswith("image/png")
        assert r2.content[:8] == b"\x89PNG\r\n\x1a\n"

    def test_create_found_requires_admin(self, alice_headers):
        payload = {
            "title": "TEST_Unauthorized Found",
            "description": "should fail",
            "category": "Bag",
            "location_found": "X",
        }
        # No auth
        r = requests.post(f"{API}/items/found", json=payload)
        assert r.status_code in (401, 403)
        # Student auth
        r2 = requests.post(f"{API}/items/found", json=payload, headers=alice_headers)
        assert r2.status_code == 403

    def test_admin_create_update_delete_found(self, admin_headers):
        payload = {
            "title": "TEST_Black Umbrella",
            "description": "Found near library",
            "category": "Accessory",
            "color": "black",
            "location_found": "Library",
            "building": "Main Library",
            "date_found": "2025-12-30",
        }
        r = requests.post(f"{API}/items/found", json=payload, headers=admin_headers)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["item_id"].startswith("fnd_")
        assert d["status"] == "open"
        assert d["posted_by_admin_id"]
        assert d["qr_payload"]
        item_id = d["item_id"]

        # Verify GET persists
        g = requests.get(f"{API}/items/found/{item_id}")
        assert g.status_code == 200
        assert g.json()["title"] == payload["title"]

        # Update
        payload["title"] = "TEST_Black Umbrella Updated"
        u = requests.put(f"{API}/items/found/{item_id}", json=payload, headers=admin_headers)
        assert u.status_code == 200
        assert u.json()["title"] == "TEST_Black Umbrella Updated"

        # Delete
        d2 = requests.delete(f"{API}/items/found/{item_id}", headers=admin_headers)
        assert d2.status_code == 200
        g2 = requests.get(f"{API}/items/found/{item_id}")
        assert g2.status_code == 404


# ---------- Lost Items ----------
class TestLostItems:
    def test_student_create_lost(self, alice_headers, alice_session):
        payload = {
            "title": "TEST_Lost Blue Backpack",
            "description": "Forgot in cafeteria",
            "category": "Bag",
            "color": "blue",
            "brand": "Wildcraft",
            "last_seen_location": "Cafeteria",
            "building": "Block A",
            "date_lost": "2025-12-29",
        }
        r = requests.post(f"{API}/items/lost", json=payload, headers=alice_headers)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["item_id"].startswith("lst_")
        assert d["reported_by_user_id"] == alice_session[1]
        assert d["status"] == "open"
        pytest.lost_alice_id = d["item_id"]

    def test_admin_can_also_create_lost(self, admin_headers):
        payload = {
            "title": "TEST_Admin Lost Test",
            "description": "admin testing",
            "category": "Other",
            "last_seen_location": "Office",
        }
        r = requests.post(f"{API}/items/lost", json=payload, headers=admin_headers)
        # Admin should be allowed (uses get_current_user)
        assert r.status_code == 200, r.text

    def test_student_sees_only_own_lost(self, alice_headers, bob_headers, alice_session, bob_session):
        # Bob creates a lost item
        bob_payload = {"title": "TEST_Bob Lost Phone", "description": "lost", "category": "Electronics", "last_seen_location": "Gym"}
        r = requests.post(f"{API}/items/lost", json=bob_payload, headers=bob_headers)
        assert r.status_code == 200
        bob_lost_id = r.json()["item_id"]

        # Alice should not see Bob's
        ra = requests.get(f"{API}/items/lost", headers=alice_headers)
        assert ra.status_code == 200
        ids_a = [i["item_id"] for i in ra.json()]
        assert bob_lost_id not in ids_a
        for it in ra.json():
            assert it["reported_by_user_id"] == alice_session[1]

        # Bob sees his own
        rb = requests.get(f"{API}/items/lost", headers=bob_headers)
        assert rb.status_code == 200
        ids_b = [i["item_id"] for i in rb.json()]
        assert bob_lost_id in ids_b

    def test_admin_sees_all_lost(self, admin_headers):
        r = requests.get(f"{API}/items/lost", headers=admin_headers)
        assert r.status_code == 200
        # Should be more than what a single student sees
        assert len(r.json()) >= 2

    def test_public_lost_alerts(self):
        r = requests.get(f"{API}/items/lost/alerts/recent")
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        # contact field should be stripped
        for it in items:
            assert "contact" not in it or it.get("contact") is None
            assert "_id" not in it

    def test_get_lost_owner_vs_other_student(self, alice_headers, bob_headers):
        lid = getattr(pytest, "lost_alice_id", None)
        assert lid, "Alice lost id not set"
        # Owner can fetch
        r1 = requests.get(f"{API}/items/lost/{lid}", headers=alice_headers)
        assert r1.status_code == 200
        # Different student forbidden
        r2 = requests.get(f"{API}/items/lost/{lid}", headers=bob_headers)
        assert r2.status_code == 403


# ---------- AI Matching ----------
class TestAIMatching:
    def test_get_matches_for_lost(self, alice_headers):
        lid = getattr(pytest, "lost_alice_id", None)
        assert lid
        # Give the auto-match background task a moment
        time.sleep(2)
        r = requests.get(f"{API}/ai/match/{lid}", headers=alice_headers, timeout=60)
        assert r.status_code == 200, r.text
        matches = r.json()
        assert isinstance(matches, list)
        if matches:
            m = matches[0]
            assert "similarity" in m
            assert "reasoning" in m
            assert "found_item_id" in m
            assert isinstance(m["similarity"], int)

    def test_refresh_matches(self, alice_headers):
        lid = getattr(pytest, "lost_alice_id", None)
        assert lid
        r = requests.post(f"{API}/ai/match/{lid}/refresh", headers=alice_headers, timeout=60)
        assert r.status_code == 200, r.text
        assert isinstance(r.json(), list)


# ---------- Claims ----------
class TestClaims:
    def test_create_approve_flow(self, alice_headers, admin_headers, alice_session):
        # Pick an open found item
        rl = requests.get(f"{API}/items/found", params={"status": "open"})
        open_items = rl.json()
        assert open_items, "No open found items to claim"
        target = open_items[0]
        fid = target["item_id"]

        payload = {"found_item_id": fid, "ownership_proof": "I bought it last year, serial 12345"}
        r = requests.post(f"{API}/claims", json=payload, headers=alice_headers)
        assert r.status_code == 200, r.text
        claim = r.json()
        assert claim["status"] == "pending"
        assert claim["claimant_user_id"] == alice_session[1]
        pytest.claim_id = claim["claim_id"]
        pytest.claim_found_id = fid

        # Verify item status now claim_pending
        gi = requests.get(f"{API}/items/found/{fid}")
        assert gi.json()["status"] == "claim_pending"

        # Duplicate claim by same user -> 400
        r2 = requests.post(f"{API}/claims", json=payload, headers=alice_headers)
        assert r2.status_code == 400

        # Student list claims = own only
        rs = requests.get(f"{API}/claims", headers=alice_headers)
        assert rs.status_code == 200
        for c in rs.json():
            assert c["claimant_user_id"] == alice_session[1]

        # Admin list = all
        ra = requests.get(f"{API}/claims", headers=admin_headers)
        assert ra.status_code == 200
        ids = [c["claim_id"] for c in ra.json()]
        assert pytest.claim_id in ids

        # Approve
        ap = requests.post(f"{API}/claims/{pytest.claim_id}/approve",
                           json={"notes": "verified"}, headers=admin_headers)
        assert ap.status_code == 200, ap.text
        assert ap.json()["status"] == "approved"

        # Item became returned
        gi2 = requests.get(f"{API}/items/found/{fid}")
        assert gi2.json()["status"] == "returned"

        # Alice got points + badge
        me = requests.get(f"{API}/auth/me", headers=alice_headers).json()["user"]
        assert me["points"] >= 50
        assert "Reunited" in me["badges"]

    def test_reject_and_request_proof_flow(self, bob_headers, admin_headers):
        # Find an open item not yet returned
        items = requests.get(f"{API}/items/found", params={"status": "open"}).json()
        assert items
        fid = items[0]["item_id"]
        r = requests.post(f"{API}/claims", json={"found_item_id": fid, "ownership_proof": "mine"}, headers=bob_headers)
        assert r.status_code == 200, r.text
        cid = r.json()["claim_id"]

        # Request more proof
        rp = requests.post(f"{API}/claims/{cid}/request-proof",
                           json={"notes": "send photo"}, headers=admin_headers)
        assert rp.status_code == 200
        assert rp.json()["status"] == "more_proof_requested"

        # Reject
        rj = requests.post(f"{API}/claims/{cid}/reject",
                           json={"notes": "insufficient"}, headers=admin_headers)
        assert rj.status_code == 200
        assert rj.json()["status"] == "rejected"

        # Item back to open (no other pending claims)
        gi = requests.get(f"{API}/items/found/{fid}")
        assert gi.json()["status"] == "open"


# ---------- Centres ----------
class TestCentres:
    def test_list_seeded(self):
        r = requests.get(f"{API}/centres")
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 3
        for c in items:
            assert "_id" not in c
            assert "centre_id" in c

    def test_centre_crud_admin(self, admin_headers):
        payload = {"name": "TEST_Centre", "location": "X1", "description": "test"}
        r = requests.post(f"{API}/centres", json=payload, headers=admin_headers)
        assert r.status_code == 200
        cid = r.json()["centre_id"]

        payload["name"] = "TEST_Centre Updated"
        u = requests.put(f"{API}/centres/{cid}", json=payload, headers=admin_headers)
        assert u.status_code == 200
        assert u.json()["name"] == "TEST_Centre Updated"

        d = requests.delete(f"{API}/centres/{cid}", headers=admin_headers)
        assert d.status_code == 200

    def test_centre_write_forbidden_no_auth(self, alice_headers):
        payload = {"name": "TEST_x", "location": "X"}
        r = requests.post(f"{API}/centres", json=payload)
        assert r.status_code in (401, 403)
        r2 = requests.post(f"{API}/centres", json=payload, headers=alice_headers)
        assert r2.status_code == 403


# ---------- Notifications ----------
class TestNotifications:
    def test_admin_notifications_and_mark(self, admin_headers):
        r = requests.get(f"{API}/notifications", headers=admin_headers)
        assert r.status_code == 200
        d = r.json()
        assert "items" in d and "unread" in d
        items = d["items"]
        if items:
            nid = items[0]["notification_id"]
            r2 = requests.post(f"{API}/notifications/{nid}/read", headers=admin_headers)
            assert r2.status_code == 200

        r3 = requests.post(f"{API}/notifications/read-all", headers=admin_headers)
        assert r3.status_code == 200
        # Now unread should be 0
        r4 = requests.get(f"{API}/notifications", headers=admin_headers)
        assert r4.json()["unread"] == 0

    def test_student_notifications(self, alice_headers):
        r = requests.get(f"{API}/notifications", headers=alice_headers)
        assert r.status_code == 200
        assert "items" in r.json()


# ---------- Analytics ----------
class TestAnalytics:
    def test_admin_analytics(self, admin_headers):
        r = requests.get(f"{API}/dashboard/analytics", headers=admin_headers)
        assert r.status_code == 200
        d = r.json()
        for k in ("totals", "by_category", "weekly_trend"):
            assert k in d
        t = d["totals"]
        for k in ("found", "lost", "recovery_rate", "centres", "students"):
            assert k in t
        assert isinstance(d["weekly_trend"], list)
        assert len(d["weekly_trend"]) == 7

    def test_analytics_requires_admin(self, alice_headers):
        r = requests.get(f"{API}/dashboard/analytics")
        assert r.status_code in (401, 403)
        r2 = requests.get(f"{API}/dashboard/analytics", headers=alice_headers)
        assert r2.status_code == 403


# ---------- Leaderboard ----------
class TestLeaderboard:
    def test_leaderboard(self):
        r = requests.get(f"{API}/leaderboard")
        assert r.status_code == 200
        users = r.json()
        assert isinstance(users, list)
        assert len(users) >= 1
        # Sorted desc
        pts = [u["points"] for u in users]
        assert pts == sorted(pts, reverse=True)
        for u in users:
            assert u["points"] > 0
            assert "name" in u

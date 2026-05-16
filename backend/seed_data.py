"""Seed demo data on first start — gated by SEED_DEMO env flag."""
import os
from datetime import datetime, timedelta, timezone
from models import new_id, utc_now
from auth import hash_password


DEMO_ADMIN_EMAIL = "admin@campus.edu"
DEMO_ADMIN_PASSWORD = "Admin@123"


# Unsplash royalty-free image URLs (no auth needed)
DEMO_IMAGES = {
    "wallet":   "https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&q=80",
    "phone":    "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800&q=80",
    "keys":     "https://images.unsplash.com/photo-1582539510884-9aef5bbe7281?w=800&q=80",
    "backpack": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80",
    "laptop":   "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80",
    "earbuds":  "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=800&q=80",
    "watch":    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80",
    "umbrella": "https://images.unsplash.com/photo-1488229297570-58520851e868?w=800&q=80",
    "glasses":  "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&q=80",
    "bottle":   "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&q=80",
    "calculator": "https://images.unsplash.com/photo-1564939558297-fc396f18e5c7?w=800&q=80",
    "idcard":   "https://images.unsplash.com/photo-1606027030480-3cf4b9d33ab2?w=800&q=80",
    "centre1":  "https://images.unsplash.com/photo-1562774053-701939374585?w=800&q=80",
    "centre2":  "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80",
    "centre3":  "https://images.unsplash.com/photo-1568871391466-d9ff4e1aa2bf?w=800&q=80",
}


async def seed_if_empty(db):
    """Seed demo content only when SEED_DEMO env var is true. Ensures the demo
    admin user exists either way so the canonical login keeps working."""
    flag = (os.environ.get("SEED_DEMO") or "").strip().lower() in ("1", "true", "yes", "on")

    # Always ensure the demo admin exists (so admin@campus.edu/Admin@123 logs in)
    has_demo_admin = await db.users.find_one({"email": DEMO_ADMIN_EMAIL})
    if not has_demo_admin:
        await db.users.insert_one({
            "user_id": new_id("adm_"),
            "email": DEMO_ADMIN_EMAIL,
            "name": "Campus Admin",
            "picture": None,
            "role": "admin",
            "password_hash": hash_password(DEMO_ADMIN_PASSWORD),
            "points": 0,
            "badges": [],
            "institute": "Demo Institute",
            "profile_complete": True,
            "created_at": utc_now(),
        })

    if not flag:
        return  # don't seed content unless explicitly enabled

    # Only seed content if there are no found items yet
    if await db.found_items.find_one({}) is not None:
        return

    now = utc_now()

    # Admin (reuse existing)
    admin_doc = await db.users.find_one({"email": DEMO_ADMIN_EMAIL})
    admin_id = admin_doc["user_id"]

    # Demo students
    student_alice = new_id("stu_")
    student_bob = new_id("stu_")
    student_priya = new_id("stu_")
    await db.users.insert_many([
        {"user_id": student_alice, "email": "alice.student@campus.edu", "name": "Alice Johnson",
         "picture": "https://i.pravatar.cc/150?img=47", "role": "student", "points": 120,
         "badges": ["Trusted Finder", "Campus Hero"], "institute": "Demo Institute", "roll_no": "A001", "created_at": now},
        {"user_id": student_bob, "email": "bob.student@campus.edu", "name": "Bob Martinez",
         "picture": "https://i.pravatar.cc/150?img=12", "role": "student", "points": 80,
         "badges": ["Reunited"], "institute": "Demo Institute", "roll_no": "B002", "created_at": now},
        {"user_id": student_priya, "email": "priya.student@campus.edu", "name": "Priya Iyer",
         "picture": "https://i.pravatar.cc/150?img=32", "role": "student", "points": 50,
         "badges": [], "institute": "Demo Institute", "roll_no": "P003", "created_at": now},
    ])

    # Centres - all managed by the demo admin
    centres = [
        {"centre_id": new_id("ctr_"), "name": "Main Library Lost & Found",
         "description": "Located on the ground floor near the entrance. Handles items found inside the library.",
         "location": "Block A, Main Library, Ground Floor", "building": "Main Library",
         "contact_phone": "+91 80 1234 5601", "contact_email": "library.lf@campus.edu",
         "hours": "Mon–Sat · 9:00 AM – 6:00 PM", "image": DEMO_IMAGES["centre1"],
         "institute": "Demo Institute", "managed_by_admin_id": admin_id, "created_at": now},
        {"centre_id": new_id("ctr_"), "name": "Student Centre Help Desk",
         "description": "Central student hub. Drop-off and pick-up of all lost & found items.",
         "location": "Student Activity Centre, Room 102", "building": "Student Centre",
         "contact_phone": "+91 80 1234 5602", "contact_email": "studentcentre@campus.edu",
         "hours": "Mon–Fri · 8:30 AM – 7:00 PM", "image": DEMO_IMAGES["centre2"],
         "institute": "Demo Institute", "managed_by_admin_id": admin_id, "created_at": now},
        {"centre_id": new_id("ctr_"), "name": "Sports Complex Reception",
         "description": "Handles items found in gyms, pools, and sports fields.",
         "location": "Sports Complex, Reception", "building": "Sports Complex",
         "contact_phone": "+91 80 1234 5603", "contact_email": "sports.lf@campus.edu",
         "hours": "Daily · 6:00 AM – 9:00 PM", "image": DEMO_IMAGES["centre3"],
         "institute": "Demo Institute", "managed_by_admin_id": admin_id, "created_at": now},
    ]
    await db.centres.insert_many(centres)
    centre_ids = [c["centre_id"] for c in centres]

    base_url = "https://7ea909e4-67f9-4e1f-9c5a-806c8f0fe03a.preview.emergentagent.com"

    # Found items
    found_items = [
        {
            "title": "Black Leather Wallet", "description": "Black bifold leather wallet with a student ID inside (name not visible).",
            "category": "Wallet", "color": "Black", "brand": "Tommy Hilfiger",
            "location_found": "Cafeteria, near the cashier", "building": "Main Library", "date_found": (now - timedelta(days=1)).date().isoformat(),
            "submitted_by_name": "Cafeteria Staff", "images": [DEMO_IMAGES["wallet"]], "centre_id": centre_ids[0],
        },
        {
            "title": "iPhone 14 (Blue)", "description": "Blue iPhone 14 with a clear case. Cracked top-left corner.",
            "category": "Phone", "color": "Blue", "brand": "Apple",
            "location_found": "Library 2nd floor reading area", "building": "Main Library", "date_found": (now - timedelta(days=2)).date().isoformat(),
            "submitted_by_name": "Alice Johnson", "images": [DEMO_IMAGES["phone"]], "centre_id": centre_ids[0],
        },
        {
            "title": "Bunch of Keys with Car Remote", "description": "Three keys on a black carabiner with a Maruti car remote.",
            "category": "Keys", "color": "Silver", "brand": None,
            "location_found": "Parking Lot B", "building": "Parking Lot B", "date_found": (now - timedelta(days=3)).date().isoformat(),
            "submitted_by_name": "Security", "images": [DEMO_IMAGES["keys"]], "centre_id": centre_ids[1],
        },
        {
            "title": "Black Adidas Backpack", "description": "Adidas backpack with a notebook and two textbooks inside.",
            "category": "Bag", "color": "Black", "brand": "Adidas",
            "location_found": "Lecture Hall 3", "building": "Academic Block", "date_found": (now - timedelta(days=1)).date().isoformat(),
            "submitted_by_name": "Prof. Sharma", "images": [DEMO_IMAGES["backpack"]], "centre_id": centre_ids[1],
        },
        {
            "title": "MacBook Air Charger", "description": "USB-C MagSafe charger for MacBook Air. White color.",
            "category": "Electronics", "color": "White", "brand": "Apple",
            "location_found": "Computer Lab 2", "building": "CS Department", "date_found": (now - timedelta(days=4)).date().isoformat(),
            "submitted_by_name": "Lab Assistant", "images": [DEMO_IMAGES["laptop"]], "centre_id": centre_ids[1],
        },
        {
            "title": "Sony WF-1000XM4 Earbuds (Case)", "description": "Black charging case for Sony noise-cancelling earbuds. Earbuds inside.",
            "category": "Electronics", "color": "Black", "brand": "Sony",
            "location_found": "Auditorium foyer", "building": "Auditorium", "date_found": (now - timedelta(days=2)).date().isoformat(),
            "submitted_by_name": "Event Staff", "images": [DEMO_IMAGES["earbuds"]], "centre_id": centre_ids[1],
        },
        {
            "title": "Silver Casio Watch", "description": "Silver-tone metal Casio digital watch.",
            "category": "Watch", "color": "Silver", "brand": "Casio",
            "location_found": "Gym locker room", "building": "Sports Complex", "date_found": (now - timedelta(days=5)).date().isoformat(),
            "submitted_by_name": "Gym Trainer", "images": [DEMO_IMAGES["watch"]], "centre_id": centre_ids[2],
        },
        {
            "title": "Black Folding Umbrella", "description": "Compact black folding umbrella with a wooden handle.",
            "category": "Umbrella", "color": "Black", "brand": None,
            "location_found": "Bus Stand near Gate 2", "building": "Main Gate", "date_found": (now - timedelta(days=1)).date().isoformat(),
            "submitted_by_name": "Bus Driver", "images": [DEMO_IMAGES["umbrella"]], "centre_id": centre_ids[1],
        },
        {
            "title": "Tortoise-Shell Reading Glasses", "description": "Round tortoise-shell reading glasses in a brown case.",
            "category": "Eyewear", "color": "Brown", "brand": "Ray-Ban",
            "location_found": "Library reading desk", "building": "Main Library", "date_found": (now - timedelta(days=2)).date().isoformat(),
            "submitted_by_name": "Library Staff", "images": [DEMO_IMAGES["glasses"]], "centre_id": centre_ids[0],
        },
        {
            "title": "Hydroflask Water Bottle (Teal)", "description": "Teal-colored 32 oz Hydroflask with a sticker of a mountain.",
            "category": "Bottle", "color": "Teal", "brand": "Hydroflask",
            "location_found": "Football Field bench", "building": "Sports Complex", "date_found": (now - timedelta(days=3)).date().isoformat(),
            "submitted_by_name": "Coach Rao", "images": [DEMO_IMAGES["bottle"]], "centre_id": centre_ids[2],
        },
    ]
    found_docs = []
    for it in found_items:
        iid = new_id("fnd_")
        doc = {
            **it,
            "item_id": iid,
            "qr_payload": f"{base_url}/items/{iid}",
            "status": "open",
            "posted_by_admin_id": admin_id,
            "posted_by_admin_name": "Campus Admin",
            "submitted_by_contact": None,
            "created_at": now - timedelta(hours=12),
            "updated_at": now - timedelta(hours=12),
        }
        found_docs.append(doc)
    await db.found_items.insert_many(found_docs)

    # Lost items (live alerts)
    lost_items = [
        {
            "item_id": new_id("lst_"),
            "title": "Lost black wallet",
            "description": "Black leather wallet, has my student ID. Last seen during lunch in the cafeteria.",
            "category": "Wallet", "color": "Black", "brand": "Tommy Hilfiger",
            "last_seen_location": "Main Cafeteria", "building": "Main Library",
            "date_lost": (now - timedelta(days=1)).date().isoformat(),
            "contact": "+91 98xxxxxxxx",
            "images": [],
            "status": "open",
            "visibility": "institute_only",
            "reported_by_user_id": student_alice,
            "reported_by_name": "Alice Johnson",
            "reported_by_email": "alice.student@campus.edu",
            "reported_by_institute": "Demo Institute",
            "created_at": now - timedelta(hours=6),
        },
        {
            "item_id": new_id("lst_"),
            "title": "Blue iPhone missing",
            "description": "Blue iPhone 14 in a clear case. Misplaced while studying.",
            "category": "Phone", "color": "Blue", "brand": "Apple",
            "last_seen_location": "Library 2nd floor", "building": "Main Library",
            "date_lost": (now - timedelta(days=2)).date().isoformat(),
            "contact": "+91 97xxxxxxxx",
            "images": [],
            "status": "open",
            "visibility": "institute_only",
            "reported_by_user_id": student_bob,
            "reported_by_name": "Bob Martinez",
            "reported_by_email": "bob.student@campus.edu",
            "reported_by_institute": "Demo Institute",
            "created_at": now - timedelta(hours=10),
        },
        {
            "item_id": new_id("lst_"),
            "title": "Lost Casio watch",
            "description": "Silver Casio watch slipped off after gym session.",
            "category": "Watch", "color": "Silver", "brand": "Casio",
            "last_seen_location": "Gym locker room", "building": "Sports Complex",
            "date_lost": (now - timedelta(days=5)).date().isoformat(),
            "contact": "+91 99xxxxxxxx",
            "images": [],
            "status": "open",
            "visibility": "institute_only",
            "reported_by_user_id": student_priya,
            "reported_by_name": "Priya Iyer",
            "reported_by_email": "priya.student@campus.edu",
            "reported_by_institute": "Demo Institute",
            "created_at": now - timedelta(hours=24),
        },
    ]
    await db.lost_items.insert_many(lost_items)

    # Sample notification for admin
    await db.notifications.insert_many([
        {"notification_id": new_id("ntf_"), "user_id": admin_id, "type": "system",
         "title": "Welcome, Admin!", "body": "Your demo data has been seeded. Visit your dashboard.",
         "link": "/admin", "read": False, "created_at": now},
        {"notification_id": new_id("ntf_"), "user_id": admin_id, "type": "lost_alert",
         "title": "3 active lost reports", "body": "Students reported 3 lost items in the last 24 hours.",
         "link": "/admin/lost", "read": False, "created_at": now},
    ])

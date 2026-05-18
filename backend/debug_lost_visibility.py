"""Debug script to test lost item visibility logic."""
import json
from pymongo import MongoClient
from datetime import datetime, timezone

# MongoDB connection
MONGO_URL = "mongodb://localhost:27017"
client = MongoClient(MONGO_URL)
db = client["smart_lost_found"]

def utc_now():
    return datetime.now(timezone.utc)

def new_id(prefix=""):
    import uuid
    return f"{prefix}{uuid.uuid4().hex[:12]}"

print("\n" + "="*80)
print("DEBUG: LOST ITEM VISIBILITY")
print("="*80)

# Clean up test data
print("\n[1] Cleaning up old test data...")
db.users.delete_many({"email": {"$regex": "test_"}})
db.lost_items.delete_many({"title": {"$regex": "TEST_"}})
print("✓ Cleaned up")

# Create test student
print("\n[2] Creating test student...")
student_id = new_id("usr_")
student = {
    "user_id": student_id,
    "email": "test_student@campus.edu",
    "name": "Test Student",
    "role": "student",
    "institute": "IIT Bombay",
    "roll_no": "12345",
    "profile_complete": True,
    "points": 0,
    "badges": [],
    "created_at": utc_now()
}
db.users.insert_one(student)
print(f"✓ Created student: {student_id}")
print(f"  - Email: {student['email']}")
print(f"  - Institute: {student['institute']}")

# Create test admin with same institute
print("\n[3] Creating test admin...")
admin_id = new_id("usr_")
admin = {
    "user_id": admin_id,
    "email": "test_admin@campus.edu",
    "name": "Test Admin",
    "role": "admin",
    "institute": "IIT Bombay",
    "profile_complete": True,
    "points": 0,
    "badges": [],
    "created_at": utc_now()
}
db.users.insert_one(admin)
print(f"✓ Created admin: {admin_id}")
print(f"  - Email: {admin['email']}")
print(f"  - Institute: {admin['institute']}")

# Create institute-only lost item
print("\n[4] Creating institute-only lost item...")
lost_id_1 = new_id("lst_")
lost_item_1 = {
    "item_id": lost_id_1,
    "title": "TEST_Lost Laptop (Institute-only)",
    "description": "Lost in library, silver Dell laptop",
    "category": "Electronics",
    "color": "silver",
    "brand": "Dell",
    "last_seen_location": "Library",
    "building": "Main",
    "date_lost": "2025-12-29",
    "contact": "9876543210",
    "images": [],
    "visibility": "institute_only",
    "status": "open",
    "reported_by_user_id": student_id,
    "reported_by_name": student["name"],
    "reported_by_email": student["email"],
    "reported_by_institute": student["institute"],
    "created_at": utc_now()
}
db.lost_items.insert_one(lost_item_1)
print(f"✓ Created institute-only lost item: {lost_id_1}")
print(f"  - Visibility: {lost_item_1['visibility']}")
print(f"  - Reported by institute: {lost_item_1['reported_by_institute']}")

# Create public lost item
print("\n[5] Creating public lost item...")
lost_id_2 = new_id("lst_")
lost_item_2 = {
    "item_id": lost_id_2,
    "title": "TEST_Lost Phone (Public)",
    "description": "Lost in cafeteria, black iPhone",
    "category": "Electronics",
    "color": "black",
    "brand": "Apple",
    "last_seen_location": "Cafeteria",
    "building": "Block A",
    "date_lost": "2025-12-28",
    "contact": "9876543211",
    "images": [],
    "visibility": "public",
    "status": "open",
    "reported_by_user_id": student_id,
    "reported_by_name": student["name"],
    "reported_by_email": student["email"],
    "reported_by_institute": student["institute"],
    "created_at": utc_now()
}
db.lost_items.insert_one(lost_item_2)
print(f"✓ Created public lost item: {lost_id_2}")
print(f"  - Visibility: {lost_item_2['visibility']}")
print(f"  - Reported by institute: {lost_item_2['reported_by_institute']}")

# Test 1: Admin query
print("\n" + "="*80)
print("TEST 1: Admin Query (should see both items)")
print("="*80)

admin_institute = admin["institute"]
admin_institute_normalized = admin_institute.strip().lower()
print(f"\nAdmin institute (normalized): '{admin_institute_normalized}'")

admin_query = {
    "$or": [
        {"visibility": {"$in": ["public", None]}},
        {
            "$and": [
                {"visibility": "institute_only"},
                {"reported_by_institute": {"$regex": f"^{admin_institute_normalized}$", "$options": "i"}}
            ]
        }
    ]
}

print(f"\nQuery structure:")
print(json.dumps(admin_query, indent=2, default=str))

admin_results = list(db.lost_items.find(admin_query, {"_id": 0}))
print(f"\n✓ Query results: {len(admin_results)} items found")
for r in admin_results:
    print(f"  - {r['item_id']}: {r['title']}")
    print(f"    Visibility: {r['visibility']}, Institute: {r.get('reported_by_institute')}")

# Verify both items are found
expected_ids = {lost_id_1, lost_id_2}
found_ids = {r["item_id"] for r in admin_results}
if expected_ids == found_ids:
    print("\n✓ PASS: Admin can see both public and institute-only items")
else:
    print(f"\n✗ FAIL: Expected {expected_ids}, got {found_ids}")
    missing = expected_ids - found_ids
    if missing:
        print(f"  Missing items: {missing}")

# Test 2: Student query (should see only their own)
print("\n" + "="*80)
print("TEST 2: Student Query (should see only their own items)")
print("="*80)

student_query = {"reported_by_user_id": student_id}
print(f"\nQuery: {student_query}")

student_results = list(db.lost_items.find(student_query, {"_id": 0}))
print(f"\n✓ Query results: {len(student_results)} items found")
for r in student_results:
    print(f"  - {r['item_id']}: {r['title']}")

if len(student_results) == 2:
    print("\n✓ PASS: Student sees their own items")
else:
    print(f"\n✗ FAIL: Expected 2 items, got {len(student_results)}")

# Test 3: Check database directly
print("\n" + "="*80)
print("TEST 3: Direct Database Check")
print("="*80)

all_lost = list(db.lost_items.find({"title": {"$regex": "TEST_"}}, {"_id": 0}))
print(f"\nAll TEST_ lost items in database: {len(all_lost)}")
for item in all_lost:
    print(f"\n  Item: {item['item_id']}")
    print(f"    Title: {item['title']}")
    print(f"    Visibility: {item['visibility']}")
    print(f"    Reported by institute: {item.get('reported_by_institute')}")
    print(f"    Reported by user: {item.get('reported_by_user_id')}")

# Test 4: Regex matching test
print("\n" + "="*80)
print("TEST 4: Regex Matching Test")
print("="*80)

test_institutes = [
    "IIT Bombay",
    "iit bombay",
    "IIT BOMBAY",
    "Iit Bombay",
]

for test_inst in test_institutes:
    test_inst_normalized = test_inst.strip().lower()
    regex_query = {
        "reported_by_institute": {"$regex": f"^{test_inst_normalized}$", "$options": "i"}
    }
    matches = list(db.lost_items.find(regex_query, {"_id": 0, "item_id": 1, "reported_by_institute": 1}))
    print(f"\nTesting: '{test_inst}' (normalized: '{test_inst_normalized}')")
    print(f"  Regex: ^{test_inst_normalized}$")
    print(f"  Matches: {len(matches)}")
    for m in matches:
        print(f"    - {m['item_id']}: {m.get('reported_by_institute')}")

# Cleanup
print("\n" + "="*80)
print("CLEANUP")
print("="*80)
db.users.delete_many({"email": {"$regex": "test_"}})
db.lost_items.delete_many({"title": {"$regex": "TEST_"}})
print("✓ Cleaned up test data")

print("\n" + "="*80)
print("DEBUG COMPLETE")
print("="*80 + "\n")

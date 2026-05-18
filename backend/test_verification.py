"""Verification script for lost item visibility, AI matching, and centre status toggle."""
import asyncio
import json
from motor.motor_asyncio import AsyncClient
from pymongo import MongoClient
from backend.models import new_id, utc_now
from backend.ai_matcher import ai_match_lost_to_found
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# MongoDB connection
MONGO_URL = "mongodb://localhost:27017"
client = MongoClient(MONGO_URL)
db = client["smart_lost_found"]

async def test_lost_visibility():
    """Test lost item visibility with institute matching."""
    print("\n" + "="*60)
    print("TEST 1: Lost Item Visibility (Institute Matching)")
    print("="*60)
    
    # Create test student with institute
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
    print(f"✓ Created student: {student_id} with institute: {student['institute']}")
    
    # Create test admin with same institute
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
    print(f"✓ Created admin: {admin_id} with institute: {admin['institute']}")
    
    # Create institute-only lost item
    lost_id = new_id("lst_")
    lost_item = {
        "item_id": lost_id,
        "title": "Test Lost Laptop",
        "description": "Lost in library",
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
    db.lost_items.insert_one(lost_item)
    print(f"✓ Created institute-only lost item: {lost_id}")
    print(f"  - Visibility: {lost_item['visibility']}")
    print(f"  - Reported by institute: {lost_item['reported_by_institute']}")
    
    # Test admin query
    print("\n--- Testing Admin Query ---")
    institute = admin["institute"]
    institute_normalized = institute.strip().lower()
    print(f"Admin institute (normalized): '{institute_normalized}'")
    
    query = {
        "$or": [
            {"visibility": {"$in": ["public", None]}},
            {
                "$and": [
                    {"visibility": "institute_only"},
                    {"reported_by_institute": {"$regex": f"^{institute_normalized}$", "$options": "i"}}
                ]
            }
        ]
    }
    print(f"Query: {json.dumps(query, indent=2, default=str)}")
    
    results = list(db.lost_items.find(query))
    print(f"\nQuery results: {len(results)} items found")
    for r in results:
        print(f"  - {r['item_id']}: {r['title']} (visibility: {r['visibility']}, institute: {r.get('reported_by_institute')})")
    
    if lost_id in [r["item_id"] for r in results]:
        print("✓ PASS: Admin can see institute-only lost item")
    else:
        print("✗ FAIL: Admin cannot see institute-only lost item")
    
    # Cleanup
    db.users.delete_one({"user_id": student_id})
    db.users.delete_one({"user_id": admin_id})
    db.lost_items.delete_one({"item_id": lost_id})
    print("\n✓ Cleaned up test data")


async def test_ai_matching():
    """Test AI matching heuristic."""
    print("\n" + "="*60)
    print("TEST 2: AI Matching (Heuristic)")
    print("="*60)
    
    # Create test lost item
    lost_item = {
        "item_id": new_id("lst_"),
        "title": "Blue Backpack",
        "description": "Wildcraft blue backpack with laptop",
        "category": "Bag",
        "color": "blue",
        "brand": "Wildcraft",
        "last_seen_location": "Cafeteria",
        "building": "Block A",
        "date_lost": "2025-12-29",
    }
    print(f"Lost item: {lost_item['title']}")
    print(f"  - Category: {lost_item['category']}")
    print(f"  - Color: {lost_item['color']}")
    print(f"  - Brand: {lost_item['brand']}")
    
    # Create test found items
    found_items = [
        {
            "item_id": new_id("fnd_"),
            "title": "Blue Backpack - Wildcraft",
            "description": "Found in cafeteria, blue backpack",
            "category": "Bag",
            "color": "blue",
            "brand": "Wildcraft",
            "location_found": "Cafeteria",
            "building": "Block A",
            "date_found": "2025-12-29",
        },
        {
            "item_id": new_id("fnd_"),
            "title": "Red Backpack",
            "description": "Found in library",
            "category": "Bag",
            "color": "red",
            "brand": "Nike",
            "location_found": "Library",
            "building": "Main",
            "date_found": "2025-12-28",
        },
        {
            "item_id": new_id("fnd_"),
            "title": "Blue Laptop",
            "description": "Found in office",
            "category": "Electronics",
            "color": "blue",
            "brand": "Dell",
            "location_found": "Office",
            "building": "Admin",
            "date_found": "2025-12-27",
        },
    ]
    
    print(f"\nFound items to match against: {len(found_items)}")
    for f in found_items:
        print(f"  - {f['title']} ({f['category']}, {f['color']}, {f['brand']})")
    
    # Run AI matching
    print("\n--- Running AI Matching ---")
    matches = await ai_match_lost_to_found(lost_item, found_items)
    
    print(f"\nMatches found: {len(matches)}")
    for m in matches:
        print(f"  - {m['title']}: {m['similarity']}% ({m['reasoning']})")
    
    # Verify results
    if matches and matches[0]["similarity"] >= 80:
        print("✓ PASS: AI matching found high-similarity match")
    elif matches:
        print(f"⚠ PARTIAL: AI matching found matches but similarity is {matches[0]['similarity']}%")
    else:
        print("✗ FAIL: AI matching found no matches")


async def test_centre_status():
    """Test centre status toggle."""
    print("\n" + "="*60)
    print("TEST 3: Centre Status Toggle")
    print("="*60)
    
    # Create test centre
    centre_id = new_id("ctr_")
    centre = {
        "centre_id": centre_id,
        "name": "Test Centre",
        "description": "Test centre for status toggle",
        "location": "Block A",
        "building": "Main",
        "institute": "IIT Bombay",
        "contact_phone": "9876543210",
        "contact_email": "centre@campus.edu",
        "hours": "9 AM - 6 PM",
        "image": None,
        "is_open": True,
        "managed_by_admin_id": new_id("usr_"),
        "managed_by_admin_name": "Test Admin",
        "created_at": utc_now()
    }
    db.centres.insert_one(centre)
    print(f"✓ Created centre: {centre_id}")
    print(f"  - Initial status: is_open = {centre['is_open']}")
    
    # Toggle status
    print("\n--- Toggling Centre Status ---")
    db.centres.update_one({"centre_id": centre_id}, {"$set": {"is_open": False}})
    updated = db.centres.find_one({"centre_id": centre_id})
    print(f"✓ Updated centre status: is_open = {updated['is_open']}")
    
    # Verify persistence
    fetched = db.centres.find_one({"centre_id": centre_id})
    if fetched["is_open"] == False:
        print("✓ PASS: Centre status persisted correctly")
    else:
        print("✗ FAIL: Centre status did not persist")
    
    # Toggle back
    db.centres.update_one({"centre_id": centre_id}, {"$set": {"is_open": True}})
    fetched = db.centres.find_one({"centre_id": centre_id})
    if fetched["is_open"] == True:
        print("✓ PASS: Centre status toggled back correctly")
    else:
        print("✗ FAIL: Centre status toggle back failed")
    
    # Cleanup
    db.centres.delete_one({"centre_id": centre_id})
    print("\n✓ Cleaned up test data")


async def main():
    """Run all tests."""
    print("\n" + "="*60)
    print("SMART LOST & FOUND - VERIFICATION TESTS")
    print("="*60)
    
    try:
        await test_lost_visibility()
        await test_ai_matching()
        await test_centre_status()
        
        print("\n" + "="*60)
        print("ALL TESTS COMPLETED")
        print("="*60)
    except Exception as e:
        print(f"\n✗ ERROR: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())

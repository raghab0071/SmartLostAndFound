import asyncio
import traceback
from server import admin_register, AdminRegister, db

async def debug():
    try:
        # Check if DB connected
        print("Checking DB...")
        
        import uuid
        payload = AdminRegister(email=f"test{uuid.uuid4().hex[:6]}@example.com", password="password123", name="Test")
        res = await admin_register(payload)
        print("REGISTER SUCCESS:", res)
        
        user = res["user"]
        
        print("Testing non-existent column...")
        centres = await db.centres.find({"managed_by_admin_id": user["user_id"]}).to_list()
        print("Centres:", len(centres))
        
        from server import admin_dashboard_analytics
        dash = await admin_dashboard_analytics(user)
        print("DASHBOARD:")
        import json
        print(json.dumps(dash, indent=2))
    except Exception as e:
        print("EXCEPTION CAUGHT:")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(debug())

import urllib.request
import json
import uuid

base = "http://127.0.0.1:8000/api"

try:
    # Register new admin
    email = f"test_{uuid.uuid4().hex[:6]}@example.com"
    data = json.dumps({"email": email, "password": "pass", "name": "Test Admin"}).encode("utf-8")
    req = urllib.request.Request(f"{base}/auth/admin/register", data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as response:
        admin = json.loads(response.read())
        token = admin["access_token"]
        print("Admin registered:", admin["user"]["user_id"])

    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    # Create a centre
    centre_data = json.dumps({"name": "Test Centre", "location": "Loc", "institute": "Inst"}).encode("utf-8")
    req = urllib.request.Request(f"{base}/centres", data=centre_data, headers=headers)
    with urllib.request.urlopen(req) as response:
        print("Centre created:", json.loads(response.read())["centre_id"])

    # Dashboard
    req = urllib.request.Request(f"{base}/dashboard/analytics", headers=headers)
    with urllib.request.urlopen(req) as response:
        dash = json.loads(response.read())
        print("Dashboard:")
        for k, v in dash.items():
            if k == 'totals': print("Totals:", v)
            if k == 'by_category': print("Categories:", v)

    # Found items
    req = urllib.request.Request(f"{base}/items/found?mine=true", headers=headers)
    with urllib.request.urlopen(req) as response:
        print("Found items mine=true:", len(json.loads(response.read())))
        
    # Claims
    req = urllib.request.Request(f"{base}/claims", headers=headers)
    with urllib.request.urlopen(req) as response:
        print("Claims:", len(json.loads(response.read())))
except Exception as e:
    print(e)
    import traceback
    traceback.print_exc()

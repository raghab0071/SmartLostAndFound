import urllib.request
import json
import uuid

def run():
    base = "http://localhost:8000/api"
    email = f"test_{uuid.uuid4().hex[:6]}@demo.com"
    req = urllib.request.Request(f"{base}/auth/admin/register", data=json.dumps({
        "email": email, "password": "password123", "name": "Test"
    }).encode(), headers={"Content-Type": "application/json"}, method="POST")
    
    try:
        with urllib.request.urlopen(req) as res:
            token = json.loads(res.read())["access_token"]
    except urllib.error.HTTPError as e:
        print("REGISTER ERROR:", e.code, e.read().decode())
        return
        
    req = urllib.request.Request(f"{base}/dashboard/analytics", headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req) as res:
        print("DASHBOARD:", res.read().decode())
        
run()

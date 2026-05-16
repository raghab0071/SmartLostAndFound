import asyncio
import urllib.request
import urllib.error
import json

def test():
    base_url = "http://localhost:8000/api"
    
    # Register new admin
    req = urllib.request.Request(f"{base_url}/auth/admin/register", data=json.dumps({
        "email": "newadmin99@example.com",
        "password": "password123",
        "name": "New Admin 99"
    }).encode(), headers={"Content-Type": "application/json"}, method="POST")
    
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read())
            print("Register response:", response.status, res_data)
            token = res_data["access_token"]
    except urllib.error.HTTPError as e:
        if e.code == 400:
            # Login
            req = urllib.request.Request(f"{base_url}/auth/admin/login", data=json.dumps({
                "email": "newadmin99@example.com",
                "password": "password123"
            }).encode(), headers={"Content-Type": "application/json"}, method="POST")
            with urllib.request.urlopen(req) as response:
                res_data = json.loads(response.read())
                print("Login response:", response.status, res_data)
                token = res_data["access_token"]
        else:
            print("Error:", e)
            return

    headers = {"Authorization": f"Bearer {token}"}
    
    # Get dashboard analytics
    req = urllib.request.Request(f"{base_url}/dashboard/analytics", headers=headers)
    with urllib.request.urlopen(req) as response:
        print("Dashboard response:", response.status, json.loads(response.read()))
    
    # Get claims
    req = urllib.request.Request(f"{base_url}/claims", headers=headers)
    with urllib.request.urlopen(req) as response:
        print("Claims:", [c.get('claim_id') for c in json.loads(response.read())])
    
    # Get lost items
    req = urllib.request.Request(f"{base_url}/items/lost", headers=headers)
    with urllib.request.urlopen(req) as response:
        print("Lost Items:", [c.get('item_id') for c in json.loads(response.read())])

if __name__ == "__main__":
    test()

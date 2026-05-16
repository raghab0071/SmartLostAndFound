import urllib.request
import json
import urllib.error

url = "https://smartlostandfound.onrender.com/api/auth/google/session"
data = json.dumps({"session_id": "dummy"}).encode("utf-8")
req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
try:
    with urllib.request.urlopen(req) as response:
        print(f"{url} -> {response.status} {response.read().decode()}")
except urllib.error.HTTPError as e:
    print(f"{url} -> {e.code} {e.read().decode()}")
except Exception as e:
    print(f"{url} -> ERROR {e}")

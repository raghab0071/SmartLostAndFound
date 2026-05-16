import urllib.request
import urllib.error

url = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"
req = urllib.request.Request(url, headers={"X-Session-ID": "dummy", "User-Agent": "python-httpx/0.25.0"})
try:
    with urllib.request.urlopen(req) as response:
        print(f"{url} -> {response.status} {response.read().decode()[:50]}")
except urllib.error.HTTPError as e:
    print(f"{url} -> {e.code} {e.read().decode()[:50]}")
except Exception as e:
    print(f"{url} -> ERROR {e}")

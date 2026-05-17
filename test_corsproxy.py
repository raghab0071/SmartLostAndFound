import urllib.request
from urllib.parse import quote

url = "https://api.allorigins.win/raw?url=" + quote("https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data")
req = urllib.request.Request(url, headers={"X-Session-ID": "dummy", "User-Agent": "Mozilla/5.0"})
try:
    with urllib.request.urlopen(req) as response:
        print(f"Status: {response.status}")
        print(response.read().decode()[:100])
except Exception as e:
    if hasattr(e, 'code'):
        print(f"Error {e.code}: {e.read().decode()[:100]}")
    else:
        print(f"Error: {e}")

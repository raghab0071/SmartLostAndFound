import urllib.request

paths = [
    "/auth/v1/env/oauth/session-data",
    "/api/v1/env/oauth/session-data",
    "/v1/env/oauth/session-data",
    "/api/auth/v1/env/oauth/session-data"
]

for path in paths:
    url = f"https://auth.emergentagent.com{path}"
    req = urllib.request.Request(url, headers={"X-Session-ID": "dummy", "User-Agent": "python"})
    try:
        with urllib.request.urlopen(req) as response:
            print(f"{url} -> {response.status} {response.read().decode()[:50]}")
    except Exception as e:
        if hasattr(e, 'code'):
            print(f"{url} -> {e.code} {e.read().decode()[:50]}")
        else:
            print(f"{url} -> {e}")

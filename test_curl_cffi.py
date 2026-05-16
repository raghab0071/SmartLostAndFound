import asyncio
from curl_cffi.requests import AsyncSession

async def main():
    async with AsyncSession(impersonate="chrome110") as s:
        r = await s.get("https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data", headers={"X-Session-ID": "dummy"})
        print(r.status_code, r.text[:100])

asyncio.run(main())

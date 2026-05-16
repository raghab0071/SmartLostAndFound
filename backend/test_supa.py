import os
from dotenv import load_dotenv
import httpx
import asyncio

load_dotenv()

async def run():
    url = os.environ['SUPABASE_URL'] + '/rest/v1/centres?select=*&managed_by_admin_id=eq.test'
    headers = {'apikey': os.environ['SUPABASE_KEY']}
    async with httpx.AsyncClient() as client:
        res = await client.get(url, headers=headers)
        print("managed_by_admin_id query:", res.status_code, res.text[:200])

if __name__ == '__main__':
    asyncio.run(run())

import asyncio
import httpx
import traceback

AGMARKNET_URL = "https://api.data.gov.in/resource/35985678-0d79-46b4-9ed6-6f13308a1d24"
API_KEY = "579b464db66ec23bdd0000010982f5ffb78845c846d281a1daafe869"

async def test_api():
    params = {
        "api-key": API_KEY,
        "format": "json",
        "filters[commodity]": "Wheat",
        "limit": 10
    }
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(AGMARKNET_URL, params=params, headers={"User-Agent": "Mozilla/5.0"})
            print("Status Code:", resp.status_code)
            print("Raw text[:2000]:", resp.text[:2000])
    except Exception as e:
        print("HTTPX Error:", type(e).__name__)

asyncio.run(test_api())

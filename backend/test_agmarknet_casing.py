import asyncio
import httpx

AGMARKNET_URL = "https://api.data.gov.in/resource/35985678-0d79-46b4-9ed6-6f13308a1d24"
API_KEY = "579b464db66ec23bdd0000010982f5ffb78845c846d281a1daafe869"

async def test_api():
    async with httpx.AsyncClient(timeout=15.0) as client:
        # Test lowercase
        params1 = {"api-key": API_KEY, "format": "json", "filters[commodity]": "Wheat", "limit": 1}
        resp1 = await client.get(AGMARKNET_URL, params=params1, headers={"User-Agent": "Mozilla/5.0"})
        print("Lowercase commodity records:", len(resp1.json().get("records", [])))

        # Test uppercase
        params2 = {"api-key": API_KEY, "format": "json", "filters[Commodity]": "Wheat", "limit": 1}
        resp2 = await client.get(AGMARKNET_URL, params=params2, headers={"User-Agent": "Mozilla/5.0"})
        print("Uppercase Commodity records:", len(resp2.json().get("records", [])))
        
        # Test state
        params3 = {"api-key": API_KEY, "format": "json", "filters[Commodity]": "Wheat", "filters[State]": "Madhya Pradesh", "limit": 1}
        resp3 = await client.get(AGMARKNET_URL, params=params3, headers={"User-Agent": "Mozilla/5.0"})
        print("Uppercase State records:", len(resp3.json().get("records", [])))

asyncio.run(test_api())

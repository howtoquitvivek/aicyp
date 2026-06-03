import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()
url = os.environ.get("MONGODB_URL")

async def main():
    client = AsyncIOMotorClient(url)
    db = client.get_default_database()
    result = await db["market_cache"].delete_many({})
    print(f"Deleted {result.deleted_count} cache entries")

asyncio.run(main())

"""
MongoDB connection manager using Motor (async driver).
"""
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import get_settings

_client: AsyncIOMotorClient | None = None
_db = None

DB_NAME = "agribrain"


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        settings = get_settings()
        _client = AsyncIOMotorClient(settings.mongodb_url)
    return _client


def get_db():
    """Get the default database instance."""
    global _db
    if _db is None:
        _db = get_client()[DB_NAME]
    return _db


async def ping_db():
    """Health check — verify connection is alive."""
    client = get_client()
    await client.admin.command("ping")
    return True


async def close_db():
    """Close the MongoDB connection."""
    global _client, _db
    if _client:
        _client.close()
        _client = None
        _db = None

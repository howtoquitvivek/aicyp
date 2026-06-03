"""
User service — CRUD operations for user profiles, farm config, and preferences.
Uses Firebase UID as the primary key (_id).
"""
from datetime import datetime, timezone
from app.core.database import get_db


COLLECTION = "users"


def _now():
    return datetime.now(timezone.utc).isoformat()


async def get_user(uid: str) -> dict | None:
    """Get a user document by Firebase UID."""
    db = get_db()
    doc = await db[COLLECTION].find_one({"_id": uid})
    return doc


async def upsert_profile(uid: str, data: dict) -> dict:
    """Create or update a user's profile info."""
    db = get_db()
    update = {
        "$set": {
            "profile": data,
            "updated_at": _now(),
        },
        "$setOnInsert": {
            "_id": uid,
            "created_at": _now(),
        },
    }
    await db[COLLECTION].update_one({"_id": uid}, update, upsert=True)
    return await get_user(uid)


import uuid

async def add_timeline_event(uid: str, plot_id: str, plot_name: str, event_type: str, summary: str, metadata: dict = None):
    db = get_db()
    event = {
        "id": str(uuid.uuid4()),
        "type": event_type,
        "plotId": plot_id,
        "plotName": plot_name,
        "timestamp": _now(),
        "summary": summary,
        "metadata": metadata or {}
    }
    await db[COLLECTION].update_one(
        {"_id": uid},
        {"$push": {"timeline": {"$each": [event], "$sort": {"timestamp": -1}, "$slice": 100}}}
    )

async def upsert_farm(uid: str, data: dict) -> dict:
    """Create or update a user's farm configuration, logging new plots."""
    db = get_db()
    
    old_doc = await get_user(uid)
    old_plots = {p["id"] for p in old_doc.get("farm", {}).get("plots", [])} if old_doc else set()
    new_plots = {p.get("id"): p for p in data.get("plots", []) if p.get("id")}
    
    update = {
        "$set": {
            "farm": data,
            "updated_at": _now(),
        },
        "$setOnInsert": {
            "_id": uid,
            "created_at": _now(),
        },
    }
    await db[COLLECTION].update_one({"_id": uid}, update, upsert=True)
    
    # Log timeline events for newly created plots
    for pid, plot in new_plots.items():
        if pid not in old_plots:
            await add_timeline_event(uid, pid, plot.get("name", "New Plot"), "plot_created", f"Plot '{plot.get('name', 'New Plot')}' created")
            
    return await get_user(uid)


async def upsert_preferences(uid: str, data: dict) -> dict:
    """Create or update a user's preferences."""
    db = get_db()
    update = {
        "$set": {
            "preferences": data,
            "updated_at": _now(),
        },
        "$setOnInsert": {
            "_id": uid,
            "created_at": _now(),
        },
    }
    await db[COLLECTION].update_one({"_id": uid}, update, upsert=True)
    return await get_user(uid)

async def add_yield_plan(uid: str, data: dict) -> dict:
    """Append a new yield plan to the user's plans array and log timeline."""
    db = get_db()
    data["created_at"] = _now()
    
    # Find plot name
    doc = await get_user(uid)
    plot_name = "Plot"
    if doc and "farm" in doc and "plots" in doc["farm"]:
        for p in doc["farm"]["plots"]:
            if p.get("id") == data.get("plotId"):
                plot_name = p.get("name", "Plot")
                break
                
    update = {
        "$push": {
            "plans": data
        },
        "$set": {
            "updated_at": _now(),
        },
        "$setOnInsert": {
            "_id": uid,
            "created_at": _now(),
        },
    }
    await db[COLLECTION].update_one({"_id": uid}, update, upsert=True)
    
    await add_timeline_event(uid, data.get("plotId"), plot_name, "yield_plan_saved", f"Yield plan saved for {data.get('crop', 'crop')}")
    
    return await get_user(uid)

async def add_recommendation(uid: str, data: dict) -> dict:
    """Append a new recommendation to the user's recommendations array and log timeline."""
    db = get_db()
    data["created_at"] = _now()
    
    doc = await get_user(uid)
    plot_name = "Plot"
    if doc and "farm" in doc and "plots" in doc["farm"]:
        for p in doc["farm"]["plots"]:
            if p.get("id") == data.get("plotId"):
                plot_name = p.get("name", "Plot")
                break
                
    update = {
        "$push": {
            "recommendations": data
        },
        "$set": {
            "updated_at": _now(),
        },
        "$setOnInsert": {
            "_id": uid,
            "created_at": _now(),
        },
    }
    await db[COLLECTION].update_one({"_id": uid}, update, upsert=True)
    
    await add_timeline_event(
        uid, 
        data.get("plotId"), 
        plot_name, 
        "recommendation_generated", 
        f"{data.get('crop')} recommended ({int(data.get('confidence', 0))}%)"
    )
    
    return await get_user(uid)

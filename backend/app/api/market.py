from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from app.services.market_service import get_all_prices, get_commodity_detail, get_latest_market_price, search_agmarknet_history

router = APIRouter(prefix="/api/market", tags=["market"])


@router.get("/prices")
async def list_prices(category: Optional[str] = Query(None)):
    """Get current prices for all commodities, optionally filtered by category."""
    prices = await get_all_prices()
    if category:
        prices = [p for p in prices if p["category"].lower() == category.lower()]
    return {"commodities": prices}


@router.get("/prices/{commodity_id}")
async def commodity_detail(commodity_id: str):
    """Get detailed price history for a single commodity."""
    data = await get_commodity_detail(commodity_id)
    if not data:
        raise HTTPException(status_code=404, detail=f"Commodity '{commodity_id}' not found")
    return data



@router.get("/search")
async def search_market_history(crop: str, state: str = "", district: str = ""):
    """Search global market prices."""
    records = await search_agmarknet_history(crop, state, district)
    return {"records": records}

@router.get("/current")
async def current_market_price(crop: str, district: str = "", state: str = ""):
    """Get the latest real market price from AGMARKNET for an active plot."""
    return await get_latest_market_price(crop, district, state)

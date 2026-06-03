"""
Market price service.
Serves commodity price data — pulls specifications from MongoDB and simulates daily fluctuations.
"""
import random
from datetime import datetime, timedelta, timezone
import httpx
from app.core.database import get_db
from app.core.config import get_settings
from app.services.crop_mapping import get_agmarknet_commodities, normalize_agmarknet_commodity

AGMARKNET_URL = "https://api.data.gov.in/resource/35985678-0d79-46b4-9ed6-6f13308a1d24"

# Seed random for consistent demo data within a session
_seed = int(datetime.now().strftime("%Y%m%d"))


def _generate_price_history(base_price: float, days: int = 30):
    """Generate realistic daily price fluctuations."""
    rng = random.Random(_seed)
    prices = []
    price = base_price
    today = datetime.now().date()

    for i in range(days, 0, -1):
        date = today - timedelta(days=i)
        change_pct = rng.uniform(-0.025, 0.03)  # -2.5% to +3%
        price = max(price * 0.7, price * (1 + change_pct))  # Floor at 70% of base
        prices.append({
            "date": date.isoformat(),
            "price": round(price, 2),
        })

    # Today's price
    prices.append({
        "date": today.isoformat(),
        "price": round(price, 2),
    })

    return prices


async def get_all_prices():
    """Get current prices and daily change for all commodities loaded from MongoDB."""
    db = get_db()
    count = await db["commodity_dataset"].count_documents({})
    if count == 0:
        from app.api.datasets import COMMODITY_SEED_DATA
        await db["commodity_dataset"].insert_many(COMMODITY_SEED_DATA)
        
    commodities = await db["commodity_dataset"].find({}).to_list(length=100)
    results = []
    
    for c in commodities:
        history = _generate_price_history(c["base_price"])
        current = history[-1]["price"]
        prev = history[-2]["price"]
        change = current - prev
        change_pct = (change / prev) * 100 if prev else 0

        results.append({
            "id": c["id"],
            "name": c["name"],
            "icon": c["icon"],
            "unit": c["unit"],
            "category": c["category"],
            "mandi": c["mandi"],
            "current_price": round(current, 2),
            "previous_price": round(prev, 2),
            "change": round(change, 2),
            "change_pct": round(change_pct, 2),
            "high_30d": round(max(p["price"] for p in history), 2),
            "low_30d": round(min(p["price"] for p in history), 2),
        })

    return results


async def get_commodity_detail(commodity_id: str):
    """Get detailed price history for a single commodity loaded from MongoDB."""
    db = get_db()
    commodity = await db["commodity_dataset"].find_one({"id": commodity_id.lower()})
    if not commodity:
        return None

    history = _generate_price_history(commodity["base_price"], days=90)
    current = history[-1]["price"]
    prev = history[-2]["price"]

    # Sanitize _id for JSON output
    cleaned_commodity = dict(commodity)
    if "_id" in cleaned_commodity:
        cleaned_commodity["_id"] = str(cleaned_commodity["_id"])

    return {
        **cleaned_commodity,
        "current_price": round(current, 2),
        "change": round(current - prev, 2),
        "change_pct": round(((current - prev) / prev) * 100, 2) if prev else 0,
        "high_30d": round(max(p["price"] for p in history[-30:]), 2),
        "low_30d": round(min(p["price"] for p in history[-30:]), 2),
        "history": history,
    }



async def search_agmarknet_history(commodity: str, state: str = "", district: str = "", limit: int = 200):
    """
    Query AGMARKNET directly for global search functionality.
    """
    settings = get_settings()
    api_key = settings.datagov_api_key
    if not api_key:
        return []

    mapped_crops = get_agmarknet_commodities(commodity)
    if not mapped_crops:
        mapped_crops = [commodity]

    results = []
    async with httpx.AsyncClient(timeout=10.0) as client:
        for crop in mapped_crops:
            params = {
                "api-key": api_key,
                "format": "json",
                "filters[commodity]": crop,
                "limit": limit
            }
            if state:
                params["filters[state]"] = state
            if district:
                params["filters[district]"] = district
                
            try:
                resp = await client.get(
                    AGMARKNET_URL,
                    params=params,
                    headers={
                        "User-Agent": "Mozilla/5.0",
                        "Accept": "application/json"
                    }
                )
                resp.raise_for_status()
                data = resp.json()
                records = data.get("records", [])
                if records:
                    results.extend(records)
            except Exception as e:
                print(f"AGMARKNET API Error for crop {crop}: {e}")
                continue

    # Sort results by date descending
    results.sort(key=lambda x: _parse_date(x.get("Arrival_Date", x.get("arrival_date", ""))), reverse=True)
    return results

def _parse_date(date_str):
    try:
        return datetime.strptime(date_str, "%d/%m/%Y")
    except Exception:
        return datetime.min

async def get_latest_market_price(commodity: str, district: str, state: str):
    """
    Get the latest market price for a given commodity, district, and state.
    Uses fallback logic and caching.
    """
    db = get_db()
    cache_key = f"{state}_{district}_{commodity}".lower().replace(" ", "_")
    
    # Check cache (12hr TTL)
    cache_entry = await db["market_cache"].find_one({"_id": cache_key})
    if cache_entry:
        updated_at = datetime.fromisoformat(cache_entry["updated_at"])
        if datetime.now(timezone.utc) - updated_at < timedelta(hours=12):
            return cache_entry["data"]

    settings = get_settings()
    api_key = settings.datagov_api_key
    print("DATAGOV KEY LOADED:", bool(api_key))

    if not api_key:
        return _empty_market_response()

    mapped_crops = get_agmarknet_commodities(commodity)

    async with httpx.AsyncClient(timeout=5.0) as client:
        # Fallback 1: District + State + Commodity
        result, match_type = await _query_agmarknet(client, api_key, mapped_crops, state=state, district=district)
        if not result:
            # Fallback 2: State + Commodity
            result, match_type = await _query_agmarknet(client, api_key, mapped_crops, state=state)
            
        if not result:
            # Fallback 3: Commodity only
            result, match_type = await _query_agmarknet(client, api_key, mapped_crops)
            
    if result:
        primary_record = result[0]
        arrival_date_str = primary_record.get("Arrival_Date", primary_record.get("arrival_date", ""))
        arrival_date_obj = _parse_date(arrival_date_str)
        
        # Calculate Freshness
        price_age_days = (datetime.now() - arrival_date_obj).days if arrival_date_obj != datetime.min else 999
        if price_age_days <= 7:
            data_freshness = "FRESH"
        elif price_age_days <= 30:
            data_freshness = "RECENT"
        else:
            data_freshness = "STALE"
            
        # Calculate Confidence
        confidence = "LOW"
        confidence_reason = ""
        
        if match_type == "DISTRICT":
            if data_freshness == "FRESH":
                confidence = "HIGH"
                confidence_reason = f"Exact district match ({district}) with fresh data."
            else:
                confidence = "MEDIUM"
                confidence_reason = f"District match found, but latest record is {price_age_days} days old."
        elif match_type == "STATE":
            if data_freshness == "FRESH":
                confidence = "MEDIUM"
                confidence_reason = f"Using state-level data ({state}) because no fresh district records were found."
            else:
                confidence = "LOW"
                confidence_reason = f"State-level data used and record is {price_age_days} days old."
        else:
            confidence = "LOW"
            confidence_reason = f"Only matched by commodity ({commodity}) across India. Very broad average."

        modal_price = float(primary_record.get("Modal_Price", primary_record.get("modal_price", 0)))
        
        # Extract up to 5 other unique nearby markets and calculate difference
        nearby_markets = []
        seen_markets = {primary_record.get("Market", "")}
        for rec in result[1:]:
            mandi = rec.get("Market")
            if mandi and mandi not in seen_markets:
                seen_markets.add(mandi)
                mandi_price = float(rec.get("Modal_Price", 0))
                diff_rs = mandi_price - modal_price
                diff_pct = (diff_rs / modal_price) * 100 if modal_price > 0 else 0
                
                nearby_markets.append({
                    "market": mandi,
                    "district": rec.get("District", district),
                    "state": rec.get("State", state),
                    "modal_price": mandi_price,
                    "arrival_date": rec.get("Arrival_Date", ""),
                    "difference_rs": round(diff_rs, 2),
                    "difference_pct": round(diff_pct, 2)
                })
                if len(nearby_markets) >= 5:
                    break
                    
        # Calculate Market Spread and Best Market
        all_prices = [modal_price] + [m["modal_price"] for m in nearby_markets]
        highest_price = max(all_prices) if all_prices else modal_price
        lowest_price = min(all_prices) if all_prices else modal_price
        market_spread = highest_price - lowest_price
        market_spread_pct = (market_spread / lowest_price) * 100 if lowest_price > 0 else 0
        
        best_market = primary_record.get("Market", "Unknown Market")
        best_market_price = modal_price
        for m in nearby_markets:
            if m["modal_price"] == highest_price:
                best_market = m["market"]
                best_market_price = highest_price
                break

        response_data = {
            "crop": commodity,
            "normalized_crop": normalize_agmarknet_commodity(primary_record.get("Commodity", primary_record.get("commodity", ""))),
            "market": primary_record.get("Market", primary_record.get("market", "Unknown Market")),
            "state": primary_record.get("State", primary_record.get("state", state)),
            "district": primary_record.get("District", primary_record.get("district", district)),
            "modal_price": modal_price,
            "min_price": float(primary_record.get("Min_Price", primary_record.get("min_price", 0))),
            "max_price": float(primary_record.get("Max_Price", primary_record.get("max_price", 0))),
            "arrival_date": arrival_date_str,
            "source": "AGMARKNET",
            "price_age_days": price_age_days,
            "data_freshness": data_freshness,
            "confidence": confidence,
            "confidence_reason": confidence_reason,
            "best_market": best_market,
            "best_market_price": best_market_price,
            "market_spread": round(market_spread, 2),
            "market_spread_pct": round(market_spread_pct, 2),
            "available": True,
            "nearby_markets": nearby_markets
        }
        
        # Save cache
        await db["market_cache"].update_one(
            {"_id": cache_key},
            {
                "$set": {
                    "data": response_data,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            },
            upsert=True
        )
        
        # Record Snapshot
        snapshot = {
            **response_data,
            "fetched_at": datetime.now(timezone.utc).isoformat()
        }
        await db["market_snapshots"].insert_one(snapshot)
        
        return response_data
        
    if cache_entry:
        return cache_entry["data"]
        
    return _empty_market_response()
    
def _empty_market_response():
    return {
        "available": False,
        "message": "No recent market data available"
    }

async def _query_agmarknet(client, api_key, crops: list[str], state=None, district=None):
    """
    Attempts to query AGMARKNET for each crop variant in the list.
    Returns (best_record, match_type) or (None, None).
    """
    match_type = "COMMODITY"
    if district and state:
        match_type = "DISTRICT"
    elif state:
        match_type = "STATE"

    for crop in crops:
        params = {
            "api-key": api_key,
            "format": "json",
            "filters[commodity]": crop,
            "limit": 100
        }
        if state:
            params["filters[state]"] = state
        if district:
            params["filters[district]"] = district
            
        try:
            resp = await client.get(
                AGMARKNET_URL,
                params=params,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/137.0 Safari/537.36",
                    "Accept": "application/json"
                }
            )
            resp.raise_for_status()
            data = resp.json()
            
            records = data.get("records", [])
            if records:
                # Sort by Arrival_Date descending to get the latest
                records.sort(key=lambda x: _parse_date(x.get("Arrival_Date", x.get("arrival_date", ""))), reverse=True)
                return records, match_type
                
        except Exception as e:
            print(f"AGMARKNET API Error for crop {crop}: {e}")
            continue
            
    return None, None

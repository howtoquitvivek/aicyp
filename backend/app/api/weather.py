from fastapi import APIRouter, HTTPException, Query
from app.services.weather_service import (
    get_coordinates,
    get_current_weather,
    get_forecast,
    get_air_quality,
)

router = APIRouter(prefix="/api/weather", tags=["weather"])


@router.get("/current")
async def current_weather(city: str = Query(..., min_length=2, description="City name")):
    """Get current weather for a city."""
    coords = await get_coordinates(city)
    if not coords:
        raise HTTPException(status_code=404, detail=f"City '{city}' not found")

    weather = await get_current_weather(coords["lat"], coords["lon"])
    weather["coordinates"] = coords
    return weather


@router.get("/forecast")
async def forecast(city: str = Query(..., min_length=2)):
    """Get 5-day forecast for a city."""
    coords = await get_coordinates(city)
    if not coords:
        raise HTTPException(status_code=404, detail=f"City '{city}' not found")

    data = await get_forecast(coords["lat"], coords["lon"])
    return {"city": coords["name"], "forecast": data}


@router.get("/air-quality")
async def air_quality(city: str = Query(..., min_length=2)):
    """Get air quality index for a city."""
    coords = await get_coordinates(city)
    if not coords:
        raise HTTPException(status_code=404, detail=f"City '{city}' not found")

    data = await get_air_quality(coords["lat"], coords["lon"])
    if not data:
        raise HTTPException(status_code=404, detail="Air quality data unavailable")

    data["city"] = coords["name"]
    return data


@router.get("/full")
async def full_weather(city: str = Query(..., min_length=2)):
    """Get combined weather data — current + forecast + air quality."""
    coords = await get_coordinates(city)
    if not coords:
        raise HTTPException(status_code=404, detail=f"City '{city}' not found")

    lat, lon = coords["lat"], coords["lon"]

    current = await get_current_weather(lat, lon)
    forecast_data = await get_forecast(lat, lon)
    aqi = await get_air_quality(lat, lon)

    return {
        "city": coords["name"],
        "coordinates": coords,
        "current": current,
        "forecast": forecast_data,
        "air_quality": aqi,
    }

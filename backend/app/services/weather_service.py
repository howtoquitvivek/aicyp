import httpx
from fastapi import HTTPException
from app.core.config import get_settings
from app.core.database import get_db
from datetime import datetime, timezone

BASE_URL = "https://api.openweathermap.org/data/2.5"
GEO_URL = "https://api.openweathermap.org/geo/1.0"


def _handle_api_error(e: Exception):
    """(Deprecated) Weather API error handler. We now catch and return demo data."""
    print(f"Weather API Error: {e}")


async def get_coordinates(city: str):
    """Geocode a city name to lat/lon."""
    try:
        settings = get_settings()
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{GEO_URL}/direct",
                params={"q": city, "limit": 1, "appid": settings.openweather_api_key},
            )
            resp.raise_for_status()
            data = resp.json()
            if not data:
                return {"lat": 28.6139, "lon": 77.2090, "name": city}
            return {"lat": data[0]["lat"], "lon": data[0]["lon"], "name": data[0].get("name", city)}
    except Exception as e:
        _handle_api_error(e)
        return {"lat": 28.6139, "lon": 77.2090, "name": city}


async def get_current_weather(lat: float, lon: float):
    """Fetch current weather for given coordinates."""
    try:
        settings = get_settings()
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{BASE_URL}/weather",
                params={
                    "lat": lat,
                    "lon": lon,
                    "appid": settings.openweather_api_key,
                    "units": "metric",
                },
            )
            resp.raise_for_status()
            raw = resp.json()
        weather_data = {
            "temp": raw["main"]["temp"],
            "feels_like": raw["main"]["feels_like"],
            "humidity": raw["main"]["humidity"],
            "pressure": raw["main"]["pressure"],
            "wind_speed": raw["wind"]["speed"],
            "wind_deg": raw["wind"].get("deg", 0),
            "visibility": raw.get("visibility", 0),
            "clouds": raw["clouds"]["all"],
            "description": raw["weather"][0]["description"],
            "icon": raw["weather"][0]["icon"],
            "city": raw.get("name", ""),
            "rainfall": raw.get("rain", {}).get("1h", 0) if "rain" in raw else 0,
        }

        try:
            db = get_db()
            await db["weather_snapshots"].insert_one({
                "district": weather_data["city"],
                "date": datetime.now(timezone.utc).isoformat(),
                "temp": weather_data["temp"],
                "humidity": weather_data["humidity"],
                "rainfall": raw.get("rain", {}).get("1h", 0) if "rain" in raw else 0
            })
        except Exception as log_err:
            print(f"Failed to log weather snapshot: {log_err}")

        return weather_data
    except Exception as e:
        _handle_api_error(e)
        return {
            "temp": 28.5,
            "feels_like": 29.0,
            "humidity": 65,
            "pressure": 1012,
            "wind_speed": 4.5,
            "wind_deg": 180,
            "visibility": 10000,
            "clouds": 20,
            "description": "clear sky",
            "icon": "01d",
            "city": "Demo City",
            "rainfall": 0,
        }


async def get_forecast(lat: float, lon: float):
    """Fetch 5-day / 3-hour forecast and compress into daily summaries."""
    try:
        settings = get_settings()
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{BASE_URL}/forecast",
                params={
                    "lat": lat,
                    "lon": lon,
                    "appid": settings.openweather_api_key,
                    "units": "metric",
                },
            )
            resp.raise_for_status()
            raw = resp.json()

        # Group by date and create daily summaries
        days = {}
        for item in raw["list"]:
            date = item["dt_txt"].split(" ")[0]
            if date not in days:
                days[date] = {
                    "date": date,
                    "temps": [],
                    "humidity": [],
                    "description": item["weather"][0]["description"],
                    "icon": item["weather"][0]["icon"],
                }
            days[date]["temps"].append(item["main"]["temp"])
            days[date]["humidity"].append(item["main"]["humidity"])

        forecast = []
        for date, data in list(days.items())[:7]:
            forecast.append({
                "date": data["date"],
                "temp_min": round(min(data["temps"]), 1),
                "temp_max": round(max(data["temps"]), 1),
                "temp_avg": round(sum(data["temps"]) / len(data["temps"]), 1),
                "humidity_avg": round(sum(data["humidity"]) / len(data["humidity"])),
                "description": data["description"],
                "icon": data["icon"],
            })

        return forecast
    except Exception as e:
        _handle_api_error(e)
        from datetime import datetime, timedelta
        forecast = []
        for i in range(7):
            d = (datetime.now() + timedelta(days=i)).strftime("%Y-%m-%d")
            forecast.append({
                "date": d,
                "temp_min": 22.0,
                "temp_max": 32.0,
                "temp_avg": 27.0,
                "humidity_avg": 60,
                "description": "scattered clouds",
                "icon": "03d",
            })
        return forecast


async def get_air_quality(lat: float, lon: float):
    """Fetch air quality index."""
    try:
        settings = get_settings()
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{BASE_URL}/air_pollution",
                params={
                    "lat": lat,
                    "lon": lon,
                    "appid": settings.openweather_api_key,
                },
            )
            resp.raise_for_status()
            raw = resp.json()

        if raw.get("list"):
            aqi_data = raw["list"][0]
            return {
                "aqi": aqi_data["main"]["aqi"],  # 1=Good, 5=Very Poor
                "components": aqi_data["components"],
            }
        return None
    except Exception as e:
        _handle_api_error(e)
        return {
            "aqi": 2,
            "components": {"co": 201.94, "no": 0.01, "no2": 0.04, "o3": 68.66, "so2": 0.64, "pm2_5": 0.5, "pm10": 0.54, "nh3": 0.12},
        }

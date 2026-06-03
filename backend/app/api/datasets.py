"""
API Router for Dynamic Datasets (Crops & Commodities).
Allows listing and adding to the database-driven crop and commodity lists.
"""
from fastapi import APIRouter, HTTPException, Body
from typing import List, Dict, Any
from pydantic import BaseModel, Field
from app.core.database import get_db

router = APIRouter(prefix="/api/datasets", tags=["datasets"])

# Seed data for Crop Dataset
CROP_SEED_DATA = [
    {
        "name": "Rice",
        "icon": "🌾",
        "season": "Kharif",
        "water_need": "High",
        "growth_period": "120–150 days",
        "description": "Staple grain crop. Thrives in warm, humid conditions with standing water.",
        "ideal": {"n": [60, 120], "p": [30, 60], "k": [30, 60], "ph": [5.5, 7.0], "temp": [22, 35], "humidity": [70, 95], "rain": [150, 400]},
    },
    {
        "name": "Wheat",
        "icon": "🌿",
        "season": "Rabi",
        "water_need": "Medium",
        "growth_period": "100–130 days",
        "description": "Cool-season cereal. Best in well-drained loamy soil with moderate rainfall.",
        "ideal": {"n": [80, 140], "p": [40, 70], "k": [20, 50], "ph": [6.0, 7.5], "temp": [15, 25], "humidity": [40, 70], "rain": [50, 120]},
    },
    {
        "name": "Maize",
        "icon": "🌽",
        "season": "Kharif",
        "water_need": "Medium",
        "growth_period": "80–110 days",
        "description": "Versatile warm-season crop. Grows well in fertile, well-drained soil.",
        "ideal": {"n": [60, 120], "p": [30, 60], "k": [20, 50], "ph": [5.5, 7.5], "temp": [20, 35], "humidity": [50, 80], "rain": [60, 200]},
    },
    {
        "name": "Cotton",
        "icon": "☁️",
        "season": "Kharif",
        "water_need": "Medium",
        "growth_period": "150–180 days",
        "description": "Cash crop requiring warm temperatures and deep black soil for best yields.",
        "ideal": {"n": [40, 100], "p": [20, 50], "k": [20, 40], "ph": [6.0, 8.0], "temp": [25, 40], "humidity": [40, 70], "rain": [60, 150]},
    },
    {
        "name": "Sugarcane",
        "icon": "🎋",
        "season": "Kharif",
        "water_need": "High",
        "growth_period": "270–365 days",
        "description": "Tropical cash crop. Needs hot, humid climate and plenty of water.",
        "ideal": {"n": [80, 150], "p": [40, 80], "k": [40, 80], "ph": [5.0, 8.0], "temp": [25, 40], "humidity": [60, 90], "rain": [100, 300]},
    },
    {
        "name": "Chickpea",
        "icon": "🫘",
        "season": "Rabi",
        "water_need": "Low",
        "growth_period": "90–120 days",
        "description": "Drought-tolerant pulse crop. Fixes nitrogen and improves soil health.",
        "ideal": {"n": [20, 50], "p": [30, 60], "k": [20, 40], "ph": [6.0, 8.0], "temp": [15, 30], "humidity": [30, 60], "rain": [30, 100]},
    },
    {
        "name": "Mustard",
        "icon": "🌼",
        "season": "Rabi",
        "water_need": "Low",
        "growth_period": "90–120 days",
        "description": "Oilseed crop suited for dry, cool climates with moderate fertility.",
        "ideal": {"n": [40, 80], "p": [20, 50], "k": [10, 30], "ph": [6.0, 7.5], "temp": [10, 25], "humidity": [30, 60], "rain": [25, 80]},
    },
    {
        "name": "Groundnut",
        "icon": "🥜",
        "season": "Kharif",
        "water_need": "Medium",
        "growth_period": "100–130 days",
        "description": "Legume oilseed that enriches soil nitrogen. Prefers sandy loam soil.",
        "ideal": {"n": [10, 40], "p": [30, 60], "k": [30, 50], "ph": [5.5, 7.0], "temp": [22, 35], "humidity": [50, 80], "rain": [50, 150]},
    },
    {
        "name": "Soybean",
        "icon": "🌱",
        "season": "Kharif",
        "water_need": "Medium",
        "growth_period": "90–120 days",
        "description": "High-protein legume. Ideal for crop rotation with cereals.",
        "ideal": {"n": [20, 60], "p": [40, 80], "k": [20, 50], "ph": [6.0, 7.5], "temp": [20, 35], "humidity": [50, 80], "rain": [60, 200]},
    },
    {
        "name": "Tomato",
        "icon": "🍅",
        "season": "Rabi",
        "water_need": "Medium",
        "growth_period": "60–90 days",
        "description": "Warm-season vegetable. High market demand with moderate input requirements.",
        "ideal": {"n": [80, 140], "p": [50, 90], "k": [50, 80], "ph": [6.0, 7.0], "temp": [18, 30], "humidity": [50, 75], "rain": [40, 120]},
    },
]

# Seed data for Commodity Dataset
COMMODITY_SEED_DATA = [
    {"id": "rice", "name": "Rice (Basmati)", "icon": "🌾", "unit": "₹/quintal", "category": "Cereals",
     "base_price": 3800, "mandi": "Azadpur, Delhi"},
    {"id": "wheat", "name": "Wheat", "icon": "🌿", "unit": "₹/quintal", "category": "Cereals",
     "base_price": 2275, "mandi": "Karnal, Haryana"},
    {"id": "maize", "name": "Maize", "icon": "🌽", "unit": "₹/quintal", "category": "Cereals",
     "base_price": 1962, "mandi": "Davangere, Karnataka"},
    {"id": "cotton", "name": "Cotton", "icon": "☁️", "unit": "₹/quintal", "category": "Cash Crops",
     "base_price": 6620, "mandi": "Rajkot, Gujarat"},
    {"id": "sugarcane", "name": "Sugarcane", "icon": "🎋", "unit": "₹/quintal", "category": "Cash Crops",
     "base_price": 315, "mandi": "Muzaffarnagar, UP"},
    {"id": "soybean", "name": "Soybean", "icon": "🌱", "unit": "₹/quintal", "category": "Oilseeds",
     "base_price": 4600, "mandi": "Indore, MP"},
    {"id": "groundnut", "name": "Groundnut", "icon": "🥜", "unit": "₹/quintal", "category": "Oilseeds",
     "base_price": 5550, "mandi": "Junagadh, Gujarat"},
    {"id": "mustard", "name": "Mustard", "icon": "🌼", "unit": "₹/quintal", "category": "Oilseeds",
     "base_price": 5050, "mandi": "Alwar, Rajasthan"},
    {"id": "tomato", "name": "Tomato", "icon": "🍅", "unit": "₹/kg", "category": "Vegetables",
     "base_price": 35, "mandi": "Kolar, Karnataka"},
    {"id": "onion", "name": "Onion", "icon": "🧅", "unit": "₹/kg", "category": "Vegetables",
     "base_price": 28, "mandi": "Lasalgaon, Maharashtra"},
    {"id": "potato", "name": "Potato", "icon": "🥔", "unit": "₹/kg", "category": "Vegetables",
     "base_price": 18, "mandi": "Agra, UP"},
    {"id": "chickpea", "name": "Chickpea (Chana)", "icon": "🫘", "unit": "₹/quintal", "category": "Pulses",
     "base_price": 5440, "mandi": "Latur, Maharashtra"},
]


# Pydantic Schemas for validation
class IdealConditions(BaseModel):
    n: List[float] = Field(..., min_items=2, max_items=2)
    p: List[float] = Field(..., min_items=2, max_items=2)
    k: List[float] = Field(..., min_items=2, max_items=2)
    ph: List[float] = Field(..., min_items=2, max_items=2)
    temp: List[float] = Field(..., min_items=2, max_items=2)
    humidity: List[float] = Field(..., min_items=2, max_items=2)
    rain: List[float] = Field(..., min_items=2, max_items=2)

class CropCreate(BaseModel):
    name: str = Field(..., min_length=1)
    icon: str = Field(..., min_length=1)
    season: str = Field(..., min_length=1)
    water_need: str = Field(..., min_length=1)
    growth_period: str = Field(..., min_length=1)
    description: str = Field(..., min_length=1)
    ideal: IdealConditions

class CommodityCreate(BaseModel):
    id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    icon: str = Field(..., min_length=1)
    unit: str = Field(..., min_length=1)
    category: str = Field(..., min_length=1)
    base_price: float = Field(..., gt=0)
    mandi: str = Field(..., min_length=1)


def clean_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Helper to sanitize MongoDB _id for JSON output."""
    if not doc:
        return doc
    new_doc = dict(doc)
    if "_id" in new_doc:
        new_doc["_id"] = str(new_doc["_id"])
    return new_doc


@router.get("/crops")
async def get_crops():
    """Fetch the crops dataset. Seeds the database if empty."""
    db = get_db()
    count = await db["crop_dataset"].count_documents({})
    if count == 0:
        await db["crop_dataset"].insert_many(CROP_SEED_DATA)
    
    crops = await db["crop_dataset"].find({}).to_list(length=100)
    return [clean_doc(c) for c in crops]


@router.post("/crops")
async def add_crop(crop: CropCreate):
    """Add a new crop to the dynamic dataset."""
    db = get_db()
    # Check duplicate name
    existing = await db["crop_dataset"].find_one({"name": {"$regex": f"^{crop.name}$", "$options": "i"}})
    if existing:
        raise HTTPException(status_code=400, detail=f"Crop with name '{crop.name}' already exists.")
    
    doc = crop.model_dump()
    result = await db["crop_dataset"].insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc


@router.get("/commodities")
async def get_commodities():
    """Fetch the commodity dataset. Seeds the database if empty."""
    db = get_db()
    count = await db["commodity_dataset"].count_documents({})
    if count == 0:
        await db["commodity_dataset"].insert_many(COMMODITY_SEED_DATA)
    
    commodities = await db["commodity_dataset"].find({}).to_list(length=100)
    return [clean_doc(c) for c in commodities]


@router.post("/commodities")
async def add_commodity(commodity: CommodityCreate):
    """Register a new commodity in the database."""
    db = get_db()
    # Check duplicate id
    existing = await db["commodity_dataset"].find_one({"id": commodity.id.lower()})
    if existing:
        raise HTTPException(status_code=400, detail=f"Commodity with ID '{commodity.id}' already exists.")
    
    doc = commodity.model_dump()
    doc["id"] = doc["id"].lower()
    result = await db["commodity_dataset"].insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc

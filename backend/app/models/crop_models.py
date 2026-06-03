from pydantic import BaseModel, Field
from typing import Optional


class CropRecommendationRequest(BaseModel):
    nitrogen: float = Field(..., ge=0, le=200, description="Nitrogen content (kg/ha)")
    phosphorus: float = Field(..., ge=0, le=200, description="Phosphorus content (kg/ha)")
    potassium: float = Field(..., ge=0, le=200, description="Potassium content (kg/ha)")
    ph: float = Field(..., ge=0, le=14, description="Soil pH level")
    rainfall: float = Field(..., ge=0, le=500, description="Annual rainfall (mm)")
    temperature: float = Field(..., ge=-10, le=60, description="Average temperature (°C)")
    humidity: float = Field(..., ge=0, le=100, description="Average humidity (%)")
    soil_type: Optional[str] = Field(None, description="Soil type (e.g., Loamy, Sandy, Clay)")
    season: Optional[str] = Field(None, description="Season (Kharif, Rabi, Zaid)")


class CropResult(BaseModel):
    name: str
    confidence: float = Field(..., ge=0, le=100)
    season: str
    water_need: str  # Low, Medium, High
    growth_period: str
    description: str
    icon: str  # emoji


class FertilizerRecommendation(BaseModel):
    nitrogen_needed: float
    phosphorus_needed: float
    potassium_needed: float
    suggestion: str

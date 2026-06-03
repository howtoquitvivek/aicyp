from fastapi import APIRouter
from app.models.crop_models import CropRecommendationRequest
from app.services.crop_service import recommend_crops

router = APIRouter(prefix="/api/crops", tags=["crops"])


@router.post("/recommend")
async def get_recommendations(req: CropRecommendationRequest):
    """Get crop recommendations based on soil and climate inputs."""
    results = await recommend_crops(
        nitrogen=req.nitrogen,
        phosphorus=req.phosphorus,
        potassium=req.potassium,
        ph=req.ph,
        rainfall=req.rainfall,
        temperature=req.temperature,
        humidity=req.humidity,
    )
    return {
        "recommendations": results,
        "input_summary": {
            "nitrogen": req.nitrogen,
            "phosphorus": req.phosphorus,
            "potassium": req.potassium,
            "ph": req.ph,
            "rainfall": req.rainfall,
            "temperature": req.temperature,
            "humidity": req.humidity,
            "soil_type": req.soil_type,
            "season": req.season,
        },
    }

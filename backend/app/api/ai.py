from fastapi import APIRouter, Depends
from typing import Dict, Any
from app.services.ai_insights_service import ai_insights_service

router = APIRouter(
    prefix="/api/ai",
    tags=["ai"],
)

@router.post("/plot-insights")
async def generate_plot_insights(plot_data: Dict[str, Any]):
    """
    Generate plot-specific insights using Groq AI.
    Falls back to deterministic rules if Groq is unavailable.
    """
    return await ai_insights_service.get_plot_insights(plot_data)

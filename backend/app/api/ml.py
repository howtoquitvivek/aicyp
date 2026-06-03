from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any
from app.services.yield_ml_service import yield_ml_service

router = APIRouter(
    prefix="/api/ml",
    tags=["Machine Learning"]
)

@router.post("/predict-yield")
async def predict_yield_endpoint(features: Dict[str, Any] = Body(...)):
    """
    Generate a machine learning yield prediction using the trained RandomForestRegressor.
    Expects input features like: crop, state, area, temperature, rainfall, humidity, N, P, K, ph, soil, irrigation, season.
    """
    try:
        prediction = yield_ml_service.predict_yield(features)
        if "error" in prediction:
            raise HTTPException(status_code=400, detail=prediction["error"])
        return prediction
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

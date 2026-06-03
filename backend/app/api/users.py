from fastapi import APIRouter, HTTPException, Header
from typing import Optional
from pydantic import BaseModel
from app.services.user_service import get_user, upsert_profile, upsert_farm, upsert_preferences, add_yield_plan, add_recommendation

router = APIRouter(prefix="/api/users", tags=["users"])


# ── Request Schemas ──────────────────────────────────────────
class ProfilePayload(BaseModel):
    display_name: Optional[str] = ""
    phone: Optional[str] = ""
    state: Optional[str] = ""
    district: Optional[str] = ""
    village: Optional[str] = ""


class FarmPayload(BaseModel):
    farm_name: Optional[str] = ""
    area: Optional[str] = ""
    soil_type: Optional[str] = ""
    irrigation_type: Optional[str] = "Drip"
    crops: Optional[str] = ""
    plots: Optional[list] = []
    soil_n: Optional[str] = ""
    soil_p: Optional[str] = ""
    soil_k: Optional[str] = ""
    soil_ph: Optional[str] = ""
    canvasLayout: Optional[list] = []


class PreferencesPayload(BaseModel):
    language: Optional[str] = "English"
    experience_level: Optional[str] = ""
    farming_goal: Optional[str] = ""
    crop_interests: Optional[list] = []
    notifications: Optional[bool] = True
    email_alerts: Optional[bool] = True
    price_alerts: Optional[bool] = True
    weather_alerts: Optional[bool] = True
    weekly_report: Optional[bool] = False

class PlanPayload(BaseModel):
    plotId: Optional[str] = None
    crop: str
    area: float
    expected_yield: float
    expected_revenue: float
    seed_quality: float
    water_efficiency: float
    fertilizer_level: float
    risk_score: float


class RecommendationPayload(BaseModel):
    plotId: Optional[str] = None
    crop: str
    confidence: float
    nitrogen: float
    phosphorus: float
    potassium: float
    ph: float
    soil_type: Optional[str] = None

# ── Helper: extract UID from header ──────────────────────────
# In production, verify the Firebase ID token.
# For now, the frontend sends the UID in an x-uid header.
def _get_uid(x_uid: Optional[str] = Header(None)) -> str:
    if not x_uid:
        raise HTTPException(status_code=401, detail="Missing x-uid header")
    return x_uid


# ── Endpoints ────────────────────────────────────────────────
@router.get("/me")
async def get_me(x_uid: Optional[str] = Header(None)):
    """Get the current user's full document."""
    uid = _get_uid(x_uid)
    doc = await get_user(uid)
    if not doc:
        return {"_id": uid, "profile": {}, "farm": {}, "preferences": {}}
    return doc


@router.put("/me/profile")
async def update_profile(payload: ProfilePayload, x_uid: Optional[str] = Header(None)):
    """Save/update profile info."""
    uid = _get_uid(x_uid)
    doc = await upsert_profile(uid, payload.model_dump())
    return doc


@router.put("/me/farm")
async def update_farm(payload: FarmPayload, x_uid: Optional[str] = Header(None)):
    """Save/update farm configuration."""
    uid = _get_uid(x_uid)
    doc = await upsert_farm(uid, payload.model_dump())
    return doc


@router.put("/me/preferences")
async def update_preferences(payload: PreferencesPayload, x_uid: Optional[str] = Header(None)):
    """Save/update notification preferences."""
    uid = _get_uid(x_uid)
    doc = await upsert_preferences(uid, payload.model_dump())
    return doc

@router.post("/me/plans")
async def save_plan(payload: PlanPayload, x_uid: Optional[str] = Header(None)):
    """Save a yield plan."""
    uid = _get_uid(x_uid)
    doc = await add_yield_plan(uid, payload.model_dump())
    return doc
@router.post("/me/recommendations")
async def save_recommendation(payload: RecommendationPayload, x_uid: Optional[str] = Header(None)):
    """Save a crop recommendation."""
    uid = _get_uid(x_uid)
    doc = await add_recommendation(uid, payload.model_dump())
    return doc
class FirstViewPayload(BaseModel):
    plotId: str
    view_type: str # 'weather' or 'market'

@router.post("/me/timeline/first_view")
async def log_first_view(payload: FirstViewPayload, x_uid: Optional[str] = Header(None)):
    """Log a timeline event only if this view type hasn't been logged yet for this plot."""
    uid = _get_uid(x_uid)
    from app.services.user_service import get_user, add_timeline_event
    doc = await get_user(uid)
    if not doc:
        return {"success": False}
        
    timeline = doc.get("timeline", [])
    event_type = f"first_{payload.view_type}_view"
    
    # Check if already viewed
    for event in timeline:
        if event.get("type") == event_type and event.get("plotId") == payload.plotId:
            return {"success": True, "logged": False, "message": "Already viewed"}
            
    # Find plot name
    plot_name = "Plot"
    if "farm" in doc and "plots" in doc["farm"]:
        for p in doc["farm"]["plots"]:
            if p.get("id") == payload.plotId:
                plot_name = p.get("name", "Plot")
                break
                
    summary = f"First weather analysis viewed" if payload.view_type == "weather" else f"First market analysis viewed"
    await add_timeline_event(uid, payload.plotId, plot_name, event_type, summary)
    
    return {"success": True, "logged": True}

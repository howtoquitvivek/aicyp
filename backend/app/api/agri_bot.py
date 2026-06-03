from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional

from app.services.agri_bot_service import AgriBotService

router = APIRouter(prefix="/api/agribot", tags=["AgriBot"])
agri_bot_service = AgriBotService()

class ChatRequest(BaseModel):
    question: str
    activePlotId: str
    chatHistory: List[Dict[str, str]] = []
    action: Optional[str] = "chat"

@router.post("/chat")
async def chat_endpoint(request: ChatRequest, x_user_id: str = Header(...)):
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    try:
        response = await agri_bot_service.chat(
            uid=x_user_id,
            active_plot_id=request.activePlotId,
            question=request.question,
            history=request.chatHistory,
            action=request.action
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

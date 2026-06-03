from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.api.weather import router as weather_router
from app.api.crops import router as crops_router
from app.api.market import router as market_router
from app.api.users import router as users_router
from app.api.datasets import router as datasets_router
from app.api.ai import router as ai_router
from app.api.agri_bot import router as agri_bot_router
from app.api.ml import router as ml_router
from app.core.database import ping_db, close_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle — verify MongoDB connection."""
    try:
        await ping_db()
        print("✅ MongoDB connected successfully")
    except Exception as e:
        print(f"⚠️  MongoDB connection failed: {e}")
    yield
    await close_db()
    print("🔌 MongoDB connection closed")


app = FastAPI(
    title="Smart Farming Platform API",
    description="Backend for the AI-powered smart farming platform.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(weather_router)
app.include_router(crops_router)
app.include_router(market_router)
app.include_router(users_router)
app.include_router(datasets_router)
app.include_router(ai_router)
app.include_router(agri_bot_router)
app.include_router(ml_router)


@app.get("/")
def read_root():
    return {"status": "ok", "message": "Smart Farming Platform API is running"}

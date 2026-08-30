from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
import os

load_dotenv()

from routers import upload, analyze
from services.modal_client import check_modal_health

DEFAULT_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]


def get_allowed_origins():
    extra_origins = [
        origin.strip()
        for origin in os.getenv("CORS_ALLOW_ORIGINS", "").split(",")
        if origin.strip()
    ]
    return list(dict.fromkeys(DEFAULT_ALLOWED_ORIGINS + extra_origins))

app = FastAPI(
    title="MedGemma Analyzer API",
    description="API for medical image analysis using MedGemma",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads directory for serving images
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Include routers
app.include_router(upload.router, prefix="/api", tags=["upload"])
app.include_router(analyze.router, prefix="/api", tags=["analyze"])


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "medgemma-analyzer"}


@app.get("/api/status")
async def service_status():
    """Combined backend + Modal status for the frontend."""
    modal_configured = bool(os.getenv("MODAL_ENDPOINT_URL", "").strip())
    modal_reachable = await check_modal_health() if modal_configured else False
    return {
        "backend_status": "healthy",
        "modal_configured": modal_configured,
        "modal_reachable": modal_reachable,
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "MedGemma Analyzer API",
        "docs": "/docs",
        "health": "/api/health"
    }

# ──────────────────────────────────────────────
# NeuroSense ML Service — FastAPI Entry Point
# ──────────────────────────────────────────────

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import init_db
from app.routes.screening import router as screening_router
from app.routes.users import router as users_router

# ── Logging ─────────────────────────────────────
logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s │ %(levelname)-8s │ %(name)s │ %(message)s",
)
logger = logging.getLogger(__name__)

# ── App ─────────────────────────────────────────
app = FastAPI(
    title="NeuroSense ML Service",
    description=(
        "AI-powered dementia screening microservice. "
        "Called by the main Node.js backend to run ML inference."
    ),
    version="0.1.0",
)

# ── CORS (allow Node.js backend & frontend) ─────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ─────────────────────────────────────
app.include_router(screening_router)
app.include_router(users_router)


# ── Root health check ───────────────────────────
@app.get("/")
async def root():
    return {"status": "ok", "service": "neurosense-ml"}


# ── Startup event ───────────────────────────────
@app.on_event("startup")
async def on_startup():
    init_db()
    logger.info(
        "🧠 NeuroSense ML Service starting on port %s (debug=%s)",
        settings.ml_service_port,
        settings.debug,
    )

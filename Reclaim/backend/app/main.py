import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.core.config import settings
from app.core.database import init_db
from app.core.queue import event_queue
from app.api import (
    cases_router,
    dashboard_router,
    webhooks_router,
    simulation_router,
    audit_router,
    agents_router,
    policy_router,
)

# Logging configuration
logging.basicConfig(
    level=logging.INFO if settings.DEBUG else logging.WARNING,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Reclaim Database & Tables...")
    await init_db()
    logger.info("Database initialized successfully.")
    
    logger.info("Initializing Event Queue...")
    await event_queue.initialize()
    logger.info("Reclaim Backend started and ready to recover revenue.")
    yield
    logger.info("Shutting down Reclaim Backend...")


app = FastAPI(
    title="Reclaim API",
    description="Autonomous Revenue Recovery Agent for Razorpay Merchants",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Middleware (allows Vercel frontend or any origin to call the API without preflight rejections)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers under /api
app.include_router(cases_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(webhooks_router, prefix="/api")
app.include_router(simulation_router, prefix="/api")
app.include_router(audit_router, prefix="/api")
app.include_router(agents_router, prefix="/api")
app.include_router(policy_router, prefix="/api")


@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "database": "connected",
    }


# Mount built React frontend if dist directory exists
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_frontend(full_path: str):
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
else:
    @app.get("/", tags=["Root"])
    async def root():
        return {
            "name": "Reclaim Autonomous Revenue Recovery Agent",
            "version": "1.0.0",
            "docs": "/docs",
            "health": "/health",
            "tagline": "We didn't build an AI that tells a merchant what to do — we built an agent that recovers money itself, inside defined boundaries, and can prove exactly how much it recovered."
        }

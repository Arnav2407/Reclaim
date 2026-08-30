from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.analytics import DashboardMetricsResponse
from app.services.analytics_service import analytics_service

router = APIRouter(prefix="/dashboard", tags=["Dashboard & Analytics"])


@router.get("/metrics", response_model=DashboardMetricsResponse)
async def get_dashboard_metrics(
    db: AsyncSession = Depends(get_db),
):
    return await analytics_service.get_dashboard_metrics(db)

from pydantic import BaseModel
from typing import Dict, List, Any


class StrategyStat(BaseModel):
    strategy: str
    channel: str
    total_attempts: int
    successful_recoveries: int
    revenue_recovered: float
    recovery_rate: float
    avg_recovery_minutes: float


class FunnelStage(BaseModel):
    stage: str
    count: int
    amount: float


class DashboardMetricsResponse(BaseModel):
    total_revenue_at_risk: float
    total_revenue_recovered: float
    recovery_rate_pct: float
    total_cases_identified: int
    recovered_cases_count: int
    in_progress_cases_count: int
    escalated_cases_count: int
    stopped_cases_count: int
    avg_recovery_time_hours: float
    cases_by_type: Dict[str, int]
    revenue_by_type: Dict[str, float]
    strategy_performance: List[StrategyStat]
    funnel: List[FunnelStage]
    stopping_reasons_breakdown: Dict[str, int]

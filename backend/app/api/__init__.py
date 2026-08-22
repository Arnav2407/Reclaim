from app.api.cases import router as cases_router
from app.api.dashboard import router as dashboard_router
from app.api.webhooks import router as webhooks_router
from app.api.simulation import router as simulation_router
from app.api.audit import router as audit_router
from app.api.agents import router as agents_router
from app.api.policy import router as policy_router

__all__ = [
    "cases_router",
    "dashboard_router",
    "webhooks_router",
    "simulation_router",
    "audit_router",
    "agents_router",
    "policy_router",
]

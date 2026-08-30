import logging
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.core.database import get_db, Base, engine
from app.models.customer import Customer
from app.models.order import Order
from app.models.payment import Payment
from app.models.recovery_case import RecoveryCase
from app.models.recovery_attempt import RecoveryAttempt
from app.models.agent_decision import AgentDecision
from app.models.policy_check import PolicyCheck
from app.models.communication_log import CommunicationLog
from app.models.webhook_event import WebhookEvent

from app.simulator.generator import generate_synthetic_dataset
from app.services.recovery_runner import recovery_runner
from app.services.analytics_service import analytics_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/simulation", tags=["Batch Simulation"])


@router.post("/generate-batch")
async def generate_batch_cases(
    count: int = Query(500, ge=10, le=1000),
    db: AsyncSession = Depends(get_db),
):
    """
    Generates synthetic cases across the 4 failure sources totaling ₹15L–20L.
    """
    dataset = generate_synthetic_dataset(total_cases=count)

    created_cases = 0
    total_revenue_at_risk = 0.0

    for item in dataset:
        customer = Customer(
            external_id=f"cust_{item['customer_email'].split('@')[0]}",
            name=item["customer_name"],
            email=item["customer_email"],
            phone=item["customer_phone"],
            ltv=item["customer_ltv"],
            total_orders=item["total_orders"],
            successful_orders=item["successful_orders"],
            preferred_method=item["preferred_method"],
            language_preference=item["language_preference"],
            opt_out=item["opt_out"],
            has_active_dispute=item["has_active_dispute"],
        )
        db.add(customer)
        await db.flush()

        order = Order(
            external_id=f"order_{customer.id}_{created_cases}",
            customer_id=customer.id,
            amount=item["amount"],
            status="failed",
        )
        db.add(order)
        await db.flush()

        case = RecoveryCase(
            external_id=f"case_{order.external_id}",
            case_type=item["case_type"],
            status="open",
            amount=item["amount"],
            customer_id=customer.id,
            order_id=order.id,
            failure_reason=item["failure_reason"],
        )
        db.add(case)
        created_cases += 1
        total_revenue_at_risk += item["amount"]

    await db.commit()

    return {
        "status": "success",
        "cases_created": created_cases,
        "total_revenue_at_risk": round(total_revenue_at_risk, 2),
        "formatted_revenue": f"₹{total_revenue_at_risk/100000:.2f} Lakhs",
        "message": f"Successfully loaded {created_cases} recovery cases totaling ₹{total_revenue_at_risk/100000:.2f}L into recovery_cases."
    }


@router.post("/run-batch")
async def run_batch_simulation(
    limit: int = Query(500, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
):
    """
    Executes autonomous recovery across all open cases, simulating customer outcomes
    and performing intelligent replanning on failed initial attempts.
    """
    # Fetch all open/in_progress cases
    stmt = (
        select(RecoveryCase.id)
        .where(RecoveryCase.status.in_(["open", "in_progress"]))
        .limit(limit)
    )
    res = await db.execute(stmt)
    case_ids = res.scalars().all()

    processed_count = 0
    results_summary = {"recovered": 0, "escalated": 0, "stopped": 0, "in_progress": 0}

    for cid in case_ids:
        # First attempt
        res1 = await recovery_runner.process_case(db=db, case_id=cid, simulate_outcome=True)
        processed_count += 1
        status = res1.get("case_status") or res1.get("status")

        # If in_progress (attempt 1 failed), trigger replanning on attempt 2
        if status == "in_progress":
            res2 = await recovery_runner.process_case(db=db, case_id=cid, simulate_outcome=True)
            status = res2.get("case_status") or res2.get("status")

            # If still in_progress, trigger attempt 3
            if status == "in_progress":
                res3 = await recovery_runner.process_case(db=db, case_id=cid, simulate_outcome=True)
                status = res3.get("case_status") or res3.get("status")

        if status in results_summary:
            results_summary[status] += 1

    metrics = await analytics_service.get_dashboard_metrics(db)

    return {
        "status": "completed",
        "processed_cases": processed_count,
        "results_summary": results_summary,
        "metrics": metrics,
    }


@router.post("/reset")
async def reset_database(
    db: AsyncSession = Depends(get_db),
):
    """
    Clears all tables for fresh batch simulation runs.
    """
    await db.execute(delete(CommunicationLog))
    await db.execute(delete(PolicyCheck))
    await db.execute(delete(AgentDecision))
    await db.execute(delete(RecoveryAttempt))
    await db.execute(delete(RecoveryCase))
    await db.execute(delete(Payment))
    await db.execute(delete(Order))
    await db.execute(delete(Customer))
    await db.execute(delete(WebhookEvent))
    await db.commit()

    return {"status": "success", "message": "All database tables successfully reset."}

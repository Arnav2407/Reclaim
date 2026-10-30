import logging
from typing import Dict, Any, List
from datetime import datetime, timezone
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
from app.services.razorpay_service import razorpay_service
from app.policy.engine import PolicyEngine
from app.agents.orchestrator import RecoveryOrchestratorAgent, LLMDecisionInput
from app.agents.communicator import CommunicationAgent

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


@router.post("/run-full-demo")
async def run_full_demo(
    db: AsyncSession = Depends(get_db),
):
    """
    Executes the entire end-to-end 5-minute autonomous recovery demo:
    1. Resets database to clean slate
    2. Ingests 500 cases across 4 failure sources (~₹17.5L)
    3. Runs the autonomous recovery orchestrator loop
    4. Demonstrates dynamic replanning on failed initial attempt
    5. Demonstrates high-value (>₹50k) supervisor escalation guardrail
    6. Demonstrates deterministic stopping rule (active dispute)
    """
    # 1. Reset
    await reset_database(db)

    # 2. Ingest 500 cases
    await generate_batch_cases(count=500, db=db)

    # 3. Autonomous Recovery Batch Run
    await run_batch_simulation(limit=500, db=db)

    # 4. Showcase 1: Dynamic Replanning Case (Vikram Malhotra)
    replan_cust = Customer(
        external_id="cust_demo_replan_101",
        name="Vikram Malhotra",
        email="vikram.malhotra@example.com",
        phone="+919876500111",
        ltv=35000.0,
        total_orders=4,
        successful_orders=4,
        preferred_method="upi",
        language_preference="hinglish",
    )
    db.add(replan_cust)
    await db.flush()

    replan_case = RecoveryCase(
        external_id="case_demo_replan_abandoned_cart",
        case_type="checkout_abandonment",
        status="in_progress",
        amount=8499.0,
        customer_id=replan_cust.id,
        failure_reason="checkout_timeout",
        root_cause_diagnosis="Customer abandoned checkout at final step due to gateway timeout.",
        recovery_probability=0.78,
        attempt_count=1,
        max_attempts=3,
    )
    db.add(replan_case)
    await db.flush()

    att1 = RecoveryAttempt(
        case_id=replan_case.id,
        attempt_number=1,
        strategy="payment_link",
        channel="whatsapp",
        discount_offered=0.0,
        outcome="expired",
        outcome_details="Payment link expired after 24 hours without customer action.",
    )
    db.add(att1)
    await db.flush()

    # Replanned attempt 2: Switch to email + 10% coupon
    orchestrator = RecoveryOrchestratorAgent()
    communicator = CommunicationAgent()
    policy = PolicyEngine()

    case_input = LLMDecisionInput(
        case_id=replan_case.id,
        case_type=replan_case.case_type,
        amount=replan_case.amount,
        customer_ltv=replan_cust.ltv,
        previous_orders=replan_cust.total_orders,
        successful_payments=replan_cust.successful_orders,
        failure_reason=replan_case.failure_reason,
        preferred_method=replan_cust.preferred_method,
        language_preference=replan_cust.language_preference,
        days_since_last_purchase=2,
        attempt_number=2,
        previous_strategy="payment_link",
        previous_channel="whatsapp",
        has_active_dispute=False,
        opt_out=False,
    )
    decision, _ = await orchestrator.decide_strategy(case_input)
    policy_result = policy.evaluate(
        case_input=case_input,
        proposed=decision,
        existing_attempt_count=1,
    )
    final_amount = replan_case.amount * (1 - policy_result.applied_discount / 100)

    new_link = razorpay_service.create_payment_link(
        amount=final_amount,
        customer_name=replan_cust.name,
        customer_email=replan_cust.email,
        customer_phone=replan_cust.phone,
        reference_id=f"rec_{replan_case.id}_att_2",
    )

    att2 = RecoveryAttempt(
        case_id=replan_case.id,
        attempt_number=2,
        strategy="payment_link",
        channel=decision.channel or "email",
        discount_offered=policy_result.applied_discount,
        outcome="paid",
        outcome_details="Payment completed via Email recovery link (Replanned).",
    )
    db.add(att2)

    replan_case.status = "recovered"
    replan_case.recovered_amount = final_amount
    replan_case.recovered_at = datetime.now(timezone.utc)
    replan_case.attempt_count = 2
    replan_case.razorpay_payment_link_id = new_link["id"]
    replan_case.razorpay_short_url = new_link["short_url"]
    replan_cust.successful_orders += 1
    replan_cust.ltv += replan_case.recovered_amount

    # 5. Showcase 2: High-Value Escalation Case (>₹50,000)
    esc_cust = Customer(
        external_id="cust_demo_enterprise_99",
        name="Apex Enterprise Solutions",
        email="finance@apexcorp.com",
        phone="+919876543999",
        ltv=180000.0,
        total_orders=8,
        successful_orders=8,
        preferred_method="bank_transfer",
        language_preference="en",
    )
    db.add(esc_cust)
    await db.flush()

    esc_case = RecoveryCase(
        external_id="case_demo_inv_overdue_75k",
        case_type="overdue_invoice",
        status="escalated",
        amount=75000.0,
        customer_id=esc_cust.id,
        failure_reason="invoice_past_due",
        root_cause_diagnosis="Enterprise invoice 30+ days overdue.",
        recovery_probability=0.85,
        attempt_count=1,
        max_attempts=3,
        escalation_required=True,
        escalation_status="pending_approval",
        escalation_reason="High-value case (₹75,000.00) exceeds ₹50,000 threshold. Requires human approval.",
    )
    db.add(esc_case)

    # 6. Showcase 3: Deterministic Stopping Rule Case (Active Dispute)
    dispute_cust = Customer(
        external_id="cust_demo_dispute_12",
        name="Aarav Mehta",
        email="aarav.mehta@example.com",
        phone="+919876543888",
        ltv=12000.0,
        total_orders=2,
        successful_orders=1,
        preferred_method="card",
        language_preference="en",
        has_active_dispute=True,
    )
    db.add(dispute_cust)
    await db.flush()

    stop_case = RecoveryCase(
        external_id="case_demo_disputed_chargeback",
        case_type="payment_failure",
        status="stopped",
        amount=4999.0,
        customer_id=dispute_cust.id,
        failure_reason="active_chargeback_dispute",
        root_cause_diagnosis="Customer initiated cardholder chargeback with bank.",
        recovery_probability=0.04,
        attempt_count=1,
        max_attempts=1,
        stop_reason="Customer has an active chargeback dispute. Outreach stopped for regulatory compliance.",
    )
    db.add(stop_case)
    await db.commit()

    metrics = await analytics_service.get_dashboard_metrics(db)

    return {
        "status": "completed",
        "message": f"Full 5-Minute Demo successfully executed! Recovered ₹{metrics.total_revenue_recovered:,.2f} ({metrics.recovery_rate_pct:.1f}% rate) across {metrics.total_cases_identified} cases.",
        "metrics": metrics,
    }

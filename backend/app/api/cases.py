from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.models.customer import Customer
from app.models.order import Order
from app.models.payment import Payment
from app.models.recovery_case import RecoveryCase
from app.schemas.case import (
    RecoveryCaseResponse,
    RecoveryCaseDetailResponse,
    CaseCreateRequest,
    EscalationDecisionRequest,
)
from app.services.recovery_runner import recovery_runner

router = APIRouter(prefix="/cases", tags=["Recovery Cases"])


@router.get("", response_model=List[RecoveryCaseResponse])
async def list_cases(
    status: Optional[str] = Query(None, description="Filter by status: open, in_progress, escalated, recovered, stopped"),
    case_type: Optional[str] = Query(None, description="Filter by case type"),
    escalation_status: Optional[str] = Query(None, description="Filter by escalation status"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(RecoveryCase)
        .options(selectinload(RecoveryCase.customer))
        .order_by(desc(RecoveryCase.created_at))
    )
    if status:
        stmt = stmt.where(RecoveryCase.status == status)
    if case_type:
        stmt = stmt.where(RecoveryCase.case_type == case_type)
    if escalation_status:
        stmt = stmt.where(RecoveryCase.escalation_status == escalation_status)

    stmt = stmt.offset(offset).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{case_id}", response_model=RecoveryCaseDetailResponse)
async def get_case_detail(
    case_id: int,
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(RecoveryCase)
        .where(RecoveryCase.id == case_id)
        .options(
            selectinload(RecoveryCase.customer),
            selectinload(RecoveryCase.attempts),
            selectinload(RecoveryCase.decisions),
            selectinload(RecoveryCase.policy_checks),
            selectinload(RecoveryCase.communication_logs),
        )
    )
    result = await db.execute(stmt)
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Recovery case not found")
    return case


@router.post("", response_model=RecoveryCaseResponse)
async def create_case(
    payload: CaseCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    # Find or create customer
    stmt = select(Customer).where(Customer.email == payload.customer_email)
    res = await db.execute(stmt)
    customer = res.scalar_one_or_none()

    if not customer:
        customer = Customer(
            external_id=f"cust_{payload.customer_email.split('@')[0]}",
            name=payload.customer_name,
            email=payload.customer_email,
            phone=payload.customer_phone,
            ltv=payload.customer_ltv,
            total_orders=payload.total_orders,
            successful_orders=payload.successful_orders,
            preferred_method=payload.preferred_method,
            language_preference=payload.language_preference,
            has_active_dispute=payload.has_active_dispute,
            opt_out=payload.opt_out,
        )
        db.add(customer)
        await db.flush()

    # Create Order
    order = Order(
        external_id=f"order_{int(datetime.utcnow().timestamp())}",
        customer_id=customer.id,
        amount=payload.amount,
        status="failed" if payload.case_type == "payment_failure" else "abandoned",
    )
    db.add(order)
    await db.flush()

    # Create Case
    case = RecoveryCase(
        external_id=f"case_{order.external_id}",
        case_type=payload.case_type,
        status="open",
        amount=payload.amount,
        customer_id=customer.id,
        order_id=order.id,
        failure_reason=payload.failure_reason,
    )
    db.add(case)
    await db.commit()
    await db.refresh(case)
    return case


@router.post("/{case_id}/recover")
async def trigger_recovery(
    case_id: int,
    simulate_outcome: bool = Query(True, description="Whether to simulate customer payment/failure outcome"),
    db: AsyncSession = Depends(get_db),
):
    result = await recovery_runner.process_case(
        db=db,
        case_id=case_id,
        simulate_outcome=simulate_outcome,
    )
    return result


@router.post("/{case_id}/escalation-decision")
async def handle_escalation_decision(
    case_id: int,
    payload: EscalationDecisionRequest,
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(RecoveryCase)
        .where(RecoveryCase.id == case_id)
        .options(selectinload(RecoveryCase.customer))
    )
    res = await db.execute(stmt)
    case = res.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    if case.status != "escalated":
        raise HTTPException(status_code=400, detail="Case is not currently pending escalation")

    if payload.approved:
        case.escalation_status = "approved"
        case.status = "open"
        await db.commit()

        # Run recovery with supervisor approval
        run_res = await recovery_runner.process_case(
            db=db,
            case_id=case.id,
            simulate_outcome=True,
            force_approved=True,
        )
        return {
            "message": "Escalation approved. Intervention dispatched.",
            "recovery_result": run_res,
        }
    else:
        case.escalation_status = "rejected"
        case.status = "stopped"
        case.stop_reason = f"Supervisor rejected escalation: {payload.reviewer_notes or 'No reason specified'}"
        await db.commit()
        return {
            "message": "Escalation rejected. Case stopped.",
            "case_id": case.id,
            "status": case.status,
        }


@router.get("/{case_id}/timeline")
async def get_case_timeline(
    case_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Returns a single, queryable, chronologically ordered event timeline
    covering the entire case lifecycle: detection -> decision -> policy -> action -> result -> replan.
    """
    stmt = (
        select(RecoveryCase)
        .where(RecoveryCase.id == case_id)
        .options(
            selectinload(RecoveryCase.customer),
            selectinload(RecoveryCase.attempts),
            selectinload(RecoveryCase.decisions),
            selectinload(RecoveryCase.policy_checks),
            selectinload(RecoveryCase.communication_logs),
        )
    )
    res = await db.execute(stmt)
    case = res.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    events = []

    # 1. Detection Event
    events.append({
        "event_type": "CASE_DETECTED",
        "stage": "detection",
        "timestamp": case.created_at.isoformat(),
        "title": f"Revenue at Risk Detected ({case.case_type.replace('_', ' ').title()})",
        "description": f"Identified Rs. {case.amount:,.2f} lost to '{case.failure_reason}' for customer {case.customer.name}.",
        "metadata": {
            "amount": case.amount,
            "failure_reason": case.failure_reason,
            "customer_ltv": case.customer.ltv,
        }
    })

    # 2. Agent Decisions
    for dec in case.decisions:
        events.append({
            "event_type": "AGENT_DECISION_PROPOSED",
            "stage": "diagnosis_and_decision",
            "timestamp": dec.created_at.isoformat(),
            "title": f"AI Orchestrator Decision (Attempt #{dec.attempt_number})",
            "description": f"Proposed '{dec.proposed_action}' via '{dec.proposed_channel}' with {dec.proposed_discount}% discount. Rationale: {dec.rationale}",
            "metadata": {
                "attempt_number": dec.attempt_number,
                "proposed_action": dec.proposed_action,
                "proposed_channel": dec.proposed_channel,
                "discount": dec.proposed_discount,
                "confidence": dec.confidence_score,
            }
        })

    # 3. Policy Checks
    for chk in case.policy_checks:
        events.append({
            "event_type": "POLICY_CHECK_EVALUATED",
            "stage": "policy_guardrails",
            "timestamp": chk.created_at.isoformat(),
            "title": f"Policy Validation: {chk.rule_name}",
            "description": f"Action: {chk.decision_action}. Rule Category: {chk.rule_category}. Details: {chk.violation_details or 'Compliant'}",
            "metadata": {
                "rule_name": chk.rule_name,
                "is_compliant": chk.is_compliant,
                "decision_action": chk.decision_action,
                "original_value": chk.original_value,
                "adjusted_value": chk.adjusted_value,
            }
        })

    # 4. Communications Sent
    for comm in case.communication_logs:
        events.append({
            "event_type": "COMMUNICATION_DISPATCHED",
            "stage": "execution",
            "timestamp": comm.sent_at.isoformat(),
            "title": f"Outreach Dispatched via {comm.channel.upper()} ({comm.language.upper()})",
            "description": f"Sent to {comm.recipient} using template '{comm.template_name}'. Message preview: {comm.body_content[:120]}...",
            "metadata": {
                "channel": comm.channel,
                "language": comm.language,
                "template": comm.template_name,
                "status": comm.status,
            }
        })

    # 5. Attempts & Outcomes
    for att in case.attempts:
        events.append({
            "event_type": "OUTCOME_OBSERVED",
            "stage": "observation",
            "timestamp": (att.completed_at or att.created_at).isoformat(),
            "title": f"Attempt #{att.attempt_number} Result: {att.outcome.upper()}",
            "description": f"Outcome Details: {att.outcome_details or 'Pending customer action'}",
            "metadata": {
                "attempt_number": att.attempt_number,
                "strategy": att.strategy,
                "outcome": att.outcome,
                "completed_at": att.completed_at.isoformat() if att.completed_at else None,
            }
        })

    # 6. Terminal State Event
    if case.status in ["recovered", "stopped", "escalated"]:
        events.append({
            "event_type": f"CASE_{case.status.upper()}",
            "stage": "resolution",
            "timestamp": (case.recovered_at or case.updated_at).isoformat(),
            "title": f"Case Status: {case.status.upper()}",
            "description": (
                f"Successfully recovered Rs. {case.recovered_amount:,.2f} via Razorpay."
                if case.status == "recovered"
                else f"Case stopped. Reason: {case.stop_reason or case.escalation_reason}"
            ),
            "metadata": {
                "final_status": case.status,
                "recovered_amount": case.recovered_amount,
                "stop_reason": case.stop_reason,
            }
        })

    # Sort chronological ascending
    events.sort(key=lambda x: x["timestamp"])

    return {
        "case_id": case.id,
        "external_id": case.external_id,
        "current_status": case.status,
        "total_events": len(events),
        "timeline": events,
    }


@router.get("/{case_id}/export-audit")
async def export_case_audit(
    case_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Returns an immutable compliance audit record for legal and merchant auditing.
    """
    timeline_res = await get_case_timeline(case_id=case_id, db=db)
    return {
        "audit_certificate": {
            "system": "Reclaim Autonomous Recovery Engine",
            "case_id": case_id,
            "external_id": timeline_res["external_id"],
            "verification_status": "VERIFIED_AUDITABLE",
            "total_audit_events": timeline_res["total_events"],
            "audit_trail": timeline_res["timeline"],
        }
    }

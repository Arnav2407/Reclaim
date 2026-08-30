from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List, Dict, Any

from app.core.database import get_db
from app.models.agent_decision import AgentDecision
from app.models.policy_check import PolicyCheck
from app.models.recovery_attempt import RecoveryAttempt
from app.models.communication_log import CommunicationLog

router = APIRouter(prefix="/audit", tags=["Audit & Activity Feed"])


@router.get("/feed")
async def get_audit_feed(
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    # Fetch recent policy checks
    stmt_checks = select(PolicyCheck).order_by(desc(PolicyCheck.created_at)).limit(limit)
    res_checks = await db.execute(stmt_checks)
    checks = res_checks.scalars().all()

    # Fetch recent agent decisions
    stmt_decisions = select(AgentDecision).order_by(desc(AgentDecision.created_at)).limit(limit)
    res_decisions = await db.execute(stmt_decisions)
    decisions = res_decisions.scalars().all()

    # Fetch recent communications
    stmt_comms = select(CommunicationLog).order_by(desc(CommunicationLog.created_at)).limit(limit)
    res_comms = await db.execute(stmt_comms)
    comms = res_comms.scalars().all()

    # Compile merged chronological feed
    feed = []
    for c in checks:
        feed.append({
            "id": f"chk_{c.id}",
            "type": "policy_check",
            "case_id": c.case_id,
            "rule_name": c.rule_name,
            "rule_category": c.rule_category,
            "is_compliant": c.is_compliant,
            "decision_action": c.decision_action,
            "details": c.violation_details,
            "timestamp": c.created_at.isoformat(),
        })

    for d in decisions:
        feed.append({
            "id": f"dec_{d.id}",
            "type": "agent_decision",
            "case_id": d.case_id,
            "attempt_number": d.attempt_number,
            "proposed_action": d.proposed_action,
            "proposed_channel": d.proposed_channel,
            "confidence": d.confidence_score,
            "rationale": d.rationale,
            "timestamp": d.created_at.isoformat(),
        })

    for msg in comms:
        feed.append({
            "id": f"comm_{msg.id}",
            "type": "communication_sent",
            "case_id": msg.case_id,
            "channel": msg.channel,
            "recipient": msg.recipient,
            "language": msg.language,
            "preview": msg.body_content[:80] + "...",
            "timestamp": msg.sent_at.isoformat(),
        })

    # Sort descending by timestamp
    feed.sort(key=lambda x: x["timestamp"], reverse=True)
    return feed[:limit]

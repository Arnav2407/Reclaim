import json
import random
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.customer import Customer
from app.models.recovery_case import RecoveryCase
from app.models.recovery_attempt import RecoveryAttempt
from app.models.agent_decision import AgentDecision
from app.models.policy_check import PolicyCheck
from app.models.communication_log import CommunicationLog

from app.schemas.decision import LLMDecisionInput
from app.agents.orchestrator import recovery_orchestrator
from app.agents.communicator import communication_agent
from app.policy.engine import policy_engine
from app.services.razorpay_service import razorpay_service

logger = logging.getLogger(__name__)


class RecoveryRunner:
    """
    Autonomous Recovery Execution Engine:
    Coordinates Orchestrator -> Policy Engine -> Execution -> Replanning Loop.
    """

    async def process_case(
        self,
        db: AsyncSession,
        case_id: int,
        simulate_outcome: bool = False,
        force_approved: bool = False,
    ) -> Dict[str, Any]:
        """
        Executes one full cycle of the recovery workflow for a single case.
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
        result = await db.execute(stmt)
        case = result.scalar_one_or_none()

        if not case:
            return {"status": "error", "message": f"Case #{case_id} not found"}

        if case.status in ["recovered", "stopped"]:
            return {
                "status": "already_resolved",
                "case_id": case.id,
                "case_status": case.status,
                "message": f"Case #{case_id} is already in terminal state: {case.status}"
            }

        customer = case.customer
        attempt_number = case.attempt_count + 1

        # Check previous attempt strategies for replanning context
        previous_strategy = case.attempts[-1].strategy if case.attempts else None
        previous_channel = case.attempts[-1].channel if case.attempts else None

        # 1. Diagnose and Score Recovery Probability
        case_input = LLMDecisionInput(
            case_id=case.id,
            case_type=case.case_type,
            amount=case.amount,
            customer_ltv=customer.ltv,
            previous_orders=customer.total_orders,
            successful_payments=customer.successful_orders,
            failure_reason=case.failure_reason or "unknown",
            attempt_number=attempt_number,
            preferred_method=customer.preferred_method,
            days_since_last_purchase=random.randint(2, 30),
            has_active_dispute=customer.has_active_dispute,
            opt_out=customer.opt_out,
            language_preference=customer.language_preference,
            previous_strategy=previous_strategy,
            previous_channel=previous_channel,
        )

        diagnosis = recovery_orchestrator.diagnose_root_cause(case_input.failure_reason, case.case_type)
        probability = recovery_orchestrator.calculate_recovery_probability(case_input)
        case.root_cause_diagnosis = diagnosis
        case.recovery_probability = probability

        # 2. AI Recovery Orchestrator Proposes Intervention
        proposed_decision, raw_prompt = await recovery_orchestrator.decide_strategy(case_input)

        # 3. Deterministic Policy Engine Validates Proposal
        last_contacted_at = (
            case.communication_logs[-1].sent_at if case.communication_logs else None
        )
        existing_message_count = len(case.communication_logs)
        escalation_approved = force_approved or (case.escalation_status == "approved")

        policy_result = policy_engine.evaluate(
            case_input=case_input,
            proposed=proposed_decision,
            existing_attempt_count=case.attempt_count,
            existing_message_count=existing_message_count,
            last_contacted_at=last_contacted_at,
            escalation_approved=escalation_approved,
        )

        # 4. Record Agent Decision in Audit Trail
        decision_record = AgentDecision(
            case_id=case.id,
            attempt_number=attempt_number,
            agent_name="RecoveryOrchestrator",
            model_name="gemini-2.5-flash",
            proposed_action=proposed_decision.action,
            proposed_channel=proposed_decision.channel,
            proposed_discount=proposed_decision.discount_percentage,
            proposed_delay_minutes=proposed_decision.delay_minutes,
            priority=proposed_decision.priority,
            confidence_score=proposed_decision.confidence_score,
            rationale=proposed_decision.rationale,
            raw_prompt=raw_prompt,
            raw_llm_response=json.dumps(proposed_decision.model_dump()),
        )
        db.add(decision_record)
        await db.flush()

        # 5. Record Policy Checks in Audit Trail
        if policy_result.violations:
            for violation in policy_result.violations:
                check_record = PolicyCheck(
                    case_id=case.id,
                    decision_id=decision_record.id,
                    rule_name=violation.rule_name,
                    rule_category=violation.rule_category,
                    is_compliant=False,
                    decision_action=policy_result.decision_action,
                    original_value=str(violation.original_value),
                    adjusted_value=str(violation.adjusted_value),
                    violation_details=violation.description,
                    policy_metadata=json.dumps(policy_result.metadata),
                )
                db.add(check_record)
        else:
            check_record = PolicyCheck(
                case_id=case.id,
                decision_id=decision_record.id,
                rule_name="POLICY_BASELINE_PASSED",
                rule_category="safety",
                is_compliant=True,
                decision_action="approved",
                original_value=proposed_decision.action,
                adjusted_value=policy_result.applied_action,
                violation_details="All safety and compliance rules passed",
                policy_metadata=json.dumps(policy_result.metadata),
            )
            db.add(check_record)

        await db.flush()

        # 6. Execute Policy Decision
        action = policy_result.applied_action

        if action == "human_escalation":
            case.status = "escalated"
            case.escalation_required = True
            case.escalation_status = "pending_approval"
            case.escalation_reason = policy_result.escalation_reason
            await db.commit()
            return {
                "status": "escalated",
                "case_id": case.id,
                "reason": case.escalation_reason,
                "amount": case.amount,
            }

        elif action == "stop":
            case.status = "stopped"
            case.stop_reason = policy_result.stop_reason or "Policy stopping rule triggered"
            await db.commit()
            return {
                "status": "stopped",
                "case_id": case.id,
                "reason": case.stop_reason,
            }

        # For approved / modified recovery actions:
        case.status = "in_progress"
        case.attempt_count = attempt_number
        case.current_strategy = f"{action}_{policy_result.applied_channel}"

        # Generate Razorpay Payment Link
        effective_amount = case.amount * (1.0 - (policy_result.applied_discount / 100.0))
        plink = razorpay_service.create_payment_link(
            amount=effective_amount,
            customer_name=customer.name,
            customer_email=customer.email,
            customer_phone=customer.phone,
            reference_id=f"rec_{case.id}_att_{attempt_number}",
            description=f"Recovery for Order #{case.order_id or case.id}"
        )
        case.razorpay_payment_link_id = plink.get("id")
        case.razorpay_short_url = plink.get("short_url")

        # Create Recovery Attempt record
        attempt_record = RecoveryAttempt(
            case_id=case.id,
            attempt_number=attempt_number,
            strategy=action,
            channel=policy_result.applied_channel,
            discount_offered=policy_result.applied_discount,
            action_payload=json.dumps(plink),
            execution_id=plink.get("id"),
            outcome="delivered",
            outcome_details=f"Dispatched via {policy_result.applied_channel} at {datetime.utcnow().isoformat()}",
        )
        db.add(attempt_record)
        await db.flush()
        decision_record.attempt_id = attempt_record.id

        # Generate Communication Copy (WhatsApp / Email / SMS / Hinglish)
        if policy_result.applied_channel in ["whatsapp", "email", "sms"]:
            msg_payload = communication_agent.generate_message(
                channel=policy_result.applied_channel,
                language=customer.language_preference,
                customer_name=customer.name,
                amount=effective_amount,
                payment_link=case.razorpay_short_url,
                case_type=case.case_type,
                discount_percentage=policy_result.applied_discount,
                attempt_number=attempt_number,
            )
            comm_log = CommunicationLog(
                case_id=case.id,
                attempt_id=attempt_record.id,
                recipient=customer.phone if policy_result.applied_channel == "whatsapp" else customer.email,
                channel=policy_result.applied_channel,
                language=customer.language_preference,
                subject=msg_payload.get("subject"),
                body_content=msg_payload.get("body"),
                template_name=msg_payload.get("template"),
                status="delivered",
                external_message_id=f"msg_{plink.get('id')}",
            )
            db.add(comm_log)

        # If running simulated batch outcome resolution:
        if simulate_outcome:
            # Calibrated simulation matching target 25-35% recovery rate across batch
            is_recovered = random.random() < (case.recovery_probability * 0.38)

            if is_recovered:
                attempt_record.outcome = "paid"
                attempt_record.outcome_details = "Customer completed Razorpay payment link"
                attempt_record.completed_at = datetime.utcnow()
                case.status = "recovered"
                case.recovered_amount = effective_amount
                case.recovered_at = datetime.utcnow()
                customer.successful_orders += 1
            else:
                attempt_record.outcome = "failed"
                attempt_record.outcome_details = "Customer did not respond within intervention window"
                attempt_record.completed_at = datetime.utcnow()
                if attempt_number >= case.max_attempts:
                    case.status = "stopped"
                    case.stop_reason = "max_attempts_exhausted"

        await db.commit()

        return {
            "status": "processed",
            "case_id": case.id,
            "case_status": case.status,
            "attempt_number": attempt_number,
            "action": action,
            "channel": policy_result.applied_channel,
            "payment_link": case.razorpay_short_url,
            "recovery_probability": probability,
            "recovered_amount": case.recovered_amount,
        }


recovery_runner = RecoveryRunner()

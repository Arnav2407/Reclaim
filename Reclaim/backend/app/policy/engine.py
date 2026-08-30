from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from app.core.config import settings
from app.schemas.decision import LLMDecisionInput, LLMDecisionOutput
from app.schemas.policy import PolicyEvaluationResult, PolicyViolation
import logging

logger = logging.getLogger(__name__)


class PolicyEngine:
    """
    Deterministic Safety & Compliance Policy Engine.
    LLMs propose interventions; deterministic code approves, modifies, or rejects them.
    """

    def __init__(self):
        self.max_attempts = settings.MAX_RECOVERY_ATTEMPTS
        self.escalation_threshold = settings.HIGH_VALUE_ESCALATION_THRESHOLD
        self.max_discount = settings.MAX_DISCOUNT_PERCENTAGE
        self.max_messages = settings.MAX_OUTBOUND_MESSAGES
        self.cooldown_hours = settings.CONTACT_COOLDOWN_HOURS

    def evaluate(
        self,
        case_input: LLMDecisionInput,
        proposed: LLMDecisionOutput,
        existing_attempt_count: int = 0,
        existing_message_count: int = 0,
        last_contacted_at: Optional[datetime] = None,
        escalation_approved: bool = False,
    ) -> PolicyEvaluationResult:
        violations: List[PolicyViolation] = []
        applied_action = proposed.action
        applied_channel = proposed.channel
        applied_discount = proposed.discount_percentage
        applied_delay_minutes = proposed.delay_minutes
        decision_action = "approved"
        requires_human_approval = False
        escalation_reason = None
        stop_reason = None

        # ---------------------------------------------------------
        # Rule 1: Dispute and Opt-Out Guardrail (Compliance / Legal)
        # ---------------------------------------------------------
        if case_input.opt_out:
            violations.append(
                PolicyViolation(
                    rule_name="RULE_DISPUTE_AND_OPTOUT",
                    rule_category="compliance",
                    description="Customer has opted out of recovery communications",
                    original_value=f"action={proposed.action}",
                    adjusted_value="action=stop",
                )
            )
            applied_action = "stop"
            applied_channel = None
            decision_action = "rejected"
            stop_reason = "customer_opted_out"
            return PolicyEvaluationResult(
                is_compliant=False,
                decision_action=decision_action,
                violations=violations,
                applied_action=applied_action,
                applied_channel=applied_channel,
                applied_discount=0.0,
                applied_delay_minutes=0,
                requires_human_approval=False,
                stop_reason=stop_reason,
                metadata={"rule": "RULE_DISPUTE_AND_OPTOUT", "passed": False},
            )

        if case_input.has_active_dispute:
            violations.append(
                PolicyViolation(
                    rule_name="RULE_DISPUTE_AND_OPTOUT",
                    rule_category="safety",
                    description="Active dispute present on transaction/customer; automated recovery prohibited",
                    original_value=f"action={proposed.action}",
                    adjusted_value="action=stop",
                )
            )
            applied_action = "stop"
            applied_channel = None
            decision_action = "rejected"
            stop_reason = "active_dispute_present"
            return PolicyEvaluationResult(
                is_compliant=False,
                decision_action=decision_action,
                violations=violations,
                applied_action=applied_action,
                applied_channel=applied_channel,
                applied_discount=0.0,
                applied_delay_minutes=0,
                requires_human_approval=False,
                stop_reason=stop_reason,
                metadata={"rule": "RULE_DISPUTE_AND_OPTOUT", "passed": False},
            )

        # ---------------------------------------------------------
        # Rule 2: Max Attempts Boundary (Stopping Rules)
        # ---------------------------------------------------------
        if existing_attempt_count >= self.max_attempts or proposed.action == "stop":
            if existing_attempt_count >= self.max_attempts and proposed.action != "stop":
                violations.append(
                    PolicyViolation(
                        rule_name="RULE_MAX_ATTEMPTS",
                        rule_category="safety",
                        description=f"Attempt {existing_attempt_count + 1} exceeds maximum allowed attempts ({self.max_attempts})",
                        original_value=f"action={proposed.action}, attempt={existing_attempt_count + 1}",
                        adjusted_value="action=stop",
                    )
                )
                decision_action = "modified"
            applied_action = "stop"
            applied_channel = None
            stop_reason = proposed.rationale if proposed.action == "stop" else "max_attempts_exceeded"
            return PolicyEvaluationResult(
                is_compliant=True if proposed.action == "stop" else False,
                decision_action=decision_action if proposed.action != "stop" else "approved",
                violations=violations,
                applied_action=applied_action,
                applied_channel=applied_channel,
                applied_discount=0.0,
                applied_delay_minutes=0,
                requires_human_approval=False,
                stop_reason=stop_reason,
                metadata={"rule": "RULE_MAX_ATTEMPTS", "passed": True},
            )

        # ---------------------------------------------------------
        # Rule 3: High-Value Escalation Threshold (> ₹50,000)
        # ---------------------------------------------------------
        if case_input.amount >= self.escalation_threshold and not escalation_approved:
            violations.append(
                PolicyViolation(
                    rule_name="RULE_HIGH_VALUE_ESCALATION",
                    rule_category="financial",
                    description=f"Amount ₹{case_input.amount:,.2f} meets or exceeds ₹{self.escalation_threshold:,.2f} threshold; requires mandatory merchant supervisor approval",
                    original_value=f"action={proposed.action}, escalation={proposed.escalation}",
                    adjusted_value="action=human_escalation, requires_approval=True",
                )
            )
            applied_action = "human_escalation"
            applied_channel = "dashboard"
            decision_action = "escalated"
            requires_human_approval = True
            escalation_reason = f"High-value case (₹{case_input.amount:,.2f} >= ₹{self.escalation_threshold:,.2f}) requires human supervisor sign-off"

        # ---------------------------------------------------------
        # Rule 4: Discount Bounds (Max 10% Discount)
        # ---------------------------------------------------------
        if applied_discount > self.max_discount:
            violations.append(
                PolicyViolation(
                    rule_name="RULE_DISCOUNT_BOUND",
                    rule_category="financial",
                    description=f"Proposed discount {applied_discount}% exceeds maximum allowed limit of {self.max_discount}%",
                    original_value=f"{applied_discount}%",
                    adjusted_value=f"{self.max_discount}%",
                )
            )
            applied_discount = self.max_discount
            if decision_action == "approved":
                decision_action = "modified"

        # ---------------------------------------------------------
        # Rule 5: Max Outbound Messages & Channel Cooldown
        # ---------------------------------------------------------
        if proposed.channel in ["whatsapp", "email", "sms"]:
            if existing_message_count >= self.max_messages:
                violations.append(
                    PolicyViolation(
                        rule_name="RULE_MAX_MESSAGES",
                        rule_category="contact_policy",
                        description=f"Outbound messages limit ({self.max_messages}) reached for this case",
                        original_value=f"channel={proposed.channel}",
                        adjusted_value="action=smart_retry, channel=webhook",
                    )
                )
                applied_action = "smart_retry"
                applied_channel = "webhook"
                if decision_action == "approved":
                    decision_action = "modified"
            elif last_contacted_at:
                cooldown_delta = datetime.utcnow() - last_contacted_at
                if cooldown_delta < timedelta(hours=self.cooldown_hours):
                    min_delay = int((timedelta(hours=self.cooldown_hours) - cooldown_delta).total_seconds() / 60)
                    if applied_delay_minutes < min_delay:
                        violations.append(
                            PolicyViolation(
                                rule_name="RULE_CONTACT_COOLDOWN",
                                rule_category="contact_policy",
                                description=f"24h cooldown active; last contact was {cooldown_delta.total_seconds()/3600:.1f}h ago",
                                original_value=f"delay_minutes={applied_delay_minutes}",
                                adjusted_value=f"delay_minutes={min_delay}",
                            )
                        )
                        applied_delay_minutes = min_delay
                        if decision_action == "approved":
                            decision_action = "modified"

        is_compliant = len([v for v in violations if v.rule_category in ["safety", "compliance"]]) == 0

        return PolicyEvaluationResult(
            is_compliant=is_compliant,
            decision_action=decision_action,
            violations=violations,
            applied_action=applied_action,
            applied_channel=applied_channel,
            applied_discount=applied_discount,
            applied_delay_minutes=applied_delay_minutes,
            requires_human_approval=requires_human_approval,
            escalation_reason=escalation_reason,
            stop_reason=stop_reason,
            metadata={
                "evaluated_at": datetime.utcnow().isoformat(),
                "rules_checked": [
                    "RULE_DISPUTE_AND_OPTOUT",
                    "RULE_MAX_ATTEMPTS",
                    "RULE_HIGH_VALUE_ESCALATION",
                    "RULE_DISCOUNT_BOUND",
                    "RULE_MAX_MESSAGES",
                    "RULE_CONTACT_COOLDOWN",
                ],
                "violations_count": len(violations),
            },
        )


policy_engine = PolicyEngine()

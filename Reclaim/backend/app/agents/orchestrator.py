import json
import logging
import math
from typing import Optional, Tuple
from app.core.config import settings
from app.schemas.decision import LLMDecisionInput, LLMDecisionOutput

logger = logging.getLogger(__name__)


class RecoveryOrchestratorAgent:
    """
    The 'Brain' of Reclaim:
    1. Diagnoses root cause
    2. Calculates customer-weighted recovery probability
    3. Selects optimal recovery strategy & channel
    4. Handles intelligent replanning across multiple attempts
    """

    def __init__(self):
        self.gemini_client = None
        if settings.GEMINI_API_KEY:
            try:
                from google import genai
                self.gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
                logger.info("Initialized Gemini Client for Recovery Orchestrator")
            except Exception as e:
                logger.warning(f"Could not initialize Gemini Client: {e}")

    def diagnose_root_cause(self, failure_reason: str, case_type: str) -> str:
        """Categorize technical and behavioral root cause."""
        diagnoses = {
            "card_declined": "Bank-side refusal: insufficient funds or anti-fraud trigger on customer card.",
            "insufficient_funds": "Account balance lower than transaction amount; optimal retry window: morning/salary cycle.",
            "checkout_timeout": "Customer dropped off at OTP/2FA stage; high intent, high recoverable probability via instant link.",
            "mandate_revoked": "Subscription e-mandate invalid or revoked; needs fresh payment method authorization.",
            "invoice_past_due": "B2B payment term elapsed; requires finance stakeholder reminder and direct invoice link.",
            "network_error": "Temporary gateway or bank switch network glitch; candidate for immediate zero-friction retry.",
            "expired_card": "Saved card has expired; customer needs update portal or alternative UPI fallback.",
            "user_dropped_off": "Customer abandoned checkout cart before selecting payment option.",
            "payment_link_expired": "Previous payment link timed out before customer opened it.",
        }
        return diagnoses.get(
            failure_reason.lower(),
            f"Unclassified {case_type} failure due to {failure_reason}."
        )

    def calculate_recovery_probability(self, case_input: LLMDecisionInput) -> float:
        """
        Customer & telemetry-weighted predictive probability score (0.0 to 1.0).
        High LTV, previous successful orders, recent activity, and transient failure codes boost score.
        Multiple failed attempts and disputes degrade score.
        """
        # Base probability by failure reason
        reason_weights = {
            "checkout_timeout": 0.78,
            "network_error": 0.82,
            "user_dropped_off": 0.65,
            "insufficient_funds": 0.55,
            "card_declined": 0.45,
            "expired_card": 0.40,
            "invoice_past_due": 0.60,
            "mandate_revoked": 0.35,
            "payment_link_expired": 0.30,
        }
        base_p = reason_weights.get(case_input.failure_reason.lower(), 0.50)

        # LTV boost (+0.01 to +0.15)
        ltv_boost = min(0.15, (case_input.customer_ltv / 100000.0) * 0.15)

        # Order history trust factor
        success_ratio = 0.5
        if case_input.previous_orders > 0:
            success_ratio = case_input.successful_payments / case_input.previous_orders
        history_boost = (success_ratio - 0.5) * 0.20  # -0.10 to +0.10

        # Recency decay (days since last purchase)
        recency_penalty = min(0.15, (case_input.days_since_last_purchase / 60.0) * 0.15)

        # Attempt penalty (each previous failure lowers probability)
        attempt_penalty = (case_input.attempt_number - 1) * 0.18

        # Dispute or opt-out hard penalty
        dispute_penalty = 0.50 if (case_input.has_active_dispute or case_input.opt_out) else 0.0

        raw_score = base_p + ltv_boost + history_boost - recency_penalty - attempt_penalty - dispute_penalty
        return max(0.02, min(0.98, round(raw_score, 2)))

    async def decide_strategy(self, case_input: LLMDecisionInput) -> Tuple[LLMDecisionOutput, str]:
        """
        Decides recovery action, channel, delay, and discount.
        Uses Gemini LLM if configured; otherwise uses calibrated heuristic decision engine.
        """
        probability = self.calculate_recovery_probability(case_input)

        if self.gemini_client:
            try:
                prompt = self._build_llm_prompt(case_input, probability)
                response = self.gemini_client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=prompt,
                    config={
                        "response_mime_type": "application/json",
                        "response_schema": LLMDecisionOutput,
                    }
                )
                output_data = json.loads(response.text)
                decision = LLMDecisionOutput(**output_data)
                return decision, prompt
            except Exception as e:
                logger.warning(f"LLM decision generation failed ({e}), falling back to deterministic agent")

        # Heuristic Strategy Logic (Replanning & Optimization)
        decision, raw_prompt = self._heuristic_decision(case_input, probability)
        return decision, raw_prompt

    def _build_llm_prompt(self, case_input: LLMDecisionInput, probability: float) -> str:
        return f"""You are the Recovery Orchestrator Agent for an autonomous payment recovery system at Razorpay.
Analyze the following merchant revenue-at-risk case and output a structured decision.

CASE CONTEXT:
- Case Type: {case_input.case_type}
- Amount: ₹{case_input.amount}
- Customer LTV: ₹{case_input.customer_ltv}
- Order History: {case_input.successful_payments} successful out of {case_input.previous_orders} orders
- Failure Reason: {case_input.failure_reason}
- Preferred Payment Method: {case_input.preferred_method}
- Language: {case_input.language_preference}
- Days Since Last Purchase: {case_input.days_since_last_purchase}
- Current Attempt Number: {case_input.attempt_number}
- Previous Strategy: {case_input.previous_strategy or 'None'}
- Computed Recovery Probability: {probability:.2f}
- Has Active Dispute: {case_input.has_active_dispute}
- Customer Opt-out: {case_input.opt_out}

DECISION RULES:
1. If recovery probability < 0.15 or active dispute or opt-out, choose 'stop'.
2. If amount >= 50000, set escalation=true and propose human_escalation.
3. On Attempt 1 for transient failures (checkout_timeout, card_declined, insufficient_funds), propose 'payment_link' via customer preferred channel (whatsapp or email).
4. On Attempt 2 (replanning), if WhatsApp failed, switch channel to 'email' or propose small incentive (5-10% discount).
5. On Attempt 3, if previous attempts failed, propose final urgent reminder or stop if probability is low.

Respond with JSON matching the decision schema."""

    def _heuristic_decision(self, case_input: LLMDecisionInput, probability: float) -> Tuple[LLMDecisionOutput, str]:
        prompt = json.dumps(case_input.model_dump(), indent=2)

        # Rule 1: Immediate stop if dispute, opt-out, or hopeless probability
        if case_input.opt_out or case_input.has_active_dispute:
            return LLMDecisionOutput(
                action="stop",
                channel=None,
                priority="low",
                delay_minutes=0,
                max_attempts=case_input.attempt_number,
                discount_percentage=0.0,
                escalation=False,
                confidence_score=0.95,
                rationale="Customer opted out or transaction has an active dispute. Safe stop required."
            ), prompt

        if probability < 0.15 and case_input.attempt_number >= 2:
            return LLMDecisionOutput(
                action="stop",
                channel=None,
                priority="low",
                delay_minutes=0,
                max_attempts=case_input.attempt_number,
                discount_percentage=0.0,
                escalation=False,
                confidence_score=0.90,
                rationale=f"Low recovery probability ({probability:.2f}) after previous failure. Stopping further interventions."
            ), prompt

        # Rule 2: High value escalation (> ₹50k)
        if case_input.amount >= settings.HIGH_VALUE_ESCALATION_THRESHOLD:
            return LLMDecisionOutput(
                action="human_escalation",
                channel="dashboard",
                priority="high",
                delay_minutes=0,
                max_attempts=case_input.attempt_number,
                discount_percentage=0.0,
                escalation=True,
                confidence_score=0.99,
                rationale=f"High-value recovery case (₹{case_input.amount:,.2f}) exceeds ₹50,000 threshold. Routing to supervisor for manual review."
            ), prompt

        # Rule 3: Strategy Selection & Replanning
        # Attempt 1: Fast direct channel outreach with preferred method
        if case_input.attempt_number == 1:
            channel = "whatsapp" if case_input.preferred_method == "upi" else "email"
            if case_input.case_type == "overdue_invoice":
                channel = "email"
            
            discount = 0.0
            if case_input.customer_ltv > 50000 and case_input.case_type == "checkout_abandonment":
                discount = 5.0

            return LLMDecisionOutput(
                action="payment_link",
                channel=channel,
                priority="high" if case_input.amount > 10000 else "medium",
                delay_minutes=15 if case_input.case_type == "checkout_abandonment" else 0,
                max_attempts=3,
                discount_percentage=discount,
                escalation=False,
                confidence_score=0.88,
                rationale=f"Attempt 1: High intent detected ({case_input.failure_reason}). Sending instant Razorpay link via {channel}."
            ), prompt

        # Attempt 2: Replanning on failure (switch channel, add discount incentive)
        elif case_input.attempt_number == 2:
            # Alternate channel
            prev_channel = case_input.previous_channel or "whatsapp"
            new_channel = "email" if prev_channel == "whatsapp" else "whatsapp"
            
            # Offer 5% - 10% discount for repeat customers or abandoned carts
            discount = 5.0 if case_input.customer_ltv > 20000 else 0.0
            if case_input.case_type == "checkout_abandonment":
                discount = 10.0

            return LLMDecisionOutput(
                action="payment_link",
                channel=new_channel,
                priority="high",
                delay_minutes=120,
                max_attempts=3,
                discount_percentage=discount,
                escalation=False,
                confidence_score=0.82,
                rationale=f"Attempt 2 Replanning: Previous attempt failed. Alternating to {new_channel} with {discount}% recovery discount."
            ), prompt

        # Attempt 3: Final attempt or smart retry
        else:
            return LLMDecisionOutput(
                action="smart_retry" if case_input.failure_reason in ["network_error", "insufficient_funds"] else "customer_outreach",
                channel="email" if case_input.case_type == "overdue_invoice" else "sms",
                priority="low",
                delay_minutes=720,
                max_attempts=3,
                discount_percentage=10.0 if case_input.customer_ltv > 30000 else 0.0,
                escalation=False,
                confidence_score=0.75,
                rationale="Attempt 3: Final attempt before closure. Sending urgent expiration reminder."
            ), prompt

    async def evaluate(self, case_data: dict | LLMDecisionInput) -> LLMDecisionOutput:
        """Accepts a case dictionary or LLMDecisionInput and returns structured decision output."""
        if isinstance(case_data, dict):
            case_input = LLMDecisionInput(**case_data)
        else:
            case_input = case_data
        decision, _ = await self.decide_strategy(case_input)
        return decision

    def evaluate_sync(self, case_data: dict | LLMDecisionInput) -> LLMDecisionOutput:
        """Synchronous evaluation wrapper."""
        if isinstance(case_data, dict):
            case_input = LLMDecisionInput(**case_data)
        else:
            case_input = case_data
        probability = self.calculate_recovery_probability(case_input)
        decision, _ = self._heuristic_decision(case_input, probability)
        return decision


recovery_orchestrator = RecoveryOrchestratorAgent()

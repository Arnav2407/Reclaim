import sys
from datetime import datetime, timedelta

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from app.policy.engine import policy_engine
from app.schemas.decision import LLMDecisionInput, LLMDecisionOutput


def test_rule_max_attempts_cap():
    """Rule 2: Max 3 recovery attempts per case -> Action modified to 'stop'"""
    case_input = LLMDecisionInput(
        amount=5000.0,
        customer_ltv=15000.0,
        previous_orders=3,
        successful_payments=3,
        failure_reason="card_declined",
        attempt_number=4,
    )
    proposed = LLMDecisionOutput(
        action="payment_link",
        channel="whatsapp",
        priority="high",
        delay_minutes=0,
        max_attempts=3,
        discount_percentage=5.0,
        escalation=False,
        rationale="Attempting 4th retry",
    )

    result = policy_engine.evaluate(
        case_input=case_input,
        proposed=proposed,
        existing_attempt_count=3,
    )

    assert result.applied_action == "stop", f"Expected 'stop', got {result.applied_action}"
    assert result.decision_action == "modified"
    assert any(v.rule_name == "RULE_MAX_ATTEMPTS" for v in result.violations)
    print(" [+] test_rule_max_attempts_cap: PASSED")


def test_rule_high_value_escalation():
    """Rule 3: Cases >= ₹50,000 require human supervisor approval"""
    case_input = LLMDecisionInput(
        amount=65000.0,  # > ₹50k
        customer_ltv=120000.0,
        previous_orders=5,
        successful_payments=5,
        failure_reason="invoice_past_due",
        attempt_number=1,
    )
    proposed = LLMDecisionOutput(
        action="payment_link",
        channel="email",
        priority="high",
        delay_minutes=0,
        max_attempts=3,
        discount_percentage=0.0,
        escalation=False,
        rationale="Sending invoice link to high-value client",
    )

    result = policy_engine.evaluate(
        case_input=case_input,
        proposed=proposed,
        existing_attempt_count=0,
        escalation_approved=False,
    )

    assert result.applied_action == "human_escalation"
    assert result.requires_human_approval is True
    assert result.decision_action == "escalated"
    assert any(v.rule_name == "RULE_HIGH_VALUE_ESCALATION" for v in result.violations)
    print(" [+] test_rule_high_value_escalation: PASSED")


def test_rule_escalation_approved():
    """Rule 3: When human supervisor approves, high-value case proceeds"""
    case_input = LLMDecisionInput(
        amount=65000.0,
        customer_ltv=120000.0,
        previous_orders=5,
        successful_payments=5,
        failure_reason="invoice_past_due",
        attempt_number=1,
    )
    proposed = LLMDecisionOutput(
        action="payment_link",
        channel="email",
        priority="high",
        delay_minutes=0,
        max_attempts=3,
        discount_percentage=0.0,
        escalation=False,
        rationale="Sending invoice link after supervisor approved",
    )

    result = policy_engine.evaluate(
        case_input=case_input,
        proposed=proposed,
        existing_attempt_count=0,
        escalation_approved=True,  # Approved by human supervisor
    )

    assert result.applied_action == "payment_link"
    assert result.requires_human_approval is False
    assert result.decision_action == "approved"
    print(" [+] test_rule_escalation_approved: PASSED")


def test_rule_discount_bounds_clamped():
    """Rule 4: Max 10% discount bound -> Clamps 15% down to 10%"""
    case_input = LLMDecisionInput(
        amount=4000.0,
        customer_ltv=20000.0,
        previous_orders=4,
        successful_payments=4,
        failure_reason="checkout_timeout",
        attempt_number=2,
    )
    proposed = LLMDecisionOutput(
        action="payment_link",
        channel="whatsapp",
        priority="high",
        delay_minutes=0,
        max_attempts=3,
        discount_percentage=15.0,  # Exceeds 10%
        escalation=False,
        rationale="Offering generous 15% discount",
    )

    result = policy_engine.evaluate(
        case_input=case_input,
        proposed=proposed,
        existing_attempt_count=1,
    )

    assert result.applied_discount == 10.0, f"Expected 10.0, got {result.applied_discount}"
    assert result.decision_action == "modified"
    assert any(v.rule_name == "RULE_DISCOUNT_BOUND" for v in result.violations)
    print(" [+] test_rule_discount_bounds_clamped: PASSED")


def test_rule_24h_contact_cooldown():
    """Rule 6: 24h channel cooldown prevents spamming customers"""
    case_input = LLMDecisionInput(
        amount=3000.0,
        customer_ltv=10000.0,
        previous_orders=2,
        successful_payments=2,
        failure_reason="card_declined",
        attempt_number=2,
    )
    proposed = LLMDecisionOutput(
        action="payment_link",
        channel="whatsapp",
        priority="medium",
        delay_minutes=0,  # Proposed immediate contact
        max_attempts=3,
        discount_percentage=0.0,
        escalation=False,
        rationale="Sending immediate follow up",
    )

    # Contacted 6 hours ago
    last_contact = datetime.utcnow() - timedelta(hours=6)

    result = policy_engine.evaluate(
        case_input=case_input,
        proposed=proposed,
        existing_attempt_count=1,
        last_contacted_at=last_contact,
    )

    assert result.applied_delay_minutes >= 1000  # ~18 hours remaining cooldown
    assert result.decision_action == "modified"
    assert any(v.rule_name == "RULE_CONTACT_COOLDOWN" for v in result.violations)
    print(" [+] test_rule_24h_contact_cooldown: PASSED")


def test_rule_max_outbound_messages():
    """Rule 5: Max 2 outbound messages per case -> Switches 3rd outreach to smart retry"""
    case_input = LLMDecisionInput(
        amount=2500.0,
        customer_ltv=8000.0,
        previous_orders=2,
        successful_payments=2,
        failure_reason="insufficient_funds",
        attempt_number=3,
    )
    proposed = LLMDecisionOutput(
        action="payment_link",
        channel="whatsapp",
        priority="medium",
        delay_minutes=0,
        max_attempts=3,
        discount_percentage=5.0,
        escalation=False,
        rationale="Attempting 3rd WhatsApp outreach",
    )

    result = policy_engine.evaluate(
        case_input=case_input,
        proposed=proposed,
        existing_attempt_count=2,
        existing_message_count=2,  # Already sent 2 messages
    )

    assert result.applied_action == "smart_retry"
    assert result.applied_channel == "webhook"
    assert any(v.rule_name == "RULE_MAX_MESSAGES" for v in result.violations)
    print(" [+] test_rule_max_outbound_messages: PASSED")


def test_rule_opt_out_compliance():
    """Rule 1: Opted out customer -> Immediate stop"""
    case_input = LLMDecisionInput(
        amount=1999.0,
        customer_ltv=5000.0,
        previous_orders=1,
        successful_payments=1,
        failure_reason="checkout_timeout",
        attempt_number=1,
        opt_out=True,  # Customer opted out
    )
    proposed = LLMDecisionOutput(
        action="payment_link",
        channel="whatsapp",
        priority="high",
        delay_minutes=0,
        max_attempts=3,
        discount_percentage=0.0,
        escalation=False,
        rationale="Sending recovery link",
    )

    result = policy_engine.evaluate(
        case_input=case_input,
        proposed=proposed,
    )

    assert result.applied_action == "stop"
    assert result.is_compliant is False
    assert result.stop_reason == "customer_opted_out"
    assert any(v.rule_name == "RULE_DISPUTE_AND_OPTOUT" for v in result.violations)
    print(" [+] test_rule_opt_out_compliance: PASSED")


def test_rule_active_dispute_safety():
    """Rule 1: Active dispute present -> Immediate stop"""
    case_input = LLMDecisionInput(
        amount=4999.0,
        customer_ltv=12000.0,
        previous_orders=2,
        successful_payments=2,
        failure_reason="card_declined",
        attempt_number=1,
        has_active_dispute=True,  # Active dispute
    )
    proposed = LLMDecisionOutput(
        action="payment_link",
        channel="whatsapp",
        priority="high",
        delay_minutes=0,
        max_attempts=3,
        discount_percentage=0.0,
        escalation=False,
        rationale="Sending recovery link",
    )

    result = policy_engine.evaluate(
        case_input=case_input,
        proposed=proposed,
    )

    assert result.applied_action == "stop"
    assert result.is_compliant is False
    assert result.stop_reason == "active_dispute_present"
    assert any(v.rule_name == "RULE_DISPUTE_AND_OPTOUT" for v in result.violations)
    print(" [+] test_rule_active_dispute_safety: PASSED")


def run_all_policy_tests():
    print("\n========================================================")
    print(" [*] DETERMINISTIC POLICY ENGINE: UNIT TEST SUITE")
    print("========================================================\n")
    test_rule_max_attempts_cap()
    test_rule_high_value_escalation()
    test_rule_escalation_approved()
    test_rule_discount_bounds_clamped()
    test_rule_24h_contact_cooldown()
    test_rule_max_outbound_messages()
    test_rule_opt_out_compliance()
    test_rule_active_dispute_safety()
    print("\n [ALL 8 POLICY ENGINE UNIT TESTS PASSED SUCCESSFULLY!]\n")


if __name__ == "__main__":
    run_all_policy_tests()

import sys
import json

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from app.agents.orchestrator import recovery_orchestrator
from app.agents.communicator import communication_agent
from app.schemas.decision import LLMDecisionInput, LLMDecisionOutput


def test_orchestrator_decision_contract():
    """
    Validates that given the exact input JSON from Agents.md:
    {
      "amount": 12999,
      "customer_ltv": 74200,
      "previous_orders": 9,
      "successful_payments": 8,
      "failure_reason": "card_declined",
      "attempt_number": 1,
      "preferred_method": "upi",
      "days_since_last_purchase": 12
    }
    The orchestrator returns a structured decision matching the contract.
    """
    raw_case = {
        "amount": 12999,
        "customer_ltv": 74200,
        "previous_orders": 9,
        "successful_payments": 8,
        "failure_reason": "card_declined",
        "attempt_number": 1,
        "preferred_method": "upi",
        "days_since_last_purchase": 12
    }

    decision = recovery_orchestrator.evaluate_sync(raw_case)

    assert isinstance(decision, LLMDecisionOutput)
    assert decision.action in ["payment_link", "smart_retry", "customer_outreach", "human_escalation", "stop"]
    assert decision.channel in ["whatsapp", "email", "sms", "dashboard", "webhook"]
    assert decision.priority in ["low", "medium", "high"]
    assert decision.max_attempts <= 3
    assert decision.escalation is False
    assert len(decision.rationale) > 0
    print(" [+] test_orchestrator_decision_contract: PASSED")
    print(f"     Decision: {decision.model_dump()}")


def test_communicator_hinglish_whatsapp():
    """Validates Hinglish WhatsApp copy generation with Razorpay link."""
    msg = communication_agent.generate_message(
        channel="whatsapp",
        language="hinglish",
        customer_name="Rohan Sharma",
        amount=12999.0,
        payment_link="https://rzp.io/i/mock123",
        case_type="payment_failure",
        discount_percentage=5.0,
        attempt_number=1,
    )
    assert msg["channel"] == "whatsapp"
    assert "Namaste Rohan" in msg["body"]
    assert "5% special discount" in msg["body"]
    assert "https://rzp.io/i/mock123" in msg["body"]
    assert "Razorpay" in msg["body"]
    print(" [+] test_communicator_hinglish_whatsapp: PASSED")


def test_communicator_hindi_whatsapp():
    """Validates pure Hindi WhatsApp copy generation."""
    msg = communication_agent.generate_message(
        channel="whatsapp",
        language="hi",
        customer_name="Pooja Patel",
        amount=4999.0,
        payment_link="https://rzp.io/i/mock456",
        case_type="checkout_abandonment",
        discount_percentage=10.0,
        attempt_number=1,
    )
    assert msg["channel"] == "whatsapp"
    assert "नमस्ते Pooja" in msg["body"]
    assert "Razorpay" in msg["body"]
    print(" [+] test_communicator_hindi_whatsapp: PASSED")


def test_communicator_english_email():
    """Validates English invoice email copy generation."""
    msg = communication_agent.generate_message(
        channel="email",
        language="en",
        customer_name="Vikram Mehta",
        amount=45000.0,
        payment_link="https://rzp.io/i/inv789",
        case_type="overdue_invoice",
        discount_percentage=0.0,
        attempt_number=1,
    )
    assert msg["channel"] == "email"
    assert "Invoice Reminder" in msg["subject"]
    assert "Dear Vikram" in msg["body"]
    assert "https://rzp.io/i/inv789" in msg["body"]
    print(" [+] test_communicator_english_email: PASSED")


def run_all_agent_tests():
    print("\n========================================================")
    print(" [*] AGENTS (ORCHESTRATOR + COMMUNICATOR): TEST SUITE")
    print("========================================================\n")
    test_orchestrator_decision_contract()
    test_communicator_hinglish_whatsapp()
    test_communicator_hindi_whatsapp()
    test_communicator_english_email()
    print("\n [ALL AGENT TESTS PASSED SUCCESSFULLY!]\n")


if __name__ == "__main__":
    run_all_agent_tests()

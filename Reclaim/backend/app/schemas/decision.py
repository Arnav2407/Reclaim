from pydantic import BaseModel, Field
from typing import Optional, Literal


class LLMDecisionInput(BaseModel):
    amount: float
    customer_ltv: float = 0.0
    previous_orders: int = 0
    successful_payments: int = 0
    failure_reason: str = "card_declined"
    attempt_number: int = 1
    preferred_method: str = "upi"
    days_since_last_purchase: int = 10
    case_id: Optional[int] = None
    case_type: Optional[str] = "payment_failure"
    has_active_dispute: bool = False
    opt_out: bool = False
    language_preference: str = "hinglish"
    previous_strategy: Optional[str] = None
    previous_channel: Optional[str] = None


class LLMDecisionOutput(BaseModel):
    action: Literal["payment_link", "smart_retry", "customer_outreach", "human_escalation", "stop"]
    channel: Optional[Literal["whatsapp", "email", "sms", "dashboard", "webhook"]] = "whatsapp"
    priority: Literal["low", "medium", "high"] = "medium"
    delay_minutes: int = Field(default=0, ge=0)
    max_attempts: int = Field(default=3, ge=1, le=3)
    escalation: bool = False
    discount_percentage: float = Field(default=0.0, ge=0.0, le=20.0)
    confidence_score: float = Field(default=0.85, ge=0.0, le=1.0)
    rationale: str = "Automated intervention selected based on recovery probability and customer history."

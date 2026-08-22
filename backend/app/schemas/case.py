from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class CustomerBase(BaseModel):
    name: str
    email: str
    phone: str
    ltv: float = 0.0
    total_orders: int = 0
    successful_orders: int = 0
    preferred_method: str = "upi"
    language_preference: str = "hinglish"
    opt_out: bool = False
    has_active_dispute: bool = False


class CustomerResponse(CustomerBase):
    id: int
    external_id: str
    created_at: datetime

    class Config:
        from_attributes = True


class RecoveryAttemptResponse(BaseModel):
    id: int
    attempt_number: int
    strategy: str
    channel: Optional[str] = None
    discount_offered: float = 0.0
    outcome: str
    outcome_details: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PolicyCheckResponse(BaseModel):
    id: int
    rule_name: str
    rule_category: str
    is_compliant: bool
    decision_action: str
    violation_details: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AgentDecisionResponse(BaseModel):
    id: int
    attempt_number: int
    proposed_action: str
    proposed_channel: Optional[str] = None
    proposed_discount: float = 0.0
    proposed_delay_minutes: int = 0
    priority: str
    confidence_score: float
    rationale: str
    created_at: datetime

    class Config:
        from_attributes = True


class CommunicationLogResponse(BaseModel):
    id: int
    recipient: str
    channel: str
    language: str
    subject: Optional[str] = None
    body_content: str
    status: str
    sent_at: datetime

    class Config:
        from_attributes = True


class RecoveryCaseResponse(BaseModel):
    id: int
    external_id: str
    case_type: str
    status: str
    amount: float
    customer_id: int
    failure_reason: Optional[str] = None
    root_cause_diagnosis: Optional[str] = None
    recovery_probability: float
    attempt_count: int
    max_attempts: int
    current_strategy: Optional[str] = None
    escalation_required: bool
    escalation_status: str
    escalation_reason: Optional[str] = None
    stop_reason: Optional[str] = None
    recovered_amount: float
    recovered_at: Optional[datetime] = None
    razorpay_payment_link_id: Optional[str] = None
    razorpay_short_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    customer: Optional[CustomerResponse] = None

    class Config:
        from_attributes = True


class RecoveryCaseDetailResponse(RecoveryCaseResponse):
    attempts: List[RecoveryAttemptResponse] = []
    decisions: List[AgentDecisionResponse] = []
    policy_checks: List[PolicyCheckResponse] = []
    communication_logs: List[CommunicationLogResponse] = []


class CaseCreateRequest(BaseModel):
    case_type: str  # payment_failure, checkout_abandonment, subscription_failure, overdue_invoice
    amount: float
    customer_name: str
    customer_email: str
    customer_phone: str
    customer_ltv: float = 5000.0
    total_orders: int = 2
    successful_orders: int = 2
    failure_reason: str = "card_declined"
    preferred_method: str = "upi"
    language_preference: str = "hinglish"
    has_active_dispute: bool = False
    opt_out: bool = False


class EscalationDecisionRequest(BaseModel):
    approved: bool
    reviewer_notes: Optional[str] = None
    override_channel: Optional[str] = None
    override_discount: Optional[float] = None

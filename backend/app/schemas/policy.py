from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class PolicyViolation(BaseModel):
    rule_name: str
    rule_category: str
    description: str
    original_value: Any
    adjusted_value: Any


class PolicyEvaluationResult(BaseModel):
    is_compliant: bool
    decision_action: str  # approved, modified, rejected, escalated
    violations: List[PolicyViolation] = []
    applied_action: str
    applied_channel: Optional[str] = None
    applied_discount: float = 0.0
    applied_delay_minutes: int = 0
    requires_human_approval: bool = False
    escalation_reason: Optional[str] = None
    stop_reason: Optional[str] = None
    metadata: Dict[str, Any] = {}

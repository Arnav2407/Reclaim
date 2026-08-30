from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.schemas.decision import LLMDecisionInput, LLMDecisionOutput
from app.schemas.policy import PolicyEvaluationResult
from app.policy.engine import policy_engine

router = APIRouter(prefix="/policy", tags=["Policy Engine & Guardrails"])


class PolicyCheckRequest(BaseModel):
    case_input: LLMDecisionInput
    proposed_decision: LLMDecisionOutput
    existing_attempt_count: int = 0
    existing_message_count: int = 0
    escalation_approved: bool = False


@router.post("/evaluate", response_model=PolicyEvaluationResult)
async def evaluate_policy(payload: PolicyCheckRequest):
    """
    Deterministically evaluates an AI proposal against all 6 safety and compliance rules.
    """
    return policy_engine.evaluate(
        case_input=payload.case_input,
        proposed=payload.proposed_decision,
        existing_attempt_count=payload.existing_attempt_count,
        existing_message_count=payload.existing_message_count,
        escalation_approved=payload.escalation_approved,
    )

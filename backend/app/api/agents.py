from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

from app.schemas.decision import LLMDecisionInput, LLMDecisionOutput
from app.agents.orchestrator import recovery_orchestrator
from app.agents.communicator import communication_agent

router = APIRouter(prefix="/agents", tags=["Agent Diagnostics & Copilot"])


class MessageGenerateRequest(BaseModel):
    channel: str = "whatsapp"  # whatsapp, email, sms
    language: str = "hinglish"  # en, hi, hinglish
    customer_name: str = "Rohan Sharma"
    amount: float = 12999.0
    payment_link: str = "https://rzp.io/i/plink_demo123"
    case_type: str = "payment_failure"
    discount_percentage: float = 5.0
    attempt_number: int = 1


@router.post("/orchestrator/decide", response_model=LLMDecisionOutput)
async def decide_strategy(payload: LLMDecisionInput):
    """
    Evaluates a raw or structured case context and returns a structured AI decision.
    """
    return await recovery_orchestrator.evaluate(payload)


@router.post("/communicator/generate")
async def generate_outreach_copy(payload: MessageGenerateRequest):
    """
    Generates localized outreach copy for WhatsApp, Email, or SMS in English, Hindi, or Hinglish.
    """
    return communication_agent.generate_message(
        channel=payload.channel,
        language=payload.language,
        customer_name=payload.customer_name,
        amount=payload.amount,
        payment_link=payload.payment_link,
        case_type=payload.case_type,
        discount_percentage=payload.discount_percentage,
        attempt_number=payload.attempt_number,
    )

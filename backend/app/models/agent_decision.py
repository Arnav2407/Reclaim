from datetime import datetime
from sqlalchemy import String, Float, Integer, ForeignKey, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class AgentDecision(Base):
    __tablename__ = "agent_decisions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    case_id: Mapped[int] = mapped_column(Integer, ForeignKey("recovery_cases.id"), nullable=False, index=True)
    attempt_id: Mapped[int] = mapped_column(Integer, ForeignKey("recovery_attempts.id"), nullable=True, index=True)
    attempt_number: Mapped[int] = mapped_column(Integer, nullable=False)
    
    agent_name: Mapped[str] = mapped_column(String(64), default="RecoveryOrchestrator")
    model_name: Mapped[str] = mapped_column(String(64), default="gemini-2.5-flash")
    
    proposed_action: Mapped[str] = mapped_column(String(64), nullable=False)  # payment_link, smart_retry, customer_outreach, human_escalation, stop
    proposed_channel: Mapped[str] = mapped_column(String(32), nullable=True)  # whatsapp, email, sms
    proposed_discount: Mapped[float] = mapped_column(Float, default=0.0)
    proposed_delay_minutes: Mapped[int] = mapped_column(Integer, default=0)
    
    priority: Mapped[str] = mapped_column(String(16), default="medium")  # low, medium, high
    confidence_score: Mapped[float] = mapped_column(Float, default=0.8)
    rationale: Mapped[str] = mapped_column(Text, nullable=False)
    
    raw_prompt: Mapped[str] = mapped_column(Text, nullable=True)
    raw_llm_response: Mapped[str] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    case = relationship("RecoveryCase", back_populates="decisions")
    attempt = relationship("RecoveryAttempt", back_populates="decision")
    policy_checks = relationship("PolicyCheck", back_populates="decision", cascade="all, delete-orphan")

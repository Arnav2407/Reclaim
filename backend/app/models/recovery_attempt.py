from datetime import datetime
from sqlalchemy import String, Float, Integer, ForeignKey, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class RecoveryAttempt(Base):
    __tablename__ = "recovery_attempts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    case_id: Mapped[int] = mapped_column(Integer, ForeignKey("recovery_cases.id"), nullable=False, index=True)
    attempt_number: Mapped[int] = mapped_column(Integer, nullable=False)
    
    strategy: Mapped[str] = mapped_column(String(64), nullable=False)  # payment_link, smart_retry, customer_outreach, human_escalation, stop
    channel: Mapped[str] = mapped_column(String(32), nullable=True)   # whatsapp, email, sms, dashboard, webhook
    discount_offered: Mapped[float] = mapped_column(Float, default=0.0)
    
    action_payload: Mapped[str] = mapped_column(Text, nullable=True)
    execution_id: Mapped[str] = mapped_column(String(64), nullable=True)
    
    outcome: Mapped[str] = mapped_column(String(32), default="pending")  # pending, delivered, opened, paid, failed, expired
    outcome_details: Mapped[str] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    # Relationships
    case = relationship("RecoveryCase", back_populates="attempts")
    decision = relationship("AgentDecision", back_populates="attempt", uselist=False)
    communications = relationship("CommunicationLog", back_populates="attempt")

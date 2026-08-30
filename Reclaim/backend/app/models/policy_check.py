from datetime import datetime
from sqlalchemy import String, Boolean, ForeignKey, DateTime, Text, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class PolicyCheck(Base):
    __tablename__ = "policy_checks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    case_id: Mapped[int] = mapped_column(Integer, ForeignKey("recovery_cases.id"), nullable=False, index=True)
    decision_id: Mapped[int] = mapped_column(Integer, ForeignKey("agent_decisions.id"), nullable=True, index=True)
    
    rule_name: Mapped[str] = mapped_column(String(64), nullable=False)
    rule_category: Mapped[str] = mapped_column(String(32), nullable=False)  # safety, compliance, financial, contact_policy
    is_compliant: Mapped[bool] = mapped_column(Boolean, default=True)
    decision_action: Mapped[str] = mapped_column(String(32), default="approved")  # approved, modified, rejected, escalated
    
    original_value: Mapped[str] = mapped_column(Text, nullable=True)
    adjusted_value: Mapped[str] = mapped_column(Text, nullable=True)
    violation_details: Mapped[str] = mapped_column(Text, nullable=True)
    
    policy_metadata: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    # Relationships
    case = relationship("RecoveryCase", back_populates="policy_checks")
    decision = relationship("AgentDecision", back_populates="policy_checks")

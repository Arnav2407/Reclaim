from datetime import datetime
from sqlalchemy import String, Float, Integer, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class RecoveryCase(Base):
    __tablename__ = "recovery_cases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    external_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    case_type: Mapped[str] = mapped_column(String(32), index=True)  # payment_failure, checkout_abandonment, subscription_failure, overdue_invoice
    status: Mapped[str] = mapped_column(String(32), default="open", index=True)  # open, in_progress, escalated, recovered, stopped, failed
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    customer_id: Mapped[int] = mapped_column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    order_id: Mapped[int] = mapped_column(Integer, ForeignKey("orders.id"), nullable=True, index=True)
    payment_id: Mapped[int] = mapped_column(Integer, ForeignKey("payments.id"), nullable=True, index=True)
    
    failure_reason: Mapped[str] = mapped_column(String(128), nullable=True)
    root_cause_diagnosis: Mapped[str] = mapped_column(Text, nullable=True)
    recovery_probability: Mapped[float] = mapped_column(Float, default=0.5)
    
    attempt_count: Mapped[int] = mapped_column(Integer, default=0)
    max_attempts: Mapped[int] = mapped_column(Integer, default=3)
    current_strategy: Mapped[str] = mapped_column(String(64), nullable=True)
    
    escalation_required: Mapped[bool] = mapped_column(Boolean, default=False)
    escalation_status: Mapped[str] = mapped_column(String(32), default="none")  # none, pending_approval, approved, rejected
    escalation_reason: Mapped[str] = mapped_column(String(255), nullable=True)
    
    stop_reason: Mapped[str] = mapped_column(String(255), nullable=True)
    recovered_amount: Mapped[float] = mapped_column(Float, default=0.0)
    recovered_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    
    razorpay_payment_link_id: Mapped[str] = mapped_column(String(64), nullable=True)
    razorpay_short_url: Mapped[str] = mapped_column(String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    customer = relationship("Customer", back_populates="recovery_cases")
    order = relationship("Order", back_populates="recovery_cases")
    payment = relationship("Payment", back_populates="recovery_cases")
    attempts = relationship("RecoveryAttempt", back_populates="case", cascade="all, delete-orphan", order_by="RecoveryAttempt.attempt_number")
    decisions = relationship("AgentDecision", back_populates="case", cascade="all, delete-orphan", order_by="AgentDecision.attempt_number")
    policy_checks = relationship("PolicyCheck", back_populates="case", cascade="all, delete-orphan", order_by="PolicyCheck.created_at")
    communication_logs = relationship("CommunicationLog", back_populates="case", cascade="all, delete-orphan")

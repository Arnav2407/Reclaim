from datetime import datetime
from sqlalchemy import String, Float, Integer, ForeignKey, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    external_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    order_id: Mapped[int] = mapped_column(Integer, ForeignKey("orders.id"), nullable=True, index=True)
    customer_id: Mapped[int] = mapped_column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(8), default="INR")
    status: Mapped[str] = mapped_column(String(32), default="failed")  # created, authorized, captured, failed, refunded
    method: Mapped[str] = mapped_column(String(32), nullable=True)  # card, upi, netbanking, wallet, emi
    failure_code: Mapped[str] = mapped_column(String(64), nullable=True)
    failure_reason: Mapped[str] = mapped_column(String(255), nullable=True)
    bank_error_code: Mapped[str] = mapped_column(String(64), nullable=True)
    raw_response: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    customer = relationship("Customer", back_populates="payments")
    order = relationship("Order", back_populates="payments")
    recovery_cases = relationship("RecoveryCase", back_populates="payment")

from datetime import datetime
from sqlalchemy import String, Float, Integer, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    external_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    phone: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    ltv: Mapped[float] = mapped_column(Float, default=0.0)
    total_orders: Mapped[int] = mapped_column(Integer, default=0)
    successful_orders: Mapped[int] = mapped_column(Integer, default=0)
    preferred_method: Mapped[str] = mapped_column(String(32), default="upi")  # upi, card, netbanking
    language_preference: Mapped[str] = mapped_column(String(16), default="hinglish")  # en, hi, hinglish
    opt_out: Mapped[bool] = mapped_column(Boolean, default=False)
    has_active_dispute: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    orders = relationship("Order", back_populates="customer", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="customer", cascade="all, delete-orphan")
    recovery_cases = relationship("RecoveryCase", back_populates="customer", cascade="all, delete-orphan")

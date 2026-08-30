from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime, Text, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class CommunicationLog(Base):
    __tablename__ = "communication_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    case_id: Mapped[int] = mapped_column(Integer, ForeignKey("recovery_cases.id"), nullable=False, index=True)
    attempt_id: Mapped[int] = mapped_column(Integer, ForeignKey("recovery_attempts.id"), nullable=True, index=True)
    
    recipient: Mapped[str] = mapped_column(String(255), nullable=False)
    channel: Mapped[str] = mapped_column(String(32), nullable=False)  # whatsapp, email, sms
    language: Mapped[str] = mapped_column(String(16), default="hinglish")  # en, hi, hinglish
    
    subject: Mapped[str] = mapped_column(String(255), nullable=True)
    body_content: Mapped[str] = mapped_column(Text, nullable=False)
    template_name: Mapped[str] = mapped_column(String(64), nullable=True)
    
    status: Mapped[str] = mapped_column(String(32), default="sent")  # queued, sent, delivered, opened, failed
    external_message_id: Mapped[str] = mapped_column(String(64), nullable=True)
    
    sent_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    case = relationship("RecoveryCase", back_populates="communication_logs")
    attempt = relationship("RecoveryAttempt", back_populates="communications")

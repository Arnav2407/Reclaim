from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Text, Integer
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class WebhookEvent(Base):
    __tablename__ = "webhook_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=True)
    event_type: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    payload: Mapped[str] = mapped_column(Text, nullable=False)
    signature: Mapped[str] = mapped_column(String(255), nullable=True)
    
    processed: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    processing_error: Mapped[str] = mapped_column(Text, nullable=True)
    processed_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

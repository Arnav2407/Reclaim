from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    APP_NAME: str = "Reclaim"
    APP_ENV: str = "development"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    DATABASE_URL: str = "sqlite+aiosqlite:///./reclaim.db"
    REDIS_URL: str = "redis://localhost:6379/0"

    RAZORPAY_KEY_ID: str = "rzp_test_placeholder"
    RAZORPAY_KEY_SECRET: str = "rzp_secret_placeholder"
    RAZORPAY_WEBHOOK_SECRET: str = "rzp_webhook_secret_placeholder"

    GEMINI_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None

    # Guardrails
    MAX_RECOVERY_ATTEMPTS: int = 3
    HIGH_VALUE_ESCALATION_THRESHOLD: float = 50000.0  # ₹50,000 threshold
    MAX_DISCOUNT_PERCENTAGE: float = 10.0  # 10%
    MAX_OUTBOUND_MESSAGES: int = 2
    CONTACT_COOLDOWN_HOURS: int = 24

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    DEMO_MODE: bool = False
    FRONTEND_URL: str = "http://localhost:3000"
    PLATFORM_ESCROW_USER_ID: str = "aaaaaaaa-0000-0000-0000-aaaaaaaaaaaa"

    # Derived from DEMO_MODE
    @property
    def AUTO_RELEASE_SECONDS(self) -> int:
        return 120 if self.DEMO_MODE else 86400          # 2 min vs 24h

    @property
    def GHOST_TRIGGER_SECONDS(self) -> int:
        return 0 if self.DEMO_MODE else 259200            # immediate vs 72h

    @property
    def SCHEDULER_AUTO_RELEASE_INTERVAL(self) -> int:
        return 5 if self.DEMO_MODE else 60                # seconds

    @property
    def SCHEDULER_GHOST_INTERVAL(self) -> int:
        return 30 if self.DEMO_MODE else 900              # seconds (15 min)

    # AI
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "openai/o4-mini"
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"

    # Razorpay
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_WEBHOOK_SECRET: str = ""

    # PostgreSQL (local)
    DATABASE_URL: str = "postgresql://localhost/trustlayer"

    # JWT
    JWT_SECRET: str = "change-me-in-prod"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 7    # 7 days

    class Config:
        env_file = ".env"


settings = Settings()

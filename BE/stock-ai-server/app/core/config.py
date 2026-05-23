import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parent.parent.parent / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # FastAPI
    APP_NAME: str = "stock-ai-server"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False

    # Infrastructure URLs
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/stock_ai"
    REDIS_URL: str = "redis://localhost:6379/0"
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"
    SPRING_BOOT_URL: str = "http://localhost:8080"

    # AI Model
    MODEL_NAME: str = "snunlp/KR-FinBert-SC"
    MODEL_DEVICE: str = "cpu"

    # Security
    INTERNAL_API_KEY: str | None = None

    # Naver API Settings
    NAVER_CLIENT_ID: str | None = None
    NAVER_CLIENT_SECRET: str | None = None


settings = Settings()

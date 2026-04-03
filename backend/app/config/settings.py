"""
─── settings.py ──────────────────────────────────────────
Application settings loaded from environment variables.
Uses Pydantic BaseSettings for validation and defaults.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    """Application configuration with environment variable support."""

    # ─── Server ──────────────────────────────────────────
    APP_NAME: str = "SmartChat X"
    DEBUG: bool = True
    SECRET_KEY: str = "change-this-to-a-random-secret"

    # ─── CORS ────────────────────────────────────────────
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
    ]

    # ─── Socket Servers ─────────────────────────────────
    TCP_HOST: str = "127.0.0.1"
    TCP_PORT: int = 9000
    UDP_HOST: str = "127.0.0.1"
    UDP_PORT: int = 9001
    WS_HOST: str = "127.0.0.1"
    WS_PORT: int = 8765

    # ─── AI Configuration ───────────────────────────────
    AI_API_KEY: str = ""
    AI_MODEL: str = "deepseek-chat"

    # ─── Logging ─────────────────────────────────────────
    LOG_LEVEL: str = "INFO"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

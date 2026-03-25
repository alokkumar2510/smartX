"""
─── user.py ──────────────────────────────────────────────
User data model.
"""
from pydantic import BaseModel, Field
from typing import List, Optional


class User(BaseModel):
    """User profile schema."""
    id: Optional[str] = None
    username: str = Field(..., min_length=3, max_length=20)
    xp: int = 0
    level: int = 1
    badges: List[str] = []
    status: str = "online"


class UserSettings(BaseModel):
    """User preferences schema."""
    protocol: str = "AUTO"
    theme: str = "dark"
    notifications: bool = True
    encryption: bool = True

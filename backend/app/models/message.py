"""
─── message.py ───────────────────────────────────────────
Message data model using Pydantic.
"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class Message(BaseModel):
    """Chat message schema."""
    id: Optional[str] = None
    sender: str = Field(..., min_length=1, max_length=20)
    content: str = Field(..., min_length=1, max_length=1000)
    protocol: str = Field(default="TCP", pattern="^(TCP|UDP|HYBRID|WEBRTC)$")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    room_id: str = Field(default="general")
    encrypted: bool = False


class MessageResponse(BaseModel):
    """Response after sending a message."""
    status: str
    message: Message

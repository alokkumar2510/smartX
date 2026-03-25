"""
─── message_service.py ───────────────────────────────────
Core message processing service. Handles message creation,
routing decisions, and storage.
"""
from datetime import datetime
from typing import List, Dict
import uuid


class MessageService:
    """Service for processing and managing chat messages."""

    def __init__(self):
        self._messages: Dict[str, List[dict]] = {}  # room_id -> messages

    def process_message(self, data: dict) -> dict:
        """Process a new message through the pipeline."""
        message = {
            "id": str(uuid.uuid4())[:12],
            "sender": data.get("sender", "Anonymous"),
            "content": data.get("content", ""),
            "protocol": data.get("protocol", "TCP"),
            "timestamp": datetime.utcnow().isoformat(),
            "encrypted": True,
            "room_id": data.get("room_id", "general"),
        }

        # Store message
        room_id = message["room_id"]
        if room_id not in self._messages:
            self._messages[room_id] = []
        self._messages[room_id].append(message)

        return message

    def get_messages(self, room_id: str, limit: int = 50) -> list:
        """Get messages for a room."""
        messages = self._messages.get(room_id, [])
        return messages[-limit:]

    def get_message_count(self) -> int:
        """Get total message count across all rooms."""
        return sum(len(msgs) for msgs in self._messages.values())

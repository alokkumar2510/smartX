"""
─── queue_service.py ─────────────────────────────────────
Priority-based message queue with offline storage.
"""
import heapq
from datetime import datetime


class QueueService:
    """Priority message queue for handling message delivery."""

    PRIORITY_MAP = {"critical": 0, "high": 1, "normal": 2, "low": 3}

    def __init__(self):
        self._queue = []
        self._offline_store = {}  # user_id -> messages

    def enqueue(self, message: dict, priority: str = "normal"):
        """Add a message to the priority queue."""
        p = self.PRIORITY_MAP.get(priority, 2)
        heapq.heappush(self._queue, (p, datetime.utcnow().isoformat(), message))

    def dequeue(self):
        """Get the highest priority message."""
        if self._queue:
            _, _, message = heapq.heappop(self._queue)
            return message
        return None

    def store_offline(self, user_id: str, message: dict):
        """Store a message for an offline user."""
        self._offline_store.setdefault(user_id, []).append(message)

    def get_offline_messages(self, user_id: str) -> list:
        """Retrieve and clear offline messages for a user."""
        messages = self._offline_store.pop(user_id, [])
        return messages

    @property
    def size(self):
        return len(self._queue)

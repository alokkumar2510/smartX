#!/usr/bin/env python3
"""
server/queue_manager.py — SmartChat X Intelligent Message Queue
══════════════════════════════════════════════════════════════
Priority-based message queue that:
  • Stores messages when users are offline
  • Delivers queued messages on reconnect
  • Prioritizes important messages (critical > high > normal > low)
  • Tracks queue metrics for the dashboard
"""

import time
import heapq
import logging
from collections import defaultdict
from threading import Lock

logger = logging.getLogger("SmartChatX.Queue")


class QueuedMessage:
    """A message waiting in the queue."""

    def __init__(self, sender: str, recipient: str, text: str, 
                 priority: int = 2, msg_type: str = "chat"):
        self.sender = sender
        self.recipient = recipient
        self.text = text
        self.priority = priority      # 0=critical, 1=high, 2=normal, 3=low
        self.msg_type = msg_type
        self.timestamp = time.time()
        self.id = f"MSG-{int(self.timestamp * 1000) % 100000}"
        self.attempts = 0
        self.delivered = False

    def __lt__(self, other):
        """Priority queue comparison (lower priority number = higher priority)."""
        if self.priority != other.priority:
            return self.priority < other.priority
        return self.timestamp < other.timestamp  # Older first at same priority

    def to_dict(self):
        return {
            "id": self.id,
            "sender": self.sender,
            "recipient": self.recipient,
            "text": self.text[:50] + ("..." if len(self.text) > 50 else ""),
            "priority": self.priority,
            "priority_label": ["CRITICAL", "HIGH", "NORMAL", "LOW"][self.priority],
            "msg_type": self.msg_type,
            "timestamp": self.timestamp,
            "age_seconds": round(time.time() - self.timestamp, 1),
            "attempts": self.attempts
        }


class MessageQueue:
    """
    Intelligent message queue with priority ordering.
    
    Queue Architecture:
    ┌────────────────────────────────────────────┐
    │  INCOMING MESSAGE                          │
    │       ↓                                    │
    │  [Priority Classification]                 │
    │       ↓                                    │
    │  ┌─────────────┐                           │
    │  │ User Online? │──Yes──→ Deliver directly │
    │  └──────┬──────┘                           │
    │         No                                 │
    │         ↓                                  │
    │  ┌──────────────┐                          │
    │  │ Priority Heap │  (min-heap by priority) │
    │  │  P0: ■■■      │                         │
    │  │  P1: ■■       │                         │
    │  │  P2: ■■■■■    │                         │
    │  │  P3: ■        │                         │
    │  └──────────────┘                          │
    │         ↓ (on reconnect)                   │
    │  [Drain queue → deliver in priority order] │
    └────────────────────────────────────────────┘
    """

    def __init__(self):
        self.queues = defaultdict(list)  # {username: [QueuedMessage heap]}
        self.lock = Lock()
        self.total_queued = 0
        self.total_delivered = 0
        self.total_dropped = 0
        self.online_users = set()
        self.max_queue_size = 100       # Per-user max
        logger.info("📡 Message Queue initialized (priority-based)")

    def set_user_online(self, username: str):
        """Mark user as online."""
        self.online_users.add(username)
        logger.info(f"📡 Queue | {username} → ONLINE")

    def set_user_offline(self, username: str):
        """Mark user as offline."""
        self.online_users.discard(username)
        logger.info(f"📡 Queue | {username} → OFFLINE "
                     f"(queued messages: {len(self.queues.get(username, []))})")

    def is_user_online(self, username: str) -> bool:
        return username in self.online_users

    def enqueue(self, sender: str, recipient: str, text: str,
                priority: int = 2, msg_type: str = "chat") -> dict:
        """
        Queue a message for an offline user.
        Returns queue status info.
        """
        msg = QueuedMessage(sender, recipient, text, priority, msg_type)

        with self.lock:
            if len(self.queues[recipient]) >= self.max_queue_size:
                # Drop lowest priority message to make room
                self.queues[recipient].sort()
                if self.queues[recipient][-1].priority > priority:
                    dropped = self.queues[recipient].pop()
                    self.total_dropped += 1
                    logger.info(f"📡 Queue | Dropped low-priority msg {dropped.id} "
                                f"to make room for {msg.id}")
                else:
                    self.total_dropped += 1
                    logger.warning(f"📡 Queue | FULL for {recipient}, "
                                    f"dropping new msg {msg.id}")
                    return {
                        "status": "dropped",
                        "reason": "queue_full",
                        "queue_size": len(self.queues[recipient])
                    }

            heapq.heappush(self.queues[recipient], msg)
            self.total_queued += 1

        queue_size = len(self.queues[recipient])
        logger.info(f"📡 QUEUED | {msg.id} | {sender} → {recipient} | "
                     f"Priority: {msg.priority} | Queue size: {queue_size}")

        return {
            "status": "queued",
            "message_id": msg.id,
            "priority": priority,
            "queue_size": queue_size,
            "position": queue_size  # Approximate
        }

    def dequeue_all(self, username: str) -> list:
        """
        Drain all queued messages for a user (when they reconnect).
        Messages returned in priority order.
        """
        with self.lock:
            if username not in self.queues or not self.queues[username]:
                return []

            messages = []
            while self.queues[username]:
                msg = heapq.heappop(self.queues[username])
                msg.delivered = True
                msg.attempts += 1
                messages.append(msg)
                self.total_delivered += 1

        logger.info(f"📡 DELIVER | {len(messages)} queued messages → {username}")
        for msg in messages:
            logger.debug(f"  └─ {msg.id} from {msg.sender} (P{msg.priority})")

        return messages

    def peek(self, username: str, count: int = 5) -> list:
        """Preview queued messages without removing them."""
        with self.lock:
            msgs = sorted(self.queues.get(username, []))[:count]
            return [m.to_dict() for m in msgs]

    def get_queue_size(self, username: str) -> int:
        return len(self.queues.get(username, []))

    def get_stats(self) -> dict:
        """Return queue statistics for the dashboard."""
        queue_sizes = {user: len(q) for user, q in self.queues.items() if q}
        return {
            "total_queued": self.total_queued,
            "total_delivered": self.total_delivered,
            "total_dropped": self.total_dropped,
            "online_users": len(self.online_users),
            "offline_users_with_queue": len(queue_sizes),
            "pending_messages": sum(queue_sizes.values()),
            "queue_sizes": queue_sizes,
            "delivery_rate": round(
                self.total_delivered / max(self.total_queued, 1) * 100, 1
            )
        }


# Singleton
message_queue = MessageQueue()

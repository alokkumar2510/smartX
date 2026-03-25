#!/usr/bin/env python3
"""
server/router.py — SmartChat X Adaptive Multi-Protocol Router
═════════════════════════════════════════════════════════════
Intelligently selects the optimal protocol (TCP/UDP/Hybrid) for
each message based on content analysis, priority, and network conditions.
Logs every routing decision for the dashboard.
"""

import time
import logging
from collections import defaultdict

logger = logging.getLogger("SmartChatX.Router")


class RoutingDecision:
    """Represents a single routing decision with full metadata."""

    def __init__(self, message_type, protocol, reason, priority, latency_estimate):
        self.message_type = message_type
        self.protocol = protocol         # "TCP", "UDP", "HYBRID"
        self.reason = reason
        self.priority = priority         # 0=critical, 1=high, 2=normal, 3=low
        self.latency_estimate = latency_estimate
        self.timestamp = time.time()
        self.id = f"RTD-{int(self.timestamp * 1000) % 100000}"

    def to_dict(self):
        return {
            "id": self.id,
            "message_type": self.message_type,
            "protocol": self.protocol,
            "reason": self.reason,
            "priority": self.priority,
            "latency_ms": self.latency_estimate,
            "timestamp": self.timestamp
        }


class AdaptiveRouter:
    """
    Analyzes messages and decides optimal transport protocol.
    
    Routing Logic:
    ┌─────────────────┬──────────┬─────────────────────────────┐
    │ Message Type     │ Protocol │ Reason                      │
    ├─────────────────┼──────────┼─────────────────────────────┤
    │ Chat message    │ TCP      │ Reliable delivery required  │
    │ Typing status   │ UDP      │ Speed over reliability      │
    │ Presence update │ UDP      │ Ephemeral, loss acceptable  │
    │ File/media      │ HYBRID   │ TCP control + UDP data      │
    │ System command  │ TCP      │ Must be delivered            │
    │ AI response     │ TCP      │ Important content           │
    │ Encrypted msg   │ TCP      │ Integrity critical          │
    │ Ping/heartbeat  │ UDP      │ Minimal overhead needed     │
    │ Priority msg    │ TCP      │ Marked as important         │
    │ Bulk broadcast  │ HYBRID   │ Mixed reliability needs     │
    └─────────────────┴──────────┴─────────────────────────────┘
    """

    def __init__(self):
        self.decision_log = []
        self.stats = defaultdict(int)  # {protocol: count}
        self.total_routed = 0
        logger.info("🌐 Adaptive Router initialized")

    def route(self, message_type: str, content: str = "", 
              is_encrypted: bool = False, priority: int = 2) -> RoutingDecision:
        """
        Determine optimal protocol for a message.

        Args:
            message_type: Type of message (chat, typing, presence, file, system, ai, ping)
            content: Message content for analysis
            is_encrypted: Whether message is encrypted
            priority: 0-3 priority level

        Returns:
            RoutingDecision with protocol choice and reasoning
        """
        self.total_routed += 1

        # ── Priority override ─────────────────────────────────
        if priority == 0:  # Critical
            decision = RoutingDecision(
                message_type, "TCP",
                "CRITICAL priority → TCP forced for guaranteed delivery",
                priority, 15
            )
        # ── Type-based routing ────────────────────────────────
        elif message_type == "typing":
            decision = RoutingDecision(
                message_type, "UDP",
                "Typing indicator → UDP for minimal latency (loss acceptable)",
                3, 2
            )
        elif message_type == "presence":
            decision = RoutingDecision(
                message_type, "UDP",
                "Presence update → UDP (ephemeral status, fire-and-forget)",
                3, 2
            )
        elif message_type == "ping":
            decision = RoutingDecision(
                message_type, "UDP",
                "Heartbeat ping → UDP (minimal overhead, fast round-trip)",
                3, 1
            )
        elif message_type == "file":
            decision = RoutingDecision(
                message_type, "HYBRID",
                "File transfer → HYBRID (TCP for metadata/control, UDP for data chunks)",
                1, 50
            )
        elif message_type == "system":
            decision = RoutingDecision(
                message_type, "TCP",
                "System command → TCP (must be delivered and acknowledged)",
                0, 10
            )
        elif message_type == "ai":
            decision = RoutingDecision(
                message_type, "TCP",
                "AI response → TCP (important generated content, reliable delivery)",
                1, 20
            )
        elif is_encrypted:
            decision = RoutingDecision(
                message_type, "TCP",
                "Encrypted message → TCP (integrity verification required)",
                1, 18
            )
        elif message_type == "chat":
            # Analyze content for importance
            if self._is_important_content(content):
                decision = RoutingDecision(
                    message_type, "TCP",
                    "Important chat content detected → TCP for reliable delivery",
                    1, 12
                )
            elif len(content) > 500:
                decision = RoutingDecision(
                    message_type, "HYBRID",
                    "Long message → HYBRID (TCP header + segmented delivery)",
                    2, 25
                )
            else:
                decision = RoutingDecision(
                    message_type, "TCP",
                    "Standard chat message → TCP for ordered, reliable delivery",
                    2, 10
                )
        else:
            decision = RoutingDecision(
                message_type, "TCP",
                "Unknown type → TCP fallback (safety first)",
                2, 15
            )

        # Log decision
        self.decision_log.append(decision.to_dict())
        if len(self.decision_log) > 500:
            self.decision_log = self.decision_log[-500:]

        self.stats[decision.protocol] += 1

        logger.info(f"🛤️  ROUTE | [{decision.id}] {message_type} → {decision.protocol} | "
                     f"Priority: {priority} | Reason: {decision.reason[:60]}...")

        return decision

    def _is_important_content(self, content: str) -> bool:
        """Detect if message content seems important."""
        important_markers = [
            '!important', 'urgent', 'asap', 'critical', 'attention',
            'deadline', 'emergency', 'warning', 'alert', '@everyone'
        ]
        content_lower = content.lower()
        return any(marker in content_lower for marker in important_markers)

    def get_stats(self) -> dict:
        """Return routing statistics for the dashboard."""
        total = max(self.total_routed, 1)
        return {
            "total_routed": self.total_routed,
            "by_protocol": dict(self.stats),
            "tcp_percentage": round(self.stats.get("TCP", 0) / total * 100, 1),
            "udp_percentage": round(self.stats.get("UDP", 0) / total * 100, 1),
            "hybrid_percentage": round(self.stats.get("HYBRID", 0) / total * 100, 1),
            "recent_decisions": self.decision_log[-10:]
        }


# Singleton
router = AdaptiveRouter()

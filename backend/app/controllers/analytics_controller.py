"""
─── analytics_controller.py ──────────────────────────────
Orchestrates analytics data aggregation.
"""
import random
from datetime import datetime, timedelta


class AnalyticsController:
    async def get_stats(self):
        """Get overall dashboard statistics."""
        return {
            "total_messages": 1247,
            "online_users": 8,
            "avg_latency_ms": 14,
            "encryption_rate": 0.98,
            "tcp_count": 560,
            "udp_count": 420,
            "hybrid_count": 267,
        }

    async def get_protocol_distribution(self):
        """Get protocol usage breakdown."""
        return {
            "TCP": 45,
            "UDP": 30,
            "HYBRID": 25,
        }

    async def get_latency_history(self, minutes: int):
        """Get latency data points."""
        return {
            "data": [random.randint(8, 30) for _ in range(minutes)],
            "unit": "ms",
        }

    async def get_timeline(self, interval: str):
        """Get message activity timeline."""
        now = datetime.utcnow()
        return {
            "data": [
                {"label": (now - timedelta(minutes=i * 5)).strftime("%H:%M"), "count": random.randint(1, 15)}
                for i in range(6)
            ]
        }

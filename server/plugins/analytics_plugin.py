#!/usr/bin/env python3
"""
server/plugins/analytics_plugin.py — Analytics Plugin
═══════════════════════════════════════════════════
Real-time analytics tracking for the dashboard.
"""

import time
from collections import defaultdict, Counter
from server.plugins.plugin_base import PluginBase
import logging

logger = logging.getLogger("SmartChatX.Plugins.Analytics")


class AnalyticsPlugin(PluginBase):
    def __init__(self):
        super().__init__(
            name="Analytics Engine",
            version="1.0",
            description="Real-time message analytics, word clouds, activity tracking"
        )
        self.message_counts = defaultdict(int)  # {user: count}
        self.hourly_activity = defaultdict(int)  # {hour: count}
        self.word_frequency = Counter()
        self.message_lengths = []
        self.response_times = {}  # {user: last_message_time}
        self.avg_response_time = 0
        self.peak_concurrent = 0
        self.current_online = set()
        self.timeline = []  # [{time, count}]

    def on_message(self, message: dict) -> dict:
        sender = message.get("sender", "unknown")
        text = message.get("text", "")
        now = time.time()

        # Track message count per user
        self.message_counts[sender] += 1

        # Hourly activity
        hour = time.localtime().tm_hour
        self.hourly_activity[hour] += 1

        # Word frequency (simple)
        words = text.lower().split()
        # Filter short words
        meaningful = [w for w in words if len(w) > 3]
        self.word_frequency.update(meaningful)

        # Message length tracking
        self.message_lengths.append(len(text))
        if len(self.message_lengths) > 1000:
            self.message_lengths = self.message_lengths[-1000:]

        # Response time
        if sender in self.response_times:
            rt = now - self.response_times[sender]
            if rt < 300:  # Only count if within 5 min
                self.avg_response_time = (self.avg_response_time + rt) / 2

        self.response_times[sender] = now

        # Timeline
        self.timeline.append({"time": now, "user": sender})
        if len(self.timeline) > 500:
            self.timeline = self.timeline[-500:]

        # Attach analytics metadata
        message["analytics"] = {
            "user_total": self.message_counts[sender],
            "word_count": len(words),
            "char_count": len(text),
            "hour": hour
        }

        return message

    def on_event(self, event_type: str, data: dict) -> dict:
        super().on_event(event_type, data)

        if event_type == "user_join":
            self.current_online.add(data.get("username", ""))
            self.peak_concurrent = max(self.peak_concurrent, len(self.current_online))
        elif event_type == "user_leave":
            self.current_online.discard(data.get("username", ""))

        return data

    def get_analytics(self) -> dict:
        total_msgs = sum(self.message_counts.values())
        avg_length = (
            sum(self.message_lengths) / len(self.message_lengths)
            if self.message_lengths else 0
        )

        return {
            "total_messages": total_msgs,
            "unique_users": len(self.message_counts),
            "messages_per_user": dict(self.message_counts),
            "top_words": self.word_frequency.most_common(15),
            "avg_message_length": round(avg_length, 1),
            "avg_response_time_sec": round(self.avg_response_time, 2),
            "peak_concurrent_users": self.peak_concurrent,
            "hourly_activity": dict(self.hourly_activity),
            "current_online": len(self.current_online),
            "messages_last_5_min": sum(
                1 for t in self.timeline
                if time.time() - t["time"] < 300
            )
        }


# Singleton
analytics_plugin = AnalyticsPlugin()

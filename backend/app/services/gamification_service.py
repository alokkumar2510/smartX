"""
─── gamification_service.py ──────────────────────────────
XP, leveling, and badge system for user engagement.
"""

from typing import Optional


class GamificationService:
    """Manages XP, levels, and badges."""

    BADGES = {
        "first_message": {
            "name": "First Words",
            "desc": "Send your first message",
            "xp_required": 0,
        },
        "chatterbox": {
            "name": "Chatterbox",
            "desc": "Send 50 messages",
            "xp_required": 250,
        },
        "tcp_master": {
            "name": "TCP Master",
            "desc": "Send 100 TCP messages",
            "xp_required": 500,
        },
        "udp_speedster": {
            "name": "UDP Speedster",
            "desc": "Send 100 UDP messages",
            "xp_required": 500,
        },
        "crypto_knight": {
            "name": "Crypto Knight",
            "desc": "Send 50 encrypted msgs",
            "xp_required": 300,
        },
    }

    XP_PER_MESSAGE = 5
    XP_PER_LEVEL = 100

    def award_xp(self, user: dict, amount: Optional[int] = None) -> dict:
        """Award XP to a user and check for level up."""
        xp_gain = amount or self.XP_PER_MESSAGE
        user["xp"] = user.get("xp", 0) + xp_gain
        new_level = (user["xp"] // self.XP_PER_LEVEL) + 1

        leveled_up = new_level > user.get("level", 1)
        user["level"] = new_level

        return {
            "xp_gained": xp_gain,
            "total_xp": user["xp"],
            "level": new_level,
            "leveled_up": leveled_up,
        }

    def check_badges(self, user: dict, stats: dict) -> list:
        """Check and award new badges based on stats."""
        earned = []
        for badge_id, badge in self.BADGES.items():
            if badge_id not in user.get("badges", []):
                if user.get("xp", 0) >= badge["xp_required"]:
                    user.setdefault("badges", []).append(badge_id)
                    earned.append(badge)
        return earned

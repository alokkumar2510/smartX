#!/usr/bin/env python3
"""
server/gamification.py — SmartChat X Gamification Engine
═══════════════════════════════════════════════════════
XP system, levels, badges, and leaderboard.
Makes the chat experience engaging and rewarding.
"""

import time
import logging
from collections import defaultdict
from common.config import (
    XP_PER_MESSAGE, XP_PER_AI_USE, XP_PER_MINUTE, XP_PER_ENCRYPTION,
    LEVEL_THRESHOLDS, BADGE_DEFINITIONS
)

logger = logging.getLogger("SmartChatX.Game")


class PlayerProfile:
    """Individual user's gamification profile."""

    def __init__(self, username: str):
        self.username = username
        self.xp = 0
        self.level = 1
        self.badges = []
        self.message_count = 0
        self.ai_uses = 0
        self.encrypted_count = 0
        self.session_start = time.time()
        self.total_online_seconds = 0
        self.last_activity = time.time()
        self.message_timestamps = []
        self.achievements_log = []

    def add_xp(self, amount: int, reason: str) -> dict:
        """Add XP and check for level up."""
        old_level = self.level
        self.xp += amount
        self.last_activity = time.time()

        # Calculate new level
        new_level = 1
        for i, threshold in enumerate(LEVEL_THRESHOLDS):
            if self.xp >= threshold:
                new_level = i + 1

        self.level = new_level
        leveled_up = new_level > old_level

        result = {
            "xp_gained": amount,
            "reason": reason,
            "total_xp": self.xp,
            "level": self.level,
            "leveled_up": leveled_up,
            "old_level": old_level,
            "xp_to_next": self._xp_to_next_level(),
            "progress": self._level_progress()
        }

        if leveled_up:
            logger.info(f"🎮 LEVEL UP! | {self.username} → Level {new_level} "
                         f"(XP: {self.xp})")
            self.achievements_log.append({
                "type": "level_up",
                "value": new_level,
                "time": time.time()
            })

        return result

    def _xp_to_next_level(self) -> int:
        """XP needed for next level."""
        if self.level >= len(LEVEL_THRESHOLDS):
            return 0
        return LEVEL_THRESHOLDS[self.level] - self.xp

    def _level_progress(self) -> float:
        """Progress toward next level (0.0 - 1.0)."""
        if self.level >= len(LEVEL_THRESHOLDS):
            return 1.0
        if self.level <= 0:
            return 0.0
        current_threshold = LEVEL_THRESHOLDS[self.level - 1]
        next_threshold = LEVEL_THRESHOLDS[self.level] if self.level < len(LEVEL_THRESHOLDS) else current_threshold
        range_xp = next_threshold - current_threshold
        if range_xp <= 0:
            return 1.0
        return min((self.xp - current_threshold) / range_xp, 1.0)

    def check_badges(self) -> list:
        """Check and award any new badges."""
        new_badges = []

        badge_checks = {
            "first_message": self.message_count >= 1,
            "chat_10": self.message_count >= 10,
            "chat_50": self.message_count >= 50,
            "ai_user": self.ai_uses >= 1,
            "encrypted": self.encrypted_count >= 1,
            "level_5": self.level >= 5,
            "level_10": self.level >= 10,
            "speed_demon": self._check_speed_demon(),
            "night_owl": self._check_night_owl(),
        }

        for badge_id, condition in badge_checks.items():
            if condition and badge_id not in self.badges:
                self.badges.append(badge_id)
                badge_info = BADGE_DEFINITIONS.get(badge_id, {})
                new_badges.append({
                    "id": badge_id,
                    "name": badge_info.get("name", badge_id),
                    "icon": badge_info.get("icon", "🏅"),
                    "desc": badge_info.get("desc", "")
                })
                logger.info(f"🏅 BADGE | {self.username} earned: "
                             f"{badge_info.get('icon', '')} {badge_info.get('name', badge_id)}")
                self.achievements_log.append({
                    "type": "badge",
                    "badge_id": badge_id,
                    "time": time.time()
                })

        return new_badges

    def _check_speed_demon(self) -> bool:
        """Check if 5 messages were sent within 10 seconds."""
        now = time.time()
        recent = [t for t in self.message_timestamps if now - t < 10]
        return len(recent) >= 5

    def _check_night_owl(self) -> bool:
        """Check if user chatted after midnight."""
        hour = time.localtime().tm_hour
        return hour >= 0 and hour < 5 and self.message_count > 0

    def to_dict(self) -> dict:
        return {
            "username": self.username,
            "xp": self.xp,
            "level": self.level,
            "badges": self.badges,
            "badge_details": [
                {**BADGE_DEFINITIONS[b], "id": b}
                for b in self.badges if b in BADGE_DEFINITIONS
            ],
            "message_count": self.message_count,
            "ai_uses": self.ai_uses,
            "xp_to_next": self._xp_to_next_level(),
            "progress": round(self._level_progress(), 3),
            "session_duration": round(time.time() - self.session_start),
            "last_activity": self.last_activity
        }


class GamificationEngine:
    """Manages all player profiles, XP, badges, and leaderboard."""

    def __init__(self):
        self.profiles = {}  # {username: PlayerProfile}
        logger.info("🎮 Gamification Engine initialized")

    def get_or_create_profile(self, username: str) -> PlayerProfile:
        if username not in self.profiles:
            self.profiles[username] = PlayerProfile(username)
            logger.info(f"🎮 New profile created: {username}")
        return self.profiles[username]

    def on_message_sent(self, username: str) -> dict:
        """Process a message send event."""
        profile = self.get_or_create_profile(username)
        profile.message_count += 1
        profile.message_timestamps.append(time.time())
        # Keep only recent timestamps
        if len(profile.message_timestamps) > 50:
            profile.message_timestamps = profile.message_timestamps[-50:]

        xp_result = profile.add_xp(XP_PER_MESSAGE, "Message sent")
        new_badges = profile.check_badges()

        return {
            "xp": xp_result,
            "new_badges": new_badges,
            "profile": profile.to_dict()
        }

    def on_ai_use(self, username: str) -> dict:
        profile = self.get_or_create_profile(username)
        profile.ai_uses += 1
        xp_result = profile.add_xp(XP_PER_AI_USE, "AI feature used")
        new_badges = profile.check_badges()
        return {"xp": xp_result, "new_badges": new_badges}

    def on_encrypted_message(self, username: str) -> dict:
        profile = self.get_or_create_profile(username)
        profile.encrypted_count += 1
        xp_result = profile.add_xp(XP_PER_ENCRYPTION, "Encrypted message")
        new_badges = profile.check_badges()
        return {"xp": xp_result, "new_badges": new_badges}

    def tick_online_xp(self, username: str) -> dict:
        """Give XP for time spent online (called periodically)."""
        profile = self.get_or_create_profile(username)
        xp_result = profile.add_xp(XP_PER_MINUTE, "Online time bonus")
        return {"xp": xp_result}

    def get_leaderboard(self, limit: int = 10) -> list:
        """Get top players by XP."""
        sorted_profiles = sorted(
            self.profiles.values(),
            key=lambda p: p.xp,
            reverse=True
        )[:limit]

        return [{
            "rank": i + 1,
            "username": p.username,
            "xp": p.xp,
            "level": p.level,
            "badges": len(p.badges),
            "messages": p.message_count,
            "badge_icons": [
                BADGE_DEFINITIONS[b]["icon"]
                for b in p.badges if b in BADGE_DEFINITIONS
            ]
        } for i, p in enumerate(sorted_profiles)]

    def get_profile(self, username: str) -> dict:
        profile = self.get_or_create_profile(username)
        return profile.to_dict()

    def get_stats(self) -> dict:
        return {
            "total_players": len(self.profiles),
            "total_xp_awarded": sum(p.xp for p in self.profiles.values()),
            "total_badges_earned": sum(len(p.badges) for p in self.profiles.values()),
            "highest_level": max((p.level for p in self.profiles.values()), default=1),
            "leaderboard": self.get_leaderboard(5)
        }


# Singleton
gamification = GamificationEngine()

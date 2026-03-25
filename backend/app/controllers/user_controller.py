"""
─── user_controller.py ───────────────────────────────────
Orchestrates user management operations.
"""
import uuid


class UserController:
    def __init__(self):
        self.users = {}
        self.online_users = {}

    async def register(self, username: str):
        """Register a new user."""
        user_id = str(uuid.uuid4())[:8]
        user = {"id": user_id, "username": username, "xp": 0, "level": 1, "badges": []}
        self.users[user_id] = user
        self.online_users[user_id] = user
        return {"status": "registered", "user": user}

    async def get_profile(self, user_id: str):
        """Get user profile."""
        user = self.users.get(user_id)
        if not user:
            return {"error": "User not found"}
        return {"user": user}

    async def update_settings(self, settings: dict):
        """Update user settings."""
        return {"status": "updated", "settings": settings}

    async def get_online(self):
        """Get online users."""
        return {"users": list(self.online_users.values()), "count": len(self.online_users)}

    async def get_leaderboard(self):
        """Get XP leaderboard."""
        sorted_users = sorted(self.users.values(), key=lambda u: u.get("xp", 0), reverse=True)
        return {"leaderboard": sorted_users[:10]}

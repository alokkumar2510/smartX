"""
─── user_routes.py ───────────────────────────────────────
User management API endpoints.
"""
from fastapi import APIRouter
from app.controllers.user_controller import UserController

router = APIRouter()
controller = UserController()


@router.post("/register")
async def register_user(payload: dict):
    """Register a new user with a username."""
    return await controller.register(payload.get("username", ""))


@router.get("/{user_id}")
async def get_user(user_id: str):
    """Get user profile by ID."""
    return await controller.get_profile(user_id)


@router.put("/settings")
async def update_settings(payload: dict):
    """Update user settings."""
    return await controller.update_settings(payload)


@router.get("/online")
async def get_online_users():
    """Get list of currently online users."""
    return await controller.get_online()


@router.get("/leaderboard")
async def get_leaderboard():
    """Get gamification leaderboard."""
    return await controller.get_leaderboard()

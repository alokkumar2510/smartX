"""
─── analytics_routes.py ──────────────────────────────────
Analytics data API endpoints.
"""
from fastapi import APIRouter
from app.controllers.analytics_controller import AnalyticsController

router = APIRouter()
controller = AnalyticsController()


@router.get("/stats")
async def get_stats():
    """Get overall dashboard statistics."""
    return await controller.get_stats()


@router.get("/protocols")
async def get_protocol_distribution():
    """Get protocol usage distribution."""
    return await controller.get_protocol_distribution()


@router.get("/latency")
async def get_latency_history(minutes: int = 30):
    """Get latency history for the specified time window."""
    return await controller.get_latency_history(minutes)


@router.get("/timeline")
async def get_message_timeline(interval: str = "5m"):
    """Get message activity timeline."""
    return await controller.get_timeline(interval)

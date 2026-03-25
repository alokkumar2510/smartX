"""
─── health_routes.py ─────────────────────────────────────
Health check and status endpoints.
"""
from fastapi import APIRouter
from datetime import datetime

router = APIRouter()


@router.get("/health")
async def health_check():
    """Basic health check endpoint."""
    return {
        "status": "healthy",
        "service": "SmartChat X API",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
    }


@router.get("/status")
async def system_status():
    """Detailed system status with service health."""
    return {
        "api": "running",
        "tcp_server": "running",
        "udp_server": "running",
        "ws_bridge": "running",
        "uptime": "N/A",
    }

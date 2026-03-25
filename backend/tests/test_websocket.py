"""
─── test_websocket.py ────────────────────────────────────
Tests for WebSocket manager.
"""
from app.sockets.ws_manager import WebSocketManager


def test_manager_init():
    """Test WebSocket manager initializes correctly."""
    manager = WebSocketManager()
    assert manager.connection_count == 0
    assert manager.online_users == []

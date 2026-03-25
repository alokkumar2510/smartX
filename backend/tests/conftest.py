"""
─── conftest.py ──────────────────────────────────────────
Pytest fixtures for backend tests.
"""
import pytest


@pytest.fixture
def sample_message():
    """Sample message fixture."""
    return {
        "sender": "TestUser",
        "content": "Hello from tests!",
        "protocol": "TCP",
        "room_id": "general",
    }


@pytest.fixture
def sample_user():
    """Sample user fixture."""
    return {
        "id": "test-001",
        "username": "TestUser",
        "xp": 0,
        "level": 1,
        "badges": [],
    }

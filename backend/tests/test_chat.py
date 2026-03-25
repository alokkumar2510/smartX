"""
─── test_chat.py ─────────────────────────────────────────
Tests for chat endpoints and message processing.
"""
from app.services.message_service import MessageService


def test_process_message():
    """Test message processing creates valid message."""
    service = MessageService()
    message = service.process_message({
        "sender": "TestUser",
        "content": "Hello World",
        "protocol": "TCP",
    })
    assert message["sender"] == "TestUser"
    assert message["content"] == "Hello World"
    assert message["protocol"] == "TCP"
    assert "id" in message
    assert "timestamp" in message


def test_get_messages():
    """Test retrieving messages."""
    service = MessageService()
    service.process_message({"sender": "A", "content": "Msg 1", "room_id": "test"})
    service.process_message({"sender": "B", "content": "Msg 2", "room_id": "test"})

    messages = service.get_messages("test")
    assert len(messages) == 2


def test_message_count():
    """Test total message count."""
    service = MessageService()
    service.process_message({"sender": "A", "content": "Test"})
    assert service.get_message_count() == 1

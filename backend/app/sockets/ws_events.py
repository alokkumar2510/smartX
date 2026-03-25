"""
─── ws_events.py ─────────────────────────────────────────
WebSocket event handler definitions.
"""

# Event type constants
CHAT_MESSAGE = "chat_message"
TYPING_START = "typing_start"
TYPING_STOP = "typing_stop"
USER_JOINED = "user_joined"
USER_LEFT = "user_left"
PRESENCE_UPDATE = "presence_update"
PROTOCOL_SWITCH = "protocol_switch"
SYSTEM_MESSAGE = "system_message"


def create_event(event_type: str, data: dict) -> dict:
    """Create a standardized WebSocket event."""
    return {
        "type": event_type,
        **data,
    }

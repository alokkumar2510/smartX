"""
─── constants.py ─────────────────────────────────────────
Backend-specific constants.
"""

# Protocol types
PROTOCOL_TCP = "TCP"
PROTOCOL_UDP = "UDP"
PROTOCOL_HYBRID = "HYBRID"
PROTOCOL_WEBRTC = "WEBRTC"

# Message limits
MAX_MESSAGE_LENGTH = 1000
MAX_USERNAME_LENGTH = 20
MIN_USERNAME_LENGTH = 3

# WebSocket events
WS_EVENT_CHAT = "chat_message"
WS_EVENT_TYPING = "typing"
WS_EVENT_PRESENCE = "presence"
WS_EVENT_JOIN = "user_joined"
WS_EVENT_LEAVE = "user_left"
WS_EVENT_USER_LIST = "user_list"

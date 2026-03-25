"""
─── events.py ────────────────────────────────────────────
Event type definitions for WebSocket and inter-module
communication.
"""

# ─── Client → Server Events ─────────────────────────────
EVENT_CONNECT = "connect"
EVENT_DISCONNECT = "disconnect"
EVENT_SEND_MESSAGE = "send_message"
EVENT_START_TYPING = "start_typing"
EVENT_STOP_TYPING = "stop_typing"
EVENT_JOIN_ROOM = "join_room"
EVENT_LEAVE_ROOM = "leave_room"
EVENT_SWITCH_PROTOCOL = "switch_protocol"
EVENT_REQUEST_P2P = "request_p2p"

# ─── Server → Client Events ─────────────────────────────
EVENT_MESSAGE_RECEIVED = "message_received"
EVENT_USER_JOINED = "user_joined"
EVENT_USER_LEFT = "user_left"
EVENT_USER_TYPING = "user_typing"
EVENT_USER_LIST = "user_list"
EVENT_PROTOCOL_CHANGED = "protocol_changed"
EVENT_ERROR = "error"
EVENT_SYSTEM_MESSAGE = "system_message"
EVENT_ANALYTICS_UPDATE = "analytics_update"

# ─── Internal Events ────────────────────────────────────
EVENT_AI_ANALYSIS = "ai_analysis_complete"
EVENT_BLOCKCHAIN_MINED = "block_mined"
EVENT_QUEUE_OVERFLOW = "queue_overflow"
EVENT_NODE_FAILURE = "node_failure"

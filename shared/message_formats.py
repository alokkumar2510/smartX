"""
─── message_formats.py ───────────────────────────────────
Standard message format definitions shared between
client and server.
"""

# ─── Chat Message Format ────────────────────────────────
CHAT_MESSAGE_FORMAT = {
    "type": "chat_message",
    "sender": "",          # Username of the sender
    "content": "",         # Message text content
    "protocol": "TCP",     # Transport protocol used
    "room_id": "general",  # Chat room ID
    "timestamp": "",       # ISO 8601 timestamp
    "encrypted": False,    # Whether the message is encrypted
    "metadata": {},        # Optional metadata (AI analysis, etc.)
}

# ─── Typing Indicator Format ────────────────────────────
TYPING_FORMAT = {
    "type": "typing",
    "user": "",
    "room_id": "general",
    "is_typing": True,
}

# ─── Presence Update Format ─────────────────────────────
PRESENCE_FORMAT = {
    "type": "presence",
    "user": "",
    "status": "online",   # online, offline, away, busy
}

# ─── System Message Format ──────────────────────────────
SYSTEM_MESSAGE_FORMAT = {
    "type": "system",
    "content": "",
    "severity": "info",    # info, warning, error
    "timestamp": "",
}

# ─── Protocol Switch Request ────────────────────────────
PROTOCOL_SWITCH_FORMAT = {
    "type": "protocol_switch",
    "from_protocol": "",
    "to_protocol": "",
    "reason": "",
}

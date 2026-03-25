"""
─── validators.py ────────────────────────────────────────
Input validation utilities for the backend.
"""
import re


def validate_username(username: str) -> bool:
    """Validate username format (3-20 chars, alphanumeric + underscore)."""
    return bool(re.match(r'^[a-zA-Z0-9_]{3,20}$', username))


def validate_message(content: str) -> bool:
    """Validate message content."""
    return isinstance(content, str) and 0 < len(content.strip()) <= 1000


def validate_protocol(protocol: str) -> bool:
    """Validate protocol selection."""
    return protocol.upper() in ("TCP", "UDP", "HYBRID", "AUTO", "WEBRTC")


def sanitize_input(text: str) -> str:
    """Basic input sanitization."""
    return text.strip().replace("<", "&lt;").replace(">", "&gt;")

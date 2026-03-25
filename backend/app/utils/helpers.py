"""
─── helpers.py ───────────────────────────────────────────
General helper functions for the backend.
"""
import uuid
from datetime import datetime


def generate_id(length: int = 12) -> str:
    """Generate a short unique ID."""
    return str(uuid.uuid4()).replace("-", "")[:length]


def utc_now() -> str:
    """Get current UTC timestamp as ISO string."""
    return datetime.utcnow().isoformat()


def truncate(text: str, max_length: int = 100) -> str:
    """Truncate text with ellipsis."""
    if len(text) <= max_length:
        return text
    return text[:max_length - 3] + "..."

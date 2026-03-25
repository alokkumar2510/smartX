"""
─── serializers.py ───────────────────────────────────────
Data serialization utilities.
"""
import json
from datetime import datetime


class DateTimeEncoder(json.JSONEncoder):
    """JSON encoder that handles datetime objects."""
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)


def serialize(data: dict) -> str:
    """Serialize a dict to JSON string."""
    return json.dumps(data, cls=DateTimeEncoder)


def deserialize(data: str) -> dict:
    """Deserialize a JSON string to dict."""
    return json.loads(data)

"""
─── json_serializer.py ───────────────────────────────────
JSON-based message serialization for network transmission.
"""
import json
from datetime import datetime


class JSONSerializer:
    """Serializes messages to/from JSON format for network transport."""

    @staticmethod
    def encode(message: dict) -> bytes:
        """Encode a message dict to JSON bytes."""
        return json.dumps(message, default=str).encode('utf-8')

    @staticmethod
    def decode(data: bytes) -> dict:
        """Decode JSON bytes to a message dict."""
        return json.loads(data.decode('utf-8'))

    @staticmethod
    def encode_with_header(message: dict) -> bytes:
        """Encode with a 4-byte length header for framing."""
        payload = json.dumps(message, default=str).encode('utf-8')
        header = len(payload).to_bytes(4, byteorder='big')
        return header + payload

    @staticmethod
    def decode_with_header(data: bytes) -> dict:
        """Decode a length-prefixed message."""
        length = int.from_bytes(data[:4], byteorder='big')
        payload = data[4:4 + length]
        return json.loads(payload.decode('utf-8'))

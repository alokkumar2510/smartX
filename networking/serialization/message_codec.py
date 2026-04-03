"""
─── message_codec.py ─────────────────────────────────────
High-level message encode/decode combining serialization
with the packet system.
"""

from .json_serializer import JSONSerializer
from .binary_serializer import BinarySerializer


class MessageCodec:
    """Unified message codec supporting JSON and binary formats."""

    def __init__(self, format: str = "json"):
        self.format = format

    def encode(self, message: dict, seq: int = 0) -> bytes:
        """Encode a message using the configured format."""
        if self.format == "binary":
            payload = JSONSerializer.encode(message)
            checksum = sum(payload) & 0xFFFF
            return BinarySerializer.encode_packet(
                version=1, ptype=0, seq=seq, payload=payload, checksum=checksum
            )
        return JSONSerializer.encode(message)

    def decode(self, data: bytes) -> dict:
        """Decode a message using the configured format."""
        if self.format == "binary":
            packet = BinarySerializer.decode_packet(data)
            return JSONSerializer.decode(packet["payload"])
        return JSONSerializer.decode(data)

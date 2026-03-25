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

    def encode(self, message: dict) -> bytes:
        """Encode a message using the configured format."""
        if self.format == "binary":
            payload = JSONSerializer.encode(message)
            return BinarySerializer.encode_packet(
                version=1, ptype=0, seq=0, payload=payload, checksum=0
            )
        return JSONSerializer.encode(message)

    def decode(self, data: bytes) -> dict:
        """Decode a message using the configured format."""
        if self.format == "binary":
            packet = BinarySerializer.decode_packet(data)
            return JSONSerializer.decode(packet["payload"])
        return JSONSerializer.decode(data)

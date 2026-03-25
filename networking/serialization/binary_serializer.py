"""
─── binary_serializer.py ─────────────────────────────────
Binary format serialization using struct for compact
network transmission.
"""
import struct


class BinarySerializer:
    """Compact binary serialization for network packets."""

    # Header format: version(1B) + type(1B) + seq(4B) + payload_len(4B) + checksum(4B)
    HEADER_FORMAT = '!BBIII'
    HEADER_SIZE = struct.calcsize(HEADER_FORMAT)

    @staticmethod
    def encode_header(version: int, ptype: int, seq: int, payload_len: int, checksum: int) -> bytes:
        """Encode packet header to binary."""
        return struct.pack(BinarySerializer.HEADER_FORMAT, version, ptype, seq, payload_len, checksum)

    @staticmethod
    def decode_header(data: bytes) -> dict:
        """Decode binary packet header."""
        version, ptype, seq, payload_len, checksum = struct.unpack(
            BinarySerializer.HEADER_FORMAT, data[:BinarySerializer.HEADER_SIZE]
        )
        return {
            "version": version,
            "type": ptype,
            "sequence": seq,
            "payload_length": payload_len,
            "checksum": checksum,
        }

    @staticmethod
    def encode_packet(version: int, ptype: int, seq: int, payload: bytes, checksum: int) -> bytes:
        """Encode a complete packet (header + payload)."""
        header = BinarySerializer.encode_header(version, ptype, seq, len(payload), checksum)
        return header + payload

    @staticmethod
    def decode_packet(data: bytes) -> dict:
        """Decode a complete binary packet."""
        header = BinarySerializer.decode_header(data)
        payload = data[BinarySerializer.HEADER_SIZE:BinarySerializer.HEADER_SIZE + header["payload_length"]]
        return {**header, "payload": payload}

"""
─── packet_parser.py ─────────────────────────────────────
Parses raw bytes into Packet objects.
"""
import json
from .packet import Packet
from .checksum import calculate_checksum, verify_checksum


class PacketParser:
    """Parses raw data into structured Packet objects."""

    @staticmethod
    def from_bytes(data: bytes) -> Packet:
        """Parse raw bytes into a Packet."""
        try:
            decoded = json.loads(data.decode())
            packet = Packet(
                version=decoded.get("version", 1),
                packet_type=decoded.get("type", 0),
                sequence_num=decoded.get("seq", 0),
                payload=decoded.get("payload", "").encode(),
                checksum=decoded.get("checksum", 0),
                source=decoded.get("source"),
                destination=decoded.get("destination"),
                protocol=decoded.get("protocol", "TCP"),
            )
            return packet
        except (json.JSONDecodeError, UnicodeDecodeError):
            return Packet(payload=data, packet_type=-1)

    @staticmethod
    def validate(packet: Packet) -> bool:
        """Validate packet integrity using checksum."""
        return verify_checksum(packet.payload, packet.checksum)

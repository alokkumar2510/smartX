"""
─── packet.py ────────────────────────────────────────────
Packet data structure for network communication.
Defines the standard packet format.
"""
import struct
import time
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Packet:
    """Standard network packet structure."""

    # ─── Header Fields ────────────────────────────────
    version: int = 1                       # Protocol version
    packet_type: int = 0                   # 0=data, 1=ack, 2=heartbeat, 3=control
    sequence_num: int = 0                  # Sequence number for ordering
    timestamp: float = field(default_factory=time.time)

    # ─── Payload ──────────────────────────────────────
    payload: bytes = b""                   # Raw payload data
    checksum: int = 0                      # CRC32 checksum

    # ─── Metadata ─────────────────────────────────────
    source: Optional[str] = None           # Source address
    destination: Optional[str] = None      # Destination address
    protocol: str = "TCP"                  # Transport protocol

    @property
    def size(self) -> int:
        """Total packet size in bytes."""
        return len(self.payload) + 32  # header overhead estimate

    def to_dict(self) -> dict:
        """Serialize packet to dictionary."""
        return {
            "version": self.version,
            "type": self.packet_type,
            "seq": self.sequence_num,
            "timestamp": self.timestamp,
            "payload_size": len(self.payload),
            "checksum": self.checksum,
            "source": self.source,
            "destination": self.destination,
            "protocol": self.protocol,
        }

"""
─── packet_builder.py ────────────────────────────────────
Builder pattern for constructing packets.
"""
from .packet import Packet
from .checksum import calculate_checksum


class PacketBuilder:
    """Fluent builder for constructing network packets."""

    def __init__(self):
        self._packet = Packet()

    def set_type(self, packet_type: int):
        self._packet.packet_type = packet_type
        return self

    def set_sequence(self, seq: int):
        self._packet.sequence_num = seq
        return self

    def set_payload(self, data: bytes):
        self._packet.payload = data
        self._packet.checksum = calculate_checksum(data)
        return self

    def set_source(self, source: str):
        self._packet.source = source
        return self

    def set_destination(self, dest: str):
        self._packet.destination = dest
        return self

    def set_protocol(self, protocol: str):
        self._packet.protocol = protocol
        return self

    def build(self) -> Packet:
        """Construct and return the packet."""
        return self._packet

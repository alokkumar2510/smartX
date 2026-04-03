"""
─── udp_protocol.py ──────────────────────────────────────
UDP-specific protocol implementation.
"""

import socket
from .base_protocol import BaseProtocol


class UDPProtocol(BaseProtocol):
    """UDP protocol with low-latency, best-effort delivery."""

    def __init__(self):
        self._socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self._socket.settimeout(2)

    def connect(self, address: tuple):
        """UDP is connectionless, just store the address."""
        self._address = address

    def send(self, data: bytes, destination: tuple = None) -> bool:
        target = destination or getattr(self, "_address", None)
        if not target:
            return False
        try:
            self._socket.sendto(data, target)
            return True
        except Exception:
            return False

    def receive(self, buffer_size: int = 4096) -> bytes:
        data, _ = self._socket.recvfrom(buffer_size)
        return data

    def disconnect(self):
        if self._socket:
            self._socket.close()
            self._socket = None

    @property
    def protocol_name(self) -> str:
        return "UDP"

    @property
    def is_reliable(self) -> bool:
        return False

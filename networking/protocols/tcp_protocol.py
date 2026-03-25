"""
─── tcp_protocol.py ──────────────────────────────────────
TCP-specific protocol implementation.
"""
import socket
from .base_protocol import BaseProtocol


class TCPProtocol(BaseProtocol):
    """TCP protocol with reliable, ordered delivery."""

    def __init__(self):
        self._socket = None

    def connect(self, address: tuple):
        self._socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self._socket.connect(address)

    def send(self, data: bytes, destination: tuple = None) -> bool:
        try:
            self._socket.sendall(data)
            return True
        except Exception:
            return False

    def receive(self, buffer_size: int = 4096) -> bytes:
        return self._socket.recv(buffer_size)

    def disconnect(self):
        if self._socket:
            self._socket.close()

    @property
    def protocol_name(self) -> str:
        return "TCP"

    @property
    def is_reliable(self) -> bool:
        return True

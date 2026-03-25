"""
─── base_protocol.py ─────────────────────────────────────
Abstract base class for protocol implementations.
Defines the interface all protocols must follow.
"""
from abc import ABC, abstractmethod


class BaseProtocol(ABC):
    """Abstract protocol interface."""

    @abstractmethod
    def send(self, data: bytes, destination: tuple) -> bool:
        """Send data to the destination. Returns True on success."""
        pass

    @abstractmethod
    def receive(self, buffer_size: int = 4096) -> bytes:
        """Receive data. Returns raw bytes."""
        pass

    @abstractmethod
    def connect(self, address: tuple):
        """Establish connection (if applicable)."""
        pass

    @abstractmethod
    def disconnect(self):
        """Close connection."""
        pass

    @property
    @abstractmethod
    def protocol_name(self) -> str:
        """Return the protocol name (TCP, UDP, etc.)."""
        pass

    @property
    @abstractmethod
    def is_reliable(self) -> bool:
        """Whether this protocol guarantees delivery."""
        pass

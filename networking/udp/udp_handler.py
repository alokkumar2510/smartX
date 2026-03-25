"""
─── udp_handler.py ───────────────────────────────────────
UDP datagram handler — processes incoming UDP data.
"""
import json
from typing import Callable, Optional


class UDPHandler:
    """Processes incoming UDP datagrams."""

    def __init__(self, on_message: Optional[Callable] = None):
        self.on_message = on_message

    def receive(self, data: bytes) -> dict:
        """Parse an incoming UDP datagram."""
        try:
            message = json.loads(data.decode())
            if self.on_message:
                self.on_message(message)
            return message
        except json.JSONDecodeError:
            return {"error": "Invalid datagram format"}

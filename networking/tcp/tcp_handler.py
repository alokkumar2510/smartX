"""
─── tcp_handler.py ───────────────────────────────────────
TCP connection handler — processes incoming TCP data.
"""

import json
from typing import Callable, Optional


class TCPHandler:
    """Processes incoming TCP data streams."""

    def __init__(self, on_message: Optional[Callable] = None):
        self.on_message = on_message
        self._buffer = b""

    def receive(self, data: bytes) -> list:
        """Buffer incoming data and extract complete messages."""
        self._buffer += data
        messages = []

        # Handle multiple JSON objects in buffer
        while self._buffer:
            try:
                message = json.loads(self._buffer.decode())
                messages.append(message)
                self._buffer = b""
            except json.JSONDecodeError:
                # Incomplete message, wait for more data
                break
            except UnicodeDecodeError:
                # Invalid encoding — discard buffer to avoid infinite loop
                self._buffer = b""
                break

        if self.on_message:
            for msg in messages:
                self.on_message(msg)

        return messages

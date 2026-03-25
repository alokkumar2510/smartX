"""
─── tcp_client.py ────────────────────────────────────────
TCP client for connecting to the TCP server.
"""
import socket
import json
import logging

logger = logging.getLogger("smartchat.tcp.client")


class TCPClient:
    """TCP socket client for reliable messaging."""

    def __init__(self, host: str = "127.0.0.1", port: int = 9000):
        self.host = host
        self.port = port
        self.socket = None
        self.connected = False

    def connect(self):
        """Establish TCP connection to server."""
        self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.socket.connect((self.host, self.port))
        self.connected = True
        logger.info(f"Connected to TCP server at {self.host}:{self.port}")

    def send(self, message: dict) -> dict:
        """Send a message and wait for server acknowledgment."""
        if not self.connected:
            raise ConnectionError("Not connected to TCP server")

        data = json.dumps(message).encode()
        self.socket.sendall(data)

        response = self.socket.recv(4096).decode()
        return json.loads(response)

    def disconnect(self):
        """Close the TCP connection."""
        if self.socket:
            self.socket.close()
            self.connected = False
            logger.info("Disconnected from TCP server")

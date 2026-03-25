"""
─── udp_client.py ────────────────────────────────────────
UDP client for sending datagrams to the UDP server.
"""
import socket
import json
import logging

logger = logging.getLogger("smartchat.udp.client")


class UDPClient:
    """UDP datagram client for fast, connectionless messaging."""

    def __init__(self, host: str = "127.0.0.1", port: int = 9001):
        self.host = host
        self.port = port
        self.socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.socket.settimeout(2)  # 2 second timeout

    def send(self, message: dict) -> dict:
        """Send a UDP datagram and optionally receive response."""
        data = json.dumps(message).encode()
        self.socket.sendto(data, (self.host, self.port))

        try:
            response, _ = self.socket.recvfrom(4096)
            return json.loads(response.decode())
        except socket.timeout:
            return {"status": "sent_no_ack", "protocol": "UDP"}

    def send_typing(self, username: str):
        """Send typing indicator (fire-and-forget)."""
        return self.send({"type": "typing", "user": username})

    def send_presence(self, username: str, status: str = "online"):
        """Send presence update."""
        return self.send({"type": "presence", "user": username, "status": status})

    def send_heartbeat(self):
        """Send heartbeat to maintain connection."""
        return self.send({"type": "heartbeat"})

    def close(self):
        """Close the UDP socket."""
        self.socket.close()

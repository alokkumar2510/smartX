"""
─── udp_server.py ────────────────────────────────────────
UDP Socket Server for low-latency message delivery.
Used for typing indicators, presence, and real-time events.
"""
import socket
import json
import logging

logger = logging.getLogger("smartchat.udp")


class UDPServer:
    """UDP datagram server for fire-and-forget messaging."""

    def __init__(self, host: str = "127.0.0.1", port: int = 9001):
        self.host = host
        self.port = port
        self.server_socket = None
        self.known_clients = set()  # Track known client addresses
        self.running = False

    def start(self):
        """Start the UDP server."""
        self.server_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.server_socket.bind((self.host, self.port))
        self.running = True

        logger.info(f"UDP Server listening on {self.host}:{self.port}")

        while self.running:
            try:
                data, addr = self.server_socket.recvfrom(4096)
                self.known_clients.add(addr)

                message = json.loads(data.decode())
                logger.debug(f"UDP [{addr}] received: {message.get('type', 'unknown')}")

                # Process based on message type
                response = self._process(message, addr)

                # Send response
                self.server_socket.sendto(json.dumps(response).encode(), addr)

                # Broadcast to other clients (fire-and-forget)
                self._broadcast(response, exclude=addr)

            except json.JSONDecodeError:
                logger.warning(f"UDP: Invalid JSON from {addr}")
            except OSError:
                break

    def _process(self, message: dict, addr: tuple) -> dict:
        """Process a UDP message."""
        msg_type = message.get("type", "data")

        if msg_type == "typing":
            return {"type": "typing", "user": message.get("user"), "protocol": "UDP"}
        elif msg_type == "presence":
            return {"type": "presence", "user": message.get("user"), "status": "online", "protocol": "UDP"}
        elif msg_type == "heartbeat":
            return {"type": "heartbeat_ack", "protocol": "UDP"}
        else:
            return {"type": "data_ack", "protocol": "UDP", **message}

    def _broadcast(self, message: dict, exclude: tuple = None):
        """Broadcast to all known UDP clients."""
        data = json.dumps(message).encode()
        for client_addr in self.known_clients:
            if client_addr != exclude:
                try:
                    self.server_socket.sendto(data, client_addr)
                except Exception:
                    pass  # UDP is best-effort

    def stop(self):
        """Stop the UDP server."""
        self.running = False
        if self.server_socket:
            self.server_socket.close()
        logger.info("UDP Server stopped")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    server = UDPServer()
    server.start()

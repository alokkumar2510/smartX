"""
─── ws_bridge.py ─────────────────────────────────────────
WebSocket ↔ TCP/UDP bridge logic.
Routes messages between WebSocket clients and socket servers.
"""
import socket
import json


class WSBridge:
    """Bridges WebSocket messages to TCP/UDP socket servers."""

    def __init__(self, tcp_host="127.0.0.1", tcp_port=9000, udp_host="127.0.0.1", udp_port=9001):
        self.tcp_addr = (tcp_host, tcp_port)
        self.udp_addr = (udp_host, udp_port)

    def send_tcp(self, message: dict) -> dict:
        """Send a message via TCP to the TCP server."""
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(5)
                s.connect(self.tcp_addr)
                s.sendall(json.dumps(message).encode())
                response = s.recv(4096).decode()
                return json.loads(response)
        except Exception as e:
            return {"error": str(e), "protocol": "TCP"}

    def send_udp(self, message: dict) -> dict:
        """Send a message via UDP to the UDP server."""
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
                s.settimeout(5)
                data = json.dumps(message).encode()
                s.sendto(data, self.udp_addr)
                response, _ = s.recvfrom(4096)
                return json.loads(response.decode())
        except Exception as e:
            return {"error": str(e), "protocol": "UDP"}

    def route_message(self, message: dict) -> dict:
        """Route a message to the appropriate protocol."""
        protocol = message.get("protocol", "TCP").upper()

        if protocol == "TCP":
            return self.send_tcp(message)
        elif protocol == "UDP":
            return self.send_udp(message)
        else:
            # Hybrid: try TCP first, fallback to UDP
            result = self.send_tcp(message)
            if "error" in result:
                return self.send_udp(message)
            return result

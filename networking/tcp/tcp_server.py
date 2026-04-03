"""
─── tcp_server.py ────────────────────────────────────────
TCP Socket Server for reliable message delivery.
Handles multiple clients via threading.
"""

import socket
import threading
import json
import logging

logger = logging.getLogger("smartchat.tcp")


class TCPServer:
    """Multi-threaded TCP chat server."""

    def __init__(self, host: str = "127.0.0.1", port: int = 9000):
        self.host = host
        self.port = port
        self.server_socket = None
        self.clients = {}  # addr -> socket
        self.clients_lock = threading.Lock()
        self.running = False

    def start(self):
        """Start the TCP server and listen for connections."""
        self.server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.server_socket.bind((self.host, self.port))
        self.server_socket.listen(5)
        self.running = True

        logger.info(f"TCP Server listening on {self.host}:{self.port}")

        while self.running:
            try:
                client_socket, addr = self.server_socket.accept()
                logger.info(f"TCP client connected: {addr}")
                with self.clients_lock:
                    self.clients[addr] = client_socket
                thread = threading.Thread(
                    target=self._handle_client, args=(client_socket, addr)
                )
                thread.daemon = True
                thread.start()
            except OSError:
                break

    def _handle_client(self, client_socket: socket.socket, addr: tuple):
        """Handle an individual TCP client connection."""
        try:
            while self.running:
                data = client_socket.recv(4096)
                if not data:
                    break

                message = json.loads(data.decode())
                logger.info(f"TCP [{addr}] received: {message.get('content', '')[:50]}")

                # Echo response with server metadata
                response = {
                    "status": "delivered",
                    "protocol": "TCP",
                    "server_ack": True,
                    **message,
                }
                client_socket.sendall(json.dumps(response).encode())

                # Broadcast to other clients
                self._broadcast(response, exclude=addr)

        except (json.JSONDecodeError, ConnectionResetError, UnicodeDecodeError) as e:
            logger.warning(f"TCP client error [{addr}]: {e}")
        finally:
            client_socket.close()
            with self.clients_lock:
                self.clients.pop(addr, None)
            logger.info(f"TCP client disconnected: {addr}")

    def _broadcast(self, message: dict, exclude: tuple = None):
        """Send message to all connected TCP clients."""
        data = json.dumps(message).encode()
        with self.clients_lock:
            clients_snapshot = list(self.clients.items())
        for addr, sock in clients_snapshot:
            if addr != exclude:
                try:
                    sock.sendall(data)
                except Exception:
                    with self.clients_lock:
                        self.clients.pop(addr, None)

    def stop(self):
        """Gracefully stop the TCP server."""
        self.running = False
        with self.clients_lock:
            for sock in self.clients.values():
                sock.close()
            self.clients.clear()
        if self.server_socket:
            self.server_socket.close()
        logger.info("TCP Server stopped")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    server = TCPServer()
    server.start()

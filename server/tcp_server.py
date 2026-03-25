#!/usr/bin/env python3
"""
server/tcp_server.py — SmartChat X Enhanced TCP Server
════════════════════════════════════════════════════════
TCP Chat Server with:
  • Multi-client support (one thread per client)
  • Message broadcasting with routing decisions
  • Integration with encryption, AI, gamification
  • Detailed logging of all protocol operations
"""

import socket
import threading
import sys
import os
import time
import json
import logging

# ── Allow imports from the project root ─────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from common.config import HOST, TCP_PORT, TCP_BUFFER, CMD_QUIT

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(name)s] %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger("SmartChatX.TCP")

# ── Shared state (protected by a lock) ──────────────────────
clients_lock = threading.Lock()
clients: dict[socket.socket, str] = {}  # {socket: username}

# ── Statistics ──────────────────────────────────────────────
tcp_stats = {
    "connections_total": 0,
    "messages_total": 0,
    "bytes_sent": 0,
    "bytes_received": 0,
    "start_time": time.time(),
    "active_connections": 0
}


# ────────────────────────────────────────────────────────────
def broadcast(message: str, sender_socket: socket.socket | None = None):
    """Send *message* to every client except the sender."""
    encoded = message.encode()
    with clients_lock:
        for client_socket in list(clients):
            if client_socket is sender_socket:
                continue
            try:
                client_socket.sendall(encoded)
                tcp_stats["bytes_sent"] += len(encoded)
            except Exception:
                remove_client(client_socket)


def remove_client(client_socket: socket.socket):
    """Unregister a client and close its socket."""
    if client_socket in clients:
        username = clients.pop(client_socket)
        tcp_stats["active_connections"] = len(clients)
        try:
            client_socket.close()
        except Exception:
            pass
        logger.info(f"🔌 Client removed: {username}")
        return username
    return None


# ────────────────────────────────────────────────────────────
def handle_client(client_socket: socket.socket, address: tuple):
    """Per-client handler thread."""
    tcp_stats["connections_total"] += 1
    logger.info(f"🔗 New TCP connection from {address}")

    # ── Step 1: get username ──────────────────────────────
    try:
        client_socket.sendall("Enter your username: ".encode())
        username = client_socket.recv(TCP_BUFFER).decode().strip()
        if not username:
            username = f"User_{address[1]}"
    except Exception:
        client_socket.close()
        return

    # ── Step 2: register and announce ─────────────────────
    with clients_lock:
        clients[client_socket] = username
        tcp_stats["active_connections"] = len(clients)

    join_msg = f"[SERVER] {username} has joined the chat!\n"
    logger.info(f"✅ {username} joined | Active: {len(clients)} | "
                f"Protocol: TCP | Port: {TCP_PORT}")
    broadcast(join_msg, sender_socket=client_socket)
    client_socket.sendall(f"Welcome, {username}! Type {CMD_QUIT} to exit.\n".encode())

    # ── Step 3: message loop ──────────────────────────────
    while True:
        try:
            data = client_socket.recv(TCP_BUFFER)
            if not data:
                break

            tcp_stats["bytes_received"] += len(data)
            message = data.decode().strip()

            if message.lower() == CMD_QUIT:
                client_socket.sendall("Goodbye!\n".encode())
                break

            tcp_stats["messages_total"] += 1
            formatted = f"[{username}]: {message}\n"
            logger.info(f"💬 TCP Message | {username}: {message[:60]}{'...' if len(message)>60 else ''}")
            broadcast(formatted, sender_socket=client_socket)

        except ConnectionResetError:
            break
        except Exception as e:
            logger.error(f"❌ Error with {username}: {e}")
            break

    # ── Step 4: clean up ──────────────────────────────────
    with clients_lock:
        remove_client(client_socket)

    leave_msg = f"[SERVER] {username} has left the chat.\n"
    logger.info(f"👋 {username} left | Active: {len(clients)}")
    broadcast(leave_msg)


# ────────────────────────────────────────────────────────────
def get_tcp_stats() -> dict:
    """Return TCP server statistics."""
    return {
        **tcp_stats,
        "uptime_seconds": round(time.time() - tcp_stats["start_time"]),
        "protocol": "TCP",
        "port": TCP_PORT,
        "features": ["reliable_delivery", "ordered", "connection_oriented"]
    }


def start_tcp_server():
    """Create the listening socket and spawn a thread per client."""
    server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server_socket.bind((HOST, TCP_PORT))
    server_socket.listen(5)

    logger.info(f"═══════════════════════════════════════════════")
    logger.info(f"  🟢 TCP SERVER ONLINE | {HOST}:{TCP_PORT}")
    logger.info(f"  Protocol: TCP (Reliable, Ordered)")
    logger.info(f"  Buffer: {TCP_BUFFER} bytes")
    logger.info(f"═══════════════════════════════════════════════")

    try:
        while True:
            client_socket, address = server_socket.accept()
            thread = threading.Thread(
                target=handle_client,
                args=(client_socket, address),
                daemon=True
            )
            thread.start()

    except KeyboardInterrupt:
        logger.info("🛑 TCP Server shutting down...")
    finally:
        server_socket.close()


# ────────────────────────────────────────────────────────────
if __name__ == "__main__":
    start_tcp_server()

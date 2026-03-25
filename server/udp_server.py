#!/usr/bin/env python3
"""
server/udp_server.py — SmartChat X Enhanced UDP Server
════════════════════════════════════════════════════════
UDP server handling:
  • Typing indicators (fast, fire-and-forget)
  • Presence tracking (online/offline/last seen)
  • Heartbeat pings
  • Detailed protocol logging
"""

import socket
import sys
import os
import time
import logging

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from common.config import HOST, UDP_PORT, UDP_BUFFER, CMD_TYPING, CMD_STOPPED

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(name)s] %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger("SmartChatX.UDP")

# Track every client address
known_clients: set[tuple] = set()

# Presence tracking
presence_data = {}  # {username: {"status": str, "last_seen": float, "addr": tuple}}

# Stats
udp_stats = {
    "datagrams_received": 0,
    "datagrams_sent": 0,
    "bytes_received": 0,
    "bytes_sent": 0,
    "typing_events": 0,
    "presence_updates": 0,
    "start_time": time.time()
}


def broadcast_udp(server_socket: socket.socket, message: str, exclude_addr: tuple):
    """Send *message* to every known client except *exclude_addr*."""
    encoded = message.encode()
    for addr in list(known_clients):
        if addr == exclude_addr:
            continue
        try:
            server_socket.sendto(encoded, addr)
            udp_stats["datagrams_sent"] += 1
            udp_stats["bytes_sent"] += len(encoded)
        except Exception as e:
            logger.debug(f"UDP send failed to {addr}: {e}")


def update_presence(username: str, status: str, addr: tuple):
    """Update user presence data."""
    presence_data[username] = {
        "status": status,
        "last_seen": time.time(),
        "addr": addr
    }
    udp_stats["presence_updates"] += 1


def get_udp_stats() -> dict:
    return {
        **udp_stats,
        "uptime_seconds": round(time.time() - udp_stats["start_time"]),
        "known_clients": len(known_clients),
        "protocol": "UDP",
        "port": UDP_PORT,
        "features": ["connectionless", "low_latency", "best_effort"],
        "presence": {
            k: {"status": v["status"], "last_seen": v["last_seen"]}
            for k, v in presence_data.items()
        }
    }


def start_udp_server():
    """Main loop: receive datagrams, update client list, broadcast."""
    server_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    server_socket.bind((HOST, UDP_PORT))

    logger.info(f"═══════════════════════════════════════════════")
    logger.info(f"  🟣 UDP SERVER ONLINE | {HOST}:{UDP_PORT}")
    logger.info(f"  Protocol: UDP (Fast, Best-Effort)")
    logger.info(f"  Buffer: {UDP_BUFFER} bytes")
    logger.info(f"═══════════════════════════════════════════════")

    try:
        while True:
            data, client_addr = server_socket.recvfrom(UDP_BUFFER)
            message = data.decode().strip()
            udp_stats["datagrams_received"] += 1
            udp_stats["bytes_received"] += len(data)

            if client_addr not in known_clients:
                known_clients.add(client_addr)
                logger.info(f"📡 New UDP client: {client_addr}")

            if message.startswith(CMD_TYPING + ":"):
                username = message.split(":", 1)[1]
                update_presence(username, "typing", client_addr)
                udp_stats["typing_events"] += 1
                status_msg = f"[STATUS] {username} is typing…"
                broadcast_udp(server_socket, status_msg, exclude_addr=client_addr)

            elif message.startswith(CMD_STOPPED + ":"):
                username = message.split(":", 1)[1]
                update_presence(username, "online", client_addr)
                status_msg = f"[STATUS] {username} stopped typing."
                broadcast_udp(server_socket, status_msg, exclude_addr=client_addr)

            elif message.startswith("PRESENCE:"):
                parts = message.split(":", 2)
                if len(parts) >= 3:
                    username, status = parts[1], parts[2]
                    update_presence(username, status, client_addr)

            elif message.startswith("PING:"):
                # Respond with PONG for latency measurement
                server_socket.sendto(f"PONG:{message[5:]}".encode(), client_addr)
                udp_stats["datagrams_sent"] += 1

            else:
                logger.debug(f"Unknown UDP payload from {client_addr}: {message[:50]}")

    except KeyboardInterrupt:
        logger.info("🛑 UDP Server shutting down...")
    finally:
        server_socket.close()


if __name__ == "__main__":
    start_udp_server()

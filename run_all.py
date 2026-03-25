#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════
  run_all.py — SmartChat X Master Launcher
═══════════════════════════════════════════════════════════

Starts the COMPLETE integrated system:
  1. TCP Socket Server   (port 9000) — Reliable message routing
  2. UDP Socket Server   (port 9001) — Typing/presence (fast)
  3. FastAPI Backend      (port 8000) — REST + WebSocket + Bridge

Architecture:
  Frontend (React :5173)
    ↕ WebSocket
  FastAPI Backend (:8000)
    ↕ NetworkBridge (TCP/UDP sockets)
  TCP Server (:9000) + UDP Server (:9001)
    ↕ Packet Fragmentation + ACK + Loss Simulation

Usage:
  python run_all.py
  Then: cd frontend && npm run dev
  Open: http://localhost:5173
"""

import threading
import asyncio
import sys
import os
import time
import logging
import signal

# Ensure project root is in path
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, PROJECT_ROOT)

# Configure root logger
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(name)s] %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger("SmartChatX.Launcher")


def start_tcp_server():
    """Start TCP socket server (port 9000) in a thread."""
    try:
        from networking.tcp.tcp_server import TCPServer
        server = TCPServer(host="127.0.0.1", port=9000)
        server.start()
    except Exception as e:
        logger.error(f"TCP Server (networking) failed: {e}")
        try:
            from server.tcp_server import start_tcp_server as start_legacy
            start_legacy()
        except Exception as e2:
            logger.error(f"Legacy TCP also failed: {e2}")


def start_udp_server():
    """Start UDP socket server (port 9001) in a thread."""
    try:
        from networking.udp.udp_server import UDPServer
        server = UDPServer(host="127.0.0.1", port=9001)
        server.start()
    except Exception as e:
        logger.error(f"UDP Server (networking) failed: {e}")
        try:
            from server.udp_server import start_udp_server as start_legacy
            start_legacy()
        except Exception as e2:
            logger.error(f"Legacy UDP also failed: {e2}")


def start_backend():
    """Start FastAPI backend server (port 8000)."""
    try:
        import uvicorn
        # Change to backend dir so imports work
        backend_dir = os.path.join(PROJECT_ROOT, "backend")
        sys.path.insert(0, backend_dir)
        os.chdir(backend_dir)
        uvicorn.run(
            "main:app",
            host="127.0.0.1",
            port=8000,
            reload=False,
            log_level="info"
        )
    except Exception as e:
        logger.error(f"Backend server failed: {e}")
        raise


if __name__ == "__main__":
    print()
    print("╔═══════════════════════════════════════════════════════════════╗")
    print("║                                                               ║")
    print("║   ⚡ SmartChat X — Advanced TCP/UDP Chat System ⚡           ║")
    print("║                                                               ║")
    print("║   INTEGRATED ARCHITECTURE:                                    ║")
    print("║                                                               ║")
    print("║   Layer 1: React Frontend ← WebSocket → Layer 2              ║")
    print("║   Layer 2: FastAPI Backend ← NetworkBridge → Layer 3          ║")
    print("║   Layer 3: TCP Server (9000) + UDP Server (9001)              ║")
    print("║                                                               ║")
    print("║   Features:                                                   ║")
    print("║   🔐 JWT Authentication (bcrypt + HS256)                      ║")
    print("║   📡 Real TCP/UDP Socket Servers                              ║")
    print("║   📦 Packet Fragmentation & Reassembly                        ║")
    print("║   ✅ ACK Handling (TCP) + Packet Loss (UDP)                   ║")
    print("║   🖼️  Image Sharing                                           ║")
    print("║   💬 Typing Indicators (via UDP)                              ║")
    print("║   📊 Live Network Analytics                                   ║")
    print("║   🔄 Auto-Reconnection with Backoff                          ║")
    print("║                                                               ║")
    print("╠═══════════════════════════════════════════════════════════════╣")
    print("║                                                               ║")
    print("║   Starting servers...                                         ║")
    print("║   1. TCP Server  → port 9000 (Reliable Messages)             ║")
    print("║   2. UDP Server  → port 9001 (Typing/Presence)               ║")
    print("║   3. FastAPI     → port 8000 (REST + WebSocket + Bridge)     ║")
    print("║                                                               ║")
    print("║   Then run:  cd frontend && npm run dev                       ║")
    print("║   Open:      http://localhost:5173                            ║")
    print("║   Press Ctrl+C to stop all servers                            ║")
    print("║                                                               ║")
    print("╚═══════════════════════════════════════════════════════════════╝")
    print()

    # 1. Start TCP server in daemon thread
    logger.info("🟢 Starting TCP Server (port 9000)...")
    tcp_thread = threading.Thread(target=start_tcp_server, daemon=True, name="TCP-Server")
    tcp_thread.start()
    time.sleep(0.5)

    # 2. Start UDP server in daemon thread
    logger.info("🟣 Starting UDP Server (port 9001)...")
    udp_thread = threading.Thread(target=start_udp_server, daemon=True, name="UDP-Server")
    udp_thread.start()
    time.sleep(0.3)

    # 3. Start FastAPI backend (blocks main thread)
    logger.info("⚡ Starting FastAPI Backend (port 8000)...")
    try:
        start_backend()
    except KeyboardInterrupt:
        print()
        logger.info("🛑 Shutting down all SmartChat X servers...")
        print()
        print("╔═══════════════════════════════════════════════════════════╗")
        print("║   All servers stopped. Thank you for using SmartChat X!   ║")
        print("╚═══════════════════════════════════════════════════════════╝")

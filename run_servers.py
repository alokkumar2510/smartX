#!/usr/bin/env python3
"""
run_servers.py
──────────────
Convenience launcher – starts BOTH the TCP and UDP servers in the same
terminal, each in its own daemon thread.

Run:  python run_servers.py
Stop: Ctrl+C
"""

import threading
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from server.tcp_server import start_tcp_server
from server.udp_server import start_udp_server

if __name__ == "__main__":
    print("=" * 50)
    print("  Smart Chat – Server Launcher")
    print("=" * 50)

    # UDP server thread
    udp_thread = threading.Thread(target=start_udp_server, daemon=True)
    udp_thread.start()

    # TCP server runs on the main thread (handles KeyboardInterrupt cleanly)
    try:
        start_tcp_server()
    except KeyboardInterrupt:
        print("\n[LAUNCHER] All servers stopped.")

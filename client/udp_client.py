#!/usr/bin/env python3
"""
client/udp_client.py
────────────────────
UDP Typing-Status Client
• Can be used standalone OR imported by tcp_client.py.
• Sends "TYPING:<username>" when the user starts typing.
• Sends "STOPPED:<username>" when the user sends a message.
• A background thread listens for status updates from the server
  and prints them.

Standalone run:  python client/udp_client.py
(You'll need the UDP server running to see any output.)
"""

import socket
import threading
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from common.config import HOST, UDP_PORT, UDP_BUFFER, CMD_TYPING, CMD_STOPPED


class UDPClient:
    """
    Encapsulates UDP typing-status logic.

    Usage
    -----
    client = UDPClient("Alice")
    client.start()          # begin listening for remote statuses
    client.typing()         # call whenever the user presses a key
    client.stopped_typing() # call when user sends a message
    client.stop()           # shut everything down
    """

    def __init__(self, username: str):
        self.username   = username
        self._running   = False
        self._is_typing = False      # track state to avoid repeated sends

        # AF_INET + SOCK_DGRAM = UDP socket
        self._sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        # Bind to a random available port so the server can send back to us.
        self._sock.bind(("", 0))
        self._sock.settimeout(1.0)   # unblock recvfrom() every second

        self._listen_thread = threading.Thread(
            target=self._listen_loop,
            daemon=True
        )

    # ── Public API ───────────────────────────────────────────

    def start(self):
        """Start the background listener thread."""
        self._running = True
        self._listen_thread.start()

    def stop(self):
        """Signal the listener to exit and close the socket."""
        self._running = False
        try:
            self._sock.close()
        except Exception:
            pass

    def typing(self):
        """
        Send a TYPING notification.
        Only sends once per typing session to avoid flooding the server.
        """
        if not self._is_typing:
            self._is_typing = True
            self._send(f"{CMD_TYPING}:{self.username}")

    def stopped_typing(self):
        """Send a STOPPED notification when a message is dispatched."""
        if self._is_typing:
            self._is_typing = False
            self._send(f"{CMD_STOPPED}:{self.username}")

    # ── Private helpers ──────────────────────────────────────

    def _send(self, payload: str):
        """Fire-and-forget UDP datagram to the server."""
        try:
            self._sock.sendto(payload.encode(), (HOST, UDP_PORT))
        except Exception as e:
            print(f"[UDP CLIENT] Send error: {e}")

    def _listen_loop(self):
        """
        Background thread: waits for status datagrams from the server
        (other users' typing indicators) and prints them.
        """
        while self._running:
            try:
                data, _ = self._sock.recvfrom(UDP_BUFFER)
                status = data.decode().strip()
                # Print on its own line so it doesn't interrupt input.
                print(f"\n  ✎ {status}", flush=True)
            except socket.timeout:
                # Normal – just loop back and check _running flag.
                continue
            except OSError:
                # Socket was closed (stop() was called).
                break
            except Exception as e:
                if self._running:
                    print(f"[UDP CLIENT] Receive error: {e}")


# ────────────────────────────────────────────────────────────
# Standalone demo – lets you test the UDP layer on its own
# ────────────────────────────────────────────────────────────
if __name__ == "__main__":
    name = input("Enter your name for typing-status demo: ").strip() or "Tester"
    udp = UDPClient(name)
    udp.start()
    print(f"[UDP CLIENT] Connected as '{name}'. Press Enter to send TYPING, q+Enter to quit.")

    try:
        while True:
            key = input()
            if key.lower() == "q":
                break
            # Simulate typing whenever user presses Enter
            udp.typing()
            print("  → Sent TYPING signal. Press Enter again to send STOPPED.")
            input()
            udp.stopped_typing()
            print("  → Sent STOPPED signal.")
    except KeyboardInterrupt:
        pass
    finally:
        udp.stop()
        print("[UDP CLIENT] Bye!")

#!/usr/bin/env python3
"""
client/tcp_client.py
────────────────────
TCP Chat Client
• Connects to the TCP server.
• One thread listens for incoming messages (from other users).
• The main thread reads keyboard input and sends it.
• Notifies the UDP module when the user starts / stops typing.

Run:  python client/tcp_client.py
"""

import socket
import threading
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from common.config import HOST, TCP_PORT, TCP_BUFFER, CMD_QUIT

# We'll import the UDP notifier lazily to avoid a circular import.
# It is set after both modules are loaded (see bottom of file).
udp_notifier = None   # will be a UDPClient instance


# ────────────────────────────────────────────────────────────
def receive_messages(tcp_socket: socket.socket, stop_event: threading.Event):
    """
    Runs in a background thread.
    Continuously reads data from the server and prints it.
    Sets *stop_event* when the connection drops so the main thread can exit.
    """
    while not stop_event.is_set():
        try:
            data = tcp_socket.recv(TCP_BUFFER)
            if not data:
                # Server closed the connection.
                print("\n[CLIENT] Server disconnected.")
                stop_event.set()
                break
            # Print without an extra newline (server already adds one).
            print(data.decode(), end="", flush=True)
        except Exception:
            if not stop_event.is_set():
                print("\n[CLIENT] Lost connection to server.")
                stop_event.set()
            break


# ────────────────────────────────────────────────────────────
def start_tcp_client():
    """Connect, authenticate, then enter the send loop."""
    global udp_notifier

    # ── Create and connect the TCP socket ───────────────────
    tcp_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        tcp_socket.connect((HOST, TCP_PORT))
    except ConnectionRefusedError:
        print(f"[CLIENT] Could not connect to TCP server at {HOST}:{TCP_PORT}")
        print("[CLIENT] Is the server running?")
        sys.exit(1)

    print(f"[CLIENT] Connected to chat server at {HOST}:{TCP_PORT}")

    # ── Read the server's first prompt ("Enter your username: ") ──
    prompt = tcp_socket.recv(TCP_BUFFER).decode()
    username = input(prompt).strip()
    tcp_socket.sendall(username.encode())

    # Small receive to flush the welcome message from the server.
    welcome = tcp_socket.recv(TCP_BUFFER).decode()
    print(welcome, end="", flush=True)

    # ── Start the UDP notifier (typing status) ───────────────
    # Import here to avoid issues if someone runs tcp_client alone.
    from client.udp_client import UDPClient
    udp_notifier = UDPClient(username)
    udp_notifier.start()

    # ── Start the background receive thread ──────────────────
    stop_event = threading.Event()
    recv_thread = threading.Thread(
        target=receive_messages,
        args=(tcp_socket, stop_event),
        daemon=True
    )
    recv_thread.start()

    # ── Main send loop ───────────────────────────────────────
    print(f"[CLIENT] Start chatting! (type {CMD_QUIT} to exit)\n")
    try:
        while not stop_event.is_set():
            try:
                message = input()           # blocks until user presses Enter
            except EOFError:
                # Handles piped input or Ctrl-D
                break

            if stop_event.is_set():
                break

            # Tell the UDP server the user stopped typing (they pressed Enter).
            if udp_notifier:
                udp_notifier.stopped_typing()

            if not message:
                continue                    # ignore blank lines

            tcp_socket.sendall(message.encode())

            if message.lower() == CMD_QUIT:
                break

    except KeyboardInterrupt:
        print("\n[CLIENT] Interrupted.")
    finally:
        stop_event.set()
        if udp_notifier:
            udp_notifier.stop()
        try:
            tcp_socket.close()
        except Exception:
            pass
        print("[CLIENT] Disconnected.")


# ────────────────────────────────────────────────────────────
if __name__ == "__main__":
    # Allow running as:  python client/tcp_client.py
    # The sys.path hack at the top makes the import work either way.
    start_tcp_client()

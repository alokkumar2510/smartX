"""
─── constants.py ─────────────────────────────────────────
Global constants shared across frontend, backend, and
networking modules.
"""

# ─── Server Ports ────────────────────────────────────────
TCP_PORT = 9000
UDP_PORT = 9001
WS_PORT = 8765
API_PORT = 8000
DEFAULT_HOST = "127.0.0.1"

# ─── Message Constraints ────────────────────────────────
MAX_MESSAGE_LENGTH = 1000
MAX_USERNAME_LENGTH = 20
MIN_USERNAME_LENGTH = 3
MAX_PAYLOAD_SIZE = 65536  # 64KB

# ─── Protocol Constants ─────────────────────────────────
PROTOCOL_VERSION = 1
HEADER_SIZE = 14  # bytes

# ─── Timeouts ────────────────────────────────────────────
TCP_TIMEOUT = 10        # seconds
UDP_TIMEOUT = 2         # seconds
WS_PING_INTERVAL = 30   # seconds
HEARTBEAT_INTERVAL = 15  # seconds
TYPING_TIMEOUT = 3000    # milliseconds
RECONNECT_DELAY = 3000   # milliseconds

# ─── Gamification ────────────────────────────────────────
XP_PER_MESSAGE = 5
XP_PER_LEVEL = 100
MAX_LEVEL = 50

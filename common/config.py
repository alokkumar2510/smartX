#!/usr/bin/env python3
"""
common/config.py — SmartChat X Centralized Configuration
═════════════════════════════════════════════════════════
All constants, ports, and system-wide settings live here.
Change once → entire system updates.
"""

# ── Network Addresses ─────────────────────────────────────────
HOST = "127.0.0.1"

# ── Ports ─────────────────────────────────────────────────────
TCP_PORT    = 9000      # TCP server (reliable messages)
UDP_PORT    = 9001      # UDP server (typing, presence)
WS_PORT     = 8765      # WebSocket bridge
DASHBOARD_PORT = 8766   # Network dashboard data

# ── Buffer Sizes ──────────────────────────────────────────────
TCP_BUFFER  = 4096
UDP_BUFFER  = 1024

# ── Protocol Tokens ───────────────────────────────────────────
CMD_QUIT    = "/quit"
CMD_TYPING  = "TYPING"
CMD_STOPPED = "STOPPED"
CMD_PRESENCE = "PRESENCE"
CMD_PING    = "PING"
CMD_PONG    = "PONG"

# ── Message Priority Levels ──────────────────────────────────
PRIORITY_CRITICAL = 0    # System messages
PRIORITY_HIGH     = 1    # Important user messages
PRIORITY_NORMAL   = 2    # Regular chat
PRIORITY_LOW      = 3    # Typing indicators, presence

# ── AI Module Settings ────────────────────────────────────────
AI_SUMMARY_THRESHOLD  = 100   # Characters before auto-summarize triggers
TOXIC_KEYWORDS = [
    "spam", "scam", "abuse", "hate", "kill", "die",
    "stupid", "idiot", "dumb", "loser"
]

# ── Gamification ──────────────────────────────────────────────
XP_PER_MESSAGE    = 10
XP_PER_AI_USE     = 15
XP_PER_MINUTE     = 2
XP_PER_ENCRYPTION = 5
LEVEL_THRESHOLDS  = [0, 50, 150, 300, 500, 800, 1200, 1800, 2500, 3500, 5000]
BADGE_DEFINITIONS = {
    "first_message":  {"name": "First Contact",    "icon": "🌟", "desc": "Sent your first message"},
    "chat_10":        {"name": "Chatterbox",       "icon": "💬", "desc": "Sent 10 messages"},
    "chat_50":        {"name": "Communicator",     "icon": "📡", "desc": "Sent 50 messages"},
    "ai_user":        {"name": "AI Whisperer",     "icon": "🧠", "desc": "Used AI features"},
    "encrypted":      {"name": "Crypto Agent",     "icon": "🔐", "desc": "Sent encrypted messages"},
    "level_5":        {"name": "Veteran",          "icon": "⚡", "desc": "Reached Level 5"},
    "level_10":       {"name": "Legend",           "icon": "👑", "desc": "Reached Level 10"},
    "network_wizard": {"name": "Network Wizard",   "icon": "🌐", "desc": "Used network simulator"},
    "speed_demon":    {"name": "Speed Demon",      "icon": "🏎️", "desc": "Sent 5 messages in 10 seconds"},
    "night_owl":      {"name": "Night Owl",        "icon": "🦉", "desc": "Chatted after midnight"},
}

# ── Network Simulator Defaults ────────────────────────────────
DEFAULT_PACKET_LOSS   = 0.0    # 0-1 probability
DEFAULT_LATENCY_MS    = 0      # Added delay in ms
DEFAULT_JITTER_MS     = 0      # Randomized +/- ms
DEFAULT_CONGESTION    = 0.0    # 0-1 throttle level

# ── Encryption ────────────────────────────────────────────────
AES_KEY_LENGTH = 32     # 256-bit
AES_IV_LENGTH  = 16

# ── Distributed Simulation ────────────────────────────────────
NUM_VIRTUAL_NODES = 3
NODE_HEALTH_INTERVAL = 5  # seconds between health checks

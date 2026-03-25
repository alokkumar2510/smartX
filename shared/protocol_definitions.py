"""
─── protocol_definitions.py ──────────────────────────────
Protocol type enums and configuration shared across modules.
"""
from enum import Enum


class ProtocolType(Enum):
    """Supported transport protocols."""
    TCP = "TCP"
    UDP = "UDP"
    HYBRID = "HYBRID"
    WEBRTC = "WEBRTC"
    AUTO = "AUTO"


class PacketType(Enum):
    """Types of network packets."""
    DATA = 0
    ACK = 1
    HEARTBEAT = 2
    CONTROL = 3
    ERROR = 4


# Protocol selection criteria
PROTOCOL_RULES = {
    ProtocolType.TCP: {
        "description": "Reliable, ordered delivery with acknowledgment",
        "use_cases": ["text_messages", "file_transfer", "authentication"],
        "overhead": "high",
        "latency": "medium",
        "reliability": "guaranteed",
    },
    ProtocolType.UDP: {
        "description": "Fast, low-latency with no delivery guarantee",
        "use_cases": ["typing_indicators", "presence", "voice_data", "heartbeats"],
        "overhead": "low",
        "latency": "low",
        "reliability": "best_effort",
    },
    ProtocolType.HYBRID: {
        "description": "Smart routing combining TCP reliability with UDP speed",
        "use_cases": ["system_messages", "batch_updates"],
        "overhead": "medium",
        "latency": "adaptive",
        "reliability": "high",
    },
}

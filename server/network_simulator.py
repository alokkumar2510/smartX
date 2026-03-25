#!/usr/bin/env python3
"""
server/network_simulator.py — SmartChat X Network Condition Simulator
════════════════════════════════════════════════════════════════════
Simulates real-world network conditions:
  • Packet loss (random drop)
  • Latency (added delay)
  • Jitter (random delay variance)
  • Congestion (throttling)
  
Shows impact on chat in real-time.
"""

import random
import time
import asyncio
import logging
from dataclasses import dataclass, field

logger = logging.getLogger("SmartChatX.NetSim")


@dataclass
class NetworkCondition:
    """Current network simulation parameters."""
    packet_loss: float = 0.0      # 0.0 - 1.0 probability
    latency_ms: int = 0           # Base delay in ms
    jitter_ms: int = 0            # Random +/- ms
    congestion: float = 0.0       # 0.0 - 1.0 throttle level
    enabled: bool = False
    name: str = "Normal"

    def to_dict(self):
        return {
            "packet_loss": self.packet_loss,
            "latency_ms": self.latency_ms,
            "jitter_ms": self.jitter_ms,
            "congestion": self.congestion,
            "enabled": self.enabled,
            "name": self.name,
            "quality_score": self.quality_score()
        }

    def quality_score(self) -> float:
        """Calculate overall network quality (0-100)."""
        if not self.enabled:
            return 100.0
        loss_penalty = self.packet_loss * 40
        latency_penalty = min(self.latency_ms / 10, 30)
        jitter_penalty = min(self.jitter_ms / 5, 15)
        congestion_penalty = self.congestion * 15
        return max(0, round(100 - loss_penalty - latency_penalty - 
                            jitter_penalty - congestion_penalty, 1))


# ── Preset Network Conditions ────────────────────────────────
PRESETS = {
    "perfect": NetworkCondition(
        name="Perfect", enabled=True,
        packet_loss=0.0, latency_ms=1, jitter_ms=0, congestion=0.0
    ),
    "good_wifi": NetworkCondition(
        name="Good WiFi", enabled=True,
        packet_loss=0.01, latency_ms=20, jitter_ms=5, congestion=0.05
    ),
    "mobile_4g": NetworkCondition(
        name="Mobile 4G", enabled=True,
        packet_loss=0.02, latency_ms=50, jitter_ms=15, congestion=0.1
    ),
    "poor_wifi": NetworkCondition(
        name="Poor WiFi", enabled=True,
        packet_loss=0.1, latency_ms=100, jitter_ms=40, congestion=0.3
    ),
    "congested": NetworkCondition(
        name="Congested Network", enabled=True,
        packet_loss=0.15, latency_ms=200, jitter_ms=80, congestion=0.6
    ),
    "satellite": NetworkCondition(
        name="Satellite Link", enabled=True,
        packet_loss=0.05, latency_ms=600, jitter_ms=100, congestion=0.2
    ),
    "chaos": NetworkCondition(
        name="Chaos Mode 🔥", enabled=True,
        packet_loss=0.3, latency_ms=500, jitter_ms=200, congestion=0.8
    ),
}


@dataclass
class SimulationStats:
    """Track simulation effects."""
    total_packets: int = 0
    dropped_packets: int = 0
    delayed_packets: int = 0
    total_delay_ms: float = 0
    congestion_throttled: int = 0
    history: list = field(default_factory=list)


class NetworkSimulator:
    """
    Simulates network conditions and applies them to messages.
    
    Flow:
    ┌────────────────────────────────────────────────┐
    │  MESSAGE IN                                     │
    │      ↓                                          │
    │  [Packet Loss Check] ──Drop──→ Message Lost 💀  │
    │      ↓ (survived)                               │
    │  [Congestion Check] ──→ Throttle/delay          │
    │      ↓                                          │
    │  [Latency + Jitter] ──→ Add delay               │
    │      ↓                                          │
    │  MESSAGE OUT (after simulated delay)             │
    └────────────────────────────────────────────────┘
    """

    def __init__(self):
        self.condition = NetworkCondition()
        self.stats = SimulationStats()
        logger.info("🧪 Network Simulator initialized")

    def set_condition(self, preset_name: str = None, custom: dict = None) -> dict:
        """
        Set network conditions from a preset or custom values.
        """
        if preset_name and preset_name in PRESETS:
            self.condition = NetworkCondition(
                **{k: v for k, v in PRESETS[preset_name].__dict__.items()}
            )
            logger.info(f"🧪 NetSim | Preset activated: {self.condition.name}")
        elif custom:
            self.condition = NetworkCondition(
                packet_loss=min(max(custom.get("packet_loss", 0), 0), 1),
                latency_ms=max(custom.get("latency_ms", 0), 0),
                jitter_ms=max(custom.get("jitter_ms", 0), 0),
                congestion=min(max(custom.get("congestion", 0), 0), 1),
                enabled=True,
                name="Custom"
            )
            logger.info(f"🧪 NetSim | Custom condition set: {self.condition.to_dict()}")
        else:
            self.condition = NetworkCondition()
            logger.info("🧪 NetSim | Reset to normal (disabled)")

        return self.condition.to_dict()

    def disable(self):
        """Disable simulation."""
        self.condition.enabled = False
        logger.info("🧪 NetSim | Disabled")

    async def process_message(self, message_data: dict) -> dict:
        """
        Apply network simulation effects to a message.
        Returns result with simulation details.
        """
        self.stats.total_packets += 1

        result = {
            "delivered": True,
            "original_data": message_data,
            "simulation": {
                "enabled": self.condition.enabled,
                "condition": self.condition.name,
                "effects": []
            }
        }

        if not self.condition.enabled:
            return result

        # ── Step 1: Packet Loss Check ─────────────────────
        if random.random() < self.condition.packet_loss:
            self.stats.dropped_packets += 1
            result["delivered"] = False
            result["simulation"]["effects"].append({
                "type": "packet_loss",
                "detail": f"Packet dropped (loss rate: {self.condition.packet_loss*100:.1f}%)"
            })
            self._record_event("drop")
            logger.info(f"🧪 NetSim | ❌ PACKET DROPPED | "
                         f"Loss rate: {self.condition.packet_loss*100:.1f}%")
            return result

        # ── Step 2: Congestion Throttle ───────────────────
        if self.condition.congestion > 0 and random.random() < self.condition.congestion:
            congestion_delay = int(self.condition.congestion * 500)
            self.stats.congestion_throttled += 1
            result["simulation"]["effects"].append({
                "type": "congestion",
                "detail": f"Congestion throttle: +{congestion_delay}ms delay",
                "extra_delay_ms": congestion_delay
            })
            await asyncio.sleep(congestion_delay / 1000)
            self._record_event("congestion")

        # ── Step 3: Latency + Jitter ──────────────────────
        if self.condition.latency_ms > 0:
            jitter = random.randint(-self.condition.jitter_ms, self.condition.jitter_ms)
            total_delay = max(0, self.condition.latency_ms + jitter)
            self.stats.delayed_packets += 1
            self.stats.total_delay_ms += total_delay
            result["simulation"]["effects"].append({
                "type": "latency",
                "detail": f"Latency: {self.condition.latency_ms}ms + jitter: {jitter:+d}ms = {total_delay}ms",
                "delay_ms": total_delay,
                "jitter_ms": jitter
            })
            await asyncio.sleep(total_delay / 1000)
            self._record_event("delay", total_delay)

        # ── Record quality snapshot ───────────────────────
        result["simulation"]["quality_score"] = self.condition.quality_score()

        return result

    def process_message_sync(self, message_data: dict) -> dict:
        """Synchronous version for non-async contexts."""
        self.stats.total_packets += 1
        result = {
            "delivered": True,
            "simulation": {
                "enabled": self.condition.enabled,
                "condition": self.condition.name,
                "effects": []
            }
        }

        if not self.condition.enabled:
            return result

        if random.random() < self.condition.packet_loss:
            self.stats.dropped_packets += 1
            result["delivered"] = False
            result["simulation"]["effects"].append({
                "type": "packet_loss",
                "detail": f"Packet dropped ({self.condition.packet_loss*100:.1f}% loss)"
            })
            return result

        return result

    def _record_event(self, event_type: str, value: float = 0):
        """Record simulation event for graphing."""
        self.stats.history.append({
            "type": event_type,
            "value": value,
            "time": time.time()
        })
        # Keep last 200 events
        if len(self.stats.history) > 200:
            self.stats.history = self.stats.history[-200:]

    def get_stats(self) -> dict:
        """Return simulation statistics for dashboard."""
        total = max(self.stats.total_packets, 1)
        return {
            "condition": self.condition.to_dict(),
            "total_packets": self.stats.total_packets,
            "dropped_packets": self.stats.dropped_packets,
            "delayed_packets": self.stats.delayed_packets,
            "congestion_events": self.stats.congestion_throttled,
            "drop_rate": round(self.stats.dropped_packets / total * 100, 2),
            "avg_delay_ms": round(
                self.stats.total_delay_ms / max(self.stats.delayed_packets, 1), 1
            ),
            "quality_score": self.condition.quality_score(),
            "available_presets": list(PRESETS.keys()),
            "recent_events": self.stats.history[-20:]
        }


# Singleton
network_sim = NetworkSimulator()

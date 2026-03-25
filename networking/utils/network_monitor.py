"""
─── network_monitor.py ───────────────────────────────────
Network statistics collector for monitoring performance.
"""
import time
from collections import deque
from dataclasses import dataclass, field


@dataclass
class NetworkMetrics:
    """Container for network performance metrics."""
    packets_sent: int = 0
    packets_received: int = 0
    bytes_sent: int = 0
    bytes_received: int = 0
    latency_samples: deque = field(default_factory=lambda: deque(maxlen=100))
    errors: int = 0

    @property
    def avg_latency(self) -> float:
        if not self.latency_samples:
            return 0
        return sum(self.latency_samples) / len(self.latency_samples)

    @property
    def packet_loss_rate(self) -> float:
        total = self.packets_sent
        if total == 0:
            return 0
        return (total - self.packets_received) / total


class NetworkMonitor:
    """Collects and reports network metrics."""

    def __init__(self):
        self.metrics = NetworkMetrics()
        self._start_time = time.time()

    def record_send(self, size: int):
        self.metrics.packets_sent += 1
        self.metrics.bytes_sent += size

    def record_receive(self, size: int):
        self.metrics.packets_received += 1
        self.metrics.bytes_received += size

    def record_latency(self, ms: float):
        self.metrics.latency_samples.append(ms)

    def record_error(self):
        self.metrics.errors += 1

    def get_report(self) -> dict:
        uptime = time.time() - self._start_time
        return {
            "packets_sent": self.metrics.packets_sent,
            "packets_received": self.metrics.packets_received,
            "bytes_sent": self.metrics.bytes_sent,
            "bytes_received": self.metrics.bytes_received,
            "avg_latency_ms": round(self.metrics.avg_latency, 2),
            "packet_loss_rate": round(self.metrics.packet_loss_rate, 4),
            "errors": self.metrics.errors,
            "uptime_seconds": round(uptime, 1),
        }

"""
─── analytics.py ─────────────────────────────────────────
Analytics data models.
"""
from pydantic import BaseModel
from typing import List


class DashboardStats(BaseModel):
    total_messages: int
    online_users: int
    avg_latency_ms: float
    encryption_rate: float
    tcp_count: int
    udp_count: int
    hybrid_count: int


class TimelineEntry(BaseModel):
    label: str
    count: int


class LatencyData(BaseModel):
    data: List[float]
    unit: str = "ms"

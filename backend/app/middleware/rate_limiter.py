"""
─── rate_limiter.py ──────────────────────────────────────
Simple in-memory rate limiter middleware.
"""
import time
from collections import defaultdict
from fastapi import Request, HTTPException


class RateLimiter:
    """Token bucket rate limiter."""

    def __init__(self, max_requests: int = 60, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window = window_seconds
        self._requests = defaultdict(list)

    async def check(self, request: Request):
        """Check if request should be rate limited."""
        client_ip = request.client.host
        now = time.time()

        # Clean old entries
        self._requests[client_ip] = [
            t for t in self._requests[client_ip]
            if now - t < self.window
        ]

        if len(self._requests[client_ip]) >= self.max_requests:
            raise HTTPException(status_code=429, detail="Too many requests")

        self._requests[client_ip].append(now)

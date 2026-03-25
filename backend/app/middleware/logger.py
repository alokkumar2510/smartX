"""
─── logger.py ────────────────────────────────────────────
Request/response logging middleware.
"""
import time
import logging
from fastapi import Request

logger = logging.getLogger("smartchat.http")


async def log_request(request: Request, call_next):
    """Log incoming requests and response times."""
    start = time.time()
    response = await call_next(request)
    duration = round((time.time() - start) * 1000, 2)

    logger.info(
        f"{request.method} {request.url.path} → {response.status_code} ({duration}ms)"
    )

    return response

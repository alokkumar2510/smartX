"""
─── retry.py ─────────────────────────────────────────────
Retry logic with exponential backoff for network operations.
"""
import time
import logging
from functools import wraps

logger = logging.getLogger("smartchat.retry")


def retry(max_retries: int = 3, base_delay: float = 1.0, exponential: bool = True):
    """Decorator for retrying failed operations with backoff."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_retries:
                        logger.error(f"[Retry] {func.__name__} failed after {max_retries + 1} attempts: {e}")
                        raise

                    delay = base_delay * (2 ** attempt if exponential else 1)
                    logger.warning(f"[Retry] {func.__name__} attempt {attempt + 1} failed, retrying in {delay}s: {e}")
                    time.sleep(delay)
        return wrapper
    return decorator

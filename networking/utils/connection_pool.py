"""
─── connection_pool.py ───────────────────────────────────
Connection pool manager for reusing socket connections.
"""
import socket
from collections import deque
from threading import Lock


class ConnectionPool:
    """Thread-safe connection pool for TCP sockets."""

    def __init__(self, host: str, port: int, max_size: int = 10):
        self.host = host
        self.port = port
        self.max_size = max_size
        self._pool = deque()
        self._lock = Lock()

    def get_connection(self) -> socket.socket:
        """Get a connection from the pool or create a new one."""
        with self._lock:
            if self._pool:
                return self._pool.pop()

        conn = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        conn.connect((self.host, self.port))
        return conn

    def return_connection(self, conn: socket.socket):
        """Return a connection to the pool."""
        with self._lock:
            if len(self._pool) < self.max_size:
                self._pool.append(conn)
            else:
                conn.close()

    def close_all(self):
        """Close all pooled connections."""
        with self._lock:
            while self._pool:
                self._pool.pop().close()

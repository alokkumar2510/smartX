"""
─── database.py ──────────────────────────────────────────
SQLite database setup — creates tables on startup.
Uses WAL mode + busy timeout for concurrent access.
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "smartchat.db")


def get_db() -> sqlite3.Connection:
    """Get a database connection with proper concurrency settings."""
    conn = sqlite3.connect(DB_PATH, timeout=10.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db() -> None:
    """Initialize database tables."""
    conn = get_db()
    try:
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                avatar TEXT DEFAULT '👤',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_online INTEGER DEFAULT 0
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sender_id INTEGER NOT NULL,
                sender_username TEXT NOT NULL,
                content TEXT,
                image_url TEXT,
                protocol TEXT DEFAULT 'TCP',
                delivered INTEGER DEFAULT 0,
                read INTEGER DEFAULT 0,
                dropped INTEGER DEFAULT 0,
                room TEXT DEFAULT 'global',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (sender_id) REFERENCES users(id)
            )
        """)

        # Reset online status on startup
        cursor.execute("UPDATE users SET is_online = 0")

        conn.commit()
        print(f"[DB] Database initialized at {DB_PATH}")
    finally:
        conn.close()

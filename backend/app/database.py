"""
─── database.py ──────────────────────────────────────────
Database setup with automatic fallback between PostgreSQL
and SQLite3 depending on the environment context.
"""
import os
import sqlite3
from dotenv import load_dotenv

load_dotenv()

DB_URL = os.getenv("DATABASE_URL")
SQLITE_DB_PATH = os.path.join(os.path.dirname(__file__), "..", "smartchat.db")

class PostgresAdapter:
    def __init__(self, conn):
        self.conn = conn
        import psycopg2.extras
        self.cursor_factory = psycopg2.extras.DictCursor
    
    def execute(self, query, params=None):
        query = query.replace("?", "%s")
        cursor = self.conn.cursor(cursor_factory=self.cursor_factory)
        cursor.execute(query, params)
        return cursor
        
    def commit(self):
        self.conn.commit()
        
    def close(self):
        self.conn.close()

class SqliteAdapter:
    def __init__(self, conn):
        self.conn = conn
        self.conn.row_factory = sqlite3.Row
    
    def execute(self, query, params=None):
        should_fetch_id = False
        if "RETURNING id" in query:
            query = query.replace("RETURNING id", "")
            should_fetch_id = True
            
        cursor = self.conn.cursor()
        cursor.execute(query, params or ())
        
        if should_fetch_id:
            class DummyCursor:
                def __init__(self, last_id):
                    self.last_id = last_id
                def fetchone(self):
                    return [self.last_id]
            return DummyCursor(cursor.lastrowid)
            
        return cursor
        
    def commit(self):
        self.conn.commit()
        
    def close(self):
        self.conn.close()

def get_db():
    if DB_URL:
        # Import psycopg2 locally here so it doesn't crash the app if missing locally
        import psycopg2
        conn = psycopg2.connect(DB_URL)
        return PostgresAdapter(conn)
    else:
        conn = sqlite3.connect(SQLITE_DB_PATH)
        return SqliteAdapter(conn)

def init_db() -> None:
    """Initialize database tables."""
    if DB_URL:
        print(f"[DB] Connected to PostgreSQL at {DB_URL.split('@')[-1]}")
    else:
        print(f"[DB] Notice: DATABASE_URL not set. Using local SQLite at {SQLITE_DB_PATH}")
        db = get_db()
        db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                avatar TEXT DEFAULT '👤',
                is_online BOOLEAN DEFAULT 0,
                last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        db.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sender_id INTEGER NOT NULL,
                sender_username TEXT NOT NULL,
                content TEXT,
                image_url TEXT,
                room TEXT DEFAULT 'global',
                protocol TEXT DEFAULT 'TCP',
                delivered BOOLEAN DEFAULT 0,
                read BOOLEAN DEFAULT 0,
                dropped BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (sender_id) REFERENCES users (id)
            )
        """)
        db.commit()
        db.close()


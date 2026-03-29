"""
─── database.py ──────────────────────────────────────────
PostgreSQL database setup for Supabase using psycopg2.
Adapter created to mimic sqlite3 for seamless integration.
"""
import os
import sqlite3
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

DB_URL = os.getenv("DATABASE_URL")
# SQLite database path
SQLITE_DB_PATH = os.path.join(os.path.dirname(__file__), "..", "smartchat.db")

class PostgresAdapter:
    def __init__(self, conn):
        self.conn = conn
    
    def execute(self, query, params=None):
        # Convert sqlite ? placeholders to psycopg2 %s placeholders
        query = query.replace("?", "%s")
        cursor = self.conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cursor.execute(query, params)
        return cursor
        
    def commit(self):
        self.conn.commit()
        
    def close(self):
        self.conn.close()

def get_db():
    if DB_URL:
        conn = psycopg2.connect(DB_URL)
        return PostgresAdapter(conn)
    else:
        # Fallback to local SQLite database if no Postgres
        conn = sqlite3.connect(SQLITE_DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn

def init_db() -> None:
    """Initialize database tables."""
    if DB_URL:
        print(f"[DB] Connected to PostgreSQL at {DB_URL.split('@')[-1]}")
    else:
        print(f"[DB] Notice: DATABASE_URL not set. Using local SQLite at {SQLITE_DB_PATH}")
        # Initialize SQLite tables
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

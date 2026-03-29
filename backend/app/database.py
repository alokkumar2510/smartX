"""
─── database.py ──────────────────────────────────────────
PostgreSQL database setup for Supabase using psycopg2.
Adapter created to mimic sqlite3 for seamless integration.
"""
import os
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

DB_URL = os.getenv("DATABASE_URL")

class DBAdapter:
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
    if not DB_URL:
        raise Exception("DATABASE_URL environment variable is not set. Please set it in your .env file with your Supabase Postgres connection string.")
    
    conn = psycopg2.connect(DB_URL)
    return DBAdapter(conn)

def init_db() -> None:
    """Initialize database tables (tables are handled by Supabase migrations)."""
    if DB_URL:
        print(f"[DB] Connected to PostgreSQL at {DB_URL.split('@')[1]}")
    else:
        print("[DB] Warning: DATABASE_URL not set!")

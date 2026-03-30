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

def _init_tables(db):
    # Detect the database type (Postgres vs SQLite)
    is_postgres = hasattr(db, 'conn') and 'psycopg2' in str(type(db.conn))
    
    id_type = "SERIAL PRIMARY KEY" if is_postgres else "INTEGER PRIMARY KEY AUTOINCREMENT"
    bool_type = "BOOLEAN DEFAULT false" if is_postgres else "BOOLEAN DEFAULT 0"
    
    db.execute(f"""
        CREATE TABLE IF NOT EXISTS users (
            id {id_type},
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            avatar TEXT DEFAULT '👤',
            is_online {bool_type},
            last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    db.execute(f"""
        CREATE TABLE IF NOT EXISTS messages (
            id {id_type},
            sender_id INTEGER NOT NULL,
            sender_username TEXT NOT NULL,
            content TEXT,
            image_url TEXT,
            room TEXT DEFAULT 'global',
            protocol TEXT DEFAULT 'TCP',
            delivered {bool_type},
            read {bool_type},
            dropped {bool_type},
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sender_id) REFERENCES users (id)
        )
    """)
    db.commit()

def get_db():
    if DB_URL:
        # Import psycopg2 locally here so it doesn't crash the app if missing locally
        try:
            import psycopg2
            # Use a strict 10 second timeout so we handle cloud pooler delays reliably.
            conn = psycopg2.connect(DB_URL.strip(), connect_timeout=10)
            adapter = PostgresAdapter(conn)
            # Ensure tables exist on Supabase
            _init_tables(adapter)
            return adapter
        except Exception as e:
            # If the database URL is incorrectly formatted, the password expired, or IPv4 is blocked,
            # gracefully catch it, print an error so they can debug it, and run the self-contained SQLite.
            print(f"[DB ERROR] PostgreSQL Connection Failed: {str(e)[:150]}... Falling back to SQLite!")
            conn = sqlite3.connect(SQLITE_DB_PATH)
            adapter = SqliteAdapter(conn)
            _init_tables(adapter)
            return adapter
    else:
        conn = sqlite3.connect(SQLITE_DB_PATH)
        adapter = SqliteAdapter(conn)
        _init_tables(adapter)
        return adapter

def init_db() -> None:
    """Initialize database tables."""
    db = get_db()
    db.close()


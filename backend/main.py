"""
═══════════════════════════════════════════════════════════
  SmartChat X v3.0 — Complete Integrated Backend Server
  FastAPI + WebSocket + SQLite + JWT Auth + TCP/UDP Bridge
  + AI Engine + WebRTC Signaling + Adaptive Protocol Router
═══════════════════════════════════════════════════════════

Architecture:
  This server is Layer 2 — the Backend API.
  It connects:
    Layer 1 (React Frontend) ← via WebSocket + REST
    Layer 3 (TCP/UDP Servers) ← via NetworkBridge sockets
    Layer 4 (WebRTC P2P) ← via Signaling Server

Integration Flow:
  React → WebSocket → This Server → NetworkBridge
  → TCP Server (port 9000) or UDP Server (port 9001)
  → Packet fragmentation, ACK handling, loss simulation
  → Response back through WebSocket to React

New Features (v3.0):
  ✦ AI-Powered Chat Engine (smart replies, toxicity, summarizer, study mode)
  ✦ Adaptive Multi-Protocol Routing (auto TCP/UDP/Hybrid/WebRTC)
  ✦ WebRTC P2P Signaling Server (for direct browser-to-browser messages)
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, UploadFile, File, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List
import json
import os
import uuid
import time
import threading
import asyncio
import logging
from datetime import datetime

from app.database import get_db, init_db
from app.utils.auth import hash_password, verify_password, create_token, decode_token
from app.sockets.ws_manager import manager
from app.sockets.network_bridge import network_bridge
from app.services.ai_engine import ai_engine
from app.services.groq_ai import groq_ai

# ── Logging ──────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(name)s] %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger("SmartChatX.Backend")

# ─── Initialize ──────────────────────────────────────────
app = FastAPI(
    title="SmartChat X API",
    version="3.0.0",
    description="Advanced TCP/UDP Chat System Backend with AI Engine, WebRTC & Adaptive Routing"
)

@app.api_route("/", methods=["GET", "HEAD"])
async def root():
    return {"message": "SmartChat X Backend is Live", "version": "3.0"}

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        # Custom domains
        "https://smartchatx.alokkumarsahu.in",
        "https://smartx.alokkumarsahu.in",
        "https://alokkumarsahu.in",
        "https://www.alokkumarsahu.in",
        # Cloudflare Pages (live)
        "https://smartchatx-app.pages.dev",
        "https://smartchatx-landing.pages.dev",
        # Netlify (legacy / fallback)
        "https://smartchatx-app.netlify.app",
        "https://smartchatx.netlify.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Uploads directory
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.on_event("startup")
async def startup():
    import sqlite3 as _sqlite3, os as _os
    # Enable WAL mode for SQLite so concurrent reads don't block writes
    _sqlite_path = _os.path.join(_os.path.dirname(__file__), "smartchat.db")
    try:
        _conn = _sqlite3.connect(_sqlite_path)
        _conn.execute("PRAGMA journal_mode=WAL")
        _conn.execute("PRAGMA synchronous=NORMAL")   # faster fsync, still safe
        _conn.execute("PRAGMA cache_size=-32000")    # 32 MB page cache
        _conn.execute("PRAGMA temp_store=MEMORY")
        _conn.execute("PRAGMA mmap_size=134217728")  # 128 MB mmap
        _conn.commit()
        _conn.close()
        logger.info("✅ SQLite WAL mode enabled")
    except Exception as _e:
        logger.warning(f"WAL pragma skipped (PostgreSQL?): {_e}")
    init_db()
    # Create / migrate DMs table
    try:
        db = get_db()
        is_pg = hasattr(db, 'conn') and 'psycopg2' in str(type(db.conn))
        id_col = "SERIAL PRIMARY KEY" if is_pg else "INTEGER PRIMARY KEY AUTOINCREMENT"
        db.execute(f"""CREATE TABLE IF NOT EXISTS direct_messages (
            id {id_col},
            sender_id INTEGER NOT NULL,
            sender_username TEXT NOT NULL,
            target_user_id INTEGER NOT NULL,
            content TEXT,
            image_url TEXT,
            content_type TEXT DEFAULT 'text',
            voice_url TEXT,
            voice_duration REAL DEFAULT 0,
            file_url TEXT,
            file_name TEXT,
            file_size INTEGER DEFAULT 0,
            reply_to TEXT,
            protocol TEXT DEFAULT 'TCP',
            status TEXT DEFAULT 'sent',
            delivered INTEGER DEFAULT 0,
            read INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""")
        db.commit()
        # Add missing columns to existing tables (safe ALTER TABLE)
        extra_cols = [
            ("content_type", "TEXT DEFAULT 'text'"),
            ("voice_url",    "TEXT"),
            ("voice_duration", "REAL DEFAULT 0"),
            ("file_url",     "TEXT"),
            ("file_name",    "TEXT"),
            ("file_size",    "INTEGER DEFAULT 0"),
            ("reply_to",     "TEXT"),
            ("reactions",    "TEXT DEFAULT '{}'"),
            ("deleted",      "INTEGER DEFAULT 0"),
        ]
        for col, col_def in extra_cols:
            try:
                db.execute(f"ALTER TABLE direct_messages ADD COLUMN {col} {col_def}")
                db.commit()
            except Exception:
                pass  # Column already exists
        # ── Performance indexes for DM queries ───────────────────
        try:
            db.execute("""
                CREATE INDEX IF NOT EXISTS idx_dm_chat
                ON direct_messages (sender_id, target_user_id, id DESC)
            """)
            db.execute("""
                CREATE INDEX IF NOT EXISTS idx_dm_target
                ON direct_messages (target_user_id, id DESC)
            """)
            db.commit()
        except Exception:
            pass
        db.close()
    except Exception as e:
        logger.warning(f"DM table creation/migration: {e}")
    logger.info("═" * 55)
    logger.info("  ⚡ SmartChat X Backend v5.0 — ONLINE")
    logger.info("  REST API:  http://127.0.0.1:8000")
    logger.info("  WebSocket: ws://127.0.0.1:8000/ws/{token}")
    logger.info("  TCP Bridge → port 9000 | UDP → port 9001")
    logger.info(f"  🧠 Groq AI:  {'ENABLED ✅' if groq_ai.enabled else 'DISABLED (set GROQ_API_KEY)'}")
    logger.info("  📞 Calling + P2P: ACTIVE")
    logger.info("═" * 55)


# ─── Pydantic Models ────────────────────────────────────
class RegisterRequest(BaseModel):
    username: str
    password: str
    avatar: str = "👤"

class LoginRequest(BaseModel):
    username: str
    password: str

class MessageCreate(BaseModel):
    content: Optional[str] = None
    image_url: Optional[str] = None
    protocol: str = "TCP"
    room: str = "global"

class AIAnalyzeRequest(BaseModel):
    content: str
    context: Optional[List[str]] = None

class StudyQueryRequest(BaseModel):
    query: str

class SummarizeRequest(BaseModel):
    room: str = "global"
    limit: int = 50


# ─── Helper: Get current user from token ────────────────
def get_current_user(token: str):
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload


# ═════════════════════════════════════════════════════════
#  AUTH ROUTES
# ═════════════════════════════════════════════════════════

@app.post("/api/register")
async def register(req: RegisterRequest):
    if len(req.username) < 2 or len(req.password) < 3:
        raise HTTPException(400, "Username min 2 chars, password min 3 chars")

    db = get_db()
    existing = db.execute("SELECT id FROM users WHERE username = ?", (req.username,)).fetchone()
    if existing:
        db.close()
        raise HTTPException(400, "Username already taken")

    hashed = hash_password(req.password)
    cursor = db.execute(
        "INSERT INTO users (username, password_hash, avatar) VALUES (?, ?, ?) RETURNING id",
        (req.username, hashed, req.avatar)
    )
    user_id = cursor.fetchone()[0]
    db.commit()
    db.close()

    token = create_token({"user_id": user_id, "username": req.username})
    logger.info(f"🆕 User registered: {req.username} (ID: {user_id})")

    return {
        "token": token,
        "user": {"id": user_id, "username": req.username, "avatar": req.avatar}
    }


@app.post("/api/login")
async def login(req: LoginRequest):
    db = get_db()
    user = db.execute("SELECT * FROM users WHERE username = ?", (req.username,)).fetchone()
    db.close()

    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(401, "Invalid username or password")

    token = create_token({"user_id": user["id"], "username": user["username"]})
    logger.info(f"🔑 User logged in: {user['username']}")

    return {
        "token": token,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "avatar": user["avatar"],
        }
    }


@app.get("/api/me")
async def get_me(token: str):
    payload = get_current_user(token)
    db = None
    try:
        db = get_db()
        # Try by integer ID first (legacy), then by username (Supabase)
        user = None
        uid = payload.get("user_id")
        if isinstance(uid, int) or (isinstance(uid, str) and uid.isdigit()):
            user = db.execute("SELECT id, username, avatar, last_seen FROM users WHERE id = ?", (int(uid),)).fetchone()
        if not user and payload.get("username"):
            user = db.execute("SELECT id, username, avatar, last_seen FROM users WHERE username = ?", (payload["username"],)).fetchone()
        if not user:
            raise HTTPException(404, "User not found")
        result = dict(user)
        result["email"] = payload.get("email")
        return result
    finally:
        if db:
            db.close()


@app.post("/api/auth/profile")
async def sync_supabase_profile(token: str, username: str = None, avatar: str = "👤"):
    """Sync Supabase Auth user to local users table."""
    payload = get_current_user(token)
    uname = username or payload.get("username", "user")
    db = None
    try:
        db = get_db()
        existing = db.execute("SELECT id, username, avatar FROM users WHERE username = ?", (uname,)).fetchone()
        if existing:
            return {"user": dict(existing), "synced": True}
        cursor = db.execute(
            "INSERT INTO users (username, password_hash, avatar) VALUES (?, ?, ?) RETURNING id",
            (uname, "supabase_auth", avatar)
        )
        user_id = cursor.fetchone()[0]
        db.commit()
        logger.info(f"🔗 Supabase user synced: {uname} (ID: {user_id})")
        return {"user": {"id": user_id, "username": uname, "avatar": avatar}, "synced": True}
    finally:
        if db:
            db.close()


# ═════════════════════════════════════════════════════════
#  USERS ROUTES
# ═════════════════════════════════════════════════════════

@app.get("/api/users")
async def get_users(token: str = None):
    # Auth guard — require valid token to enumerate users
    if token:
        get_current_user(token)  # raises 401 if invalid
    db = None
    try:
        db = get_db()
        users = db.execute(
            "SELECT id, username, avatar, is_online, last_seen FROM users ORDER BY is_online DESC, username"
        ).fetchall()
        return [dict(u) for u in users]
    finally:
        if db:
            db.close()


@app.get("/api/users/online")
async def get_online_users():
    return manager.get_online_list()


# ═════════════════════════════════════════════════════════
#  MESSAGES ROUTES (with cursor-based pagination)
# ═════════════════════════════════════════════════════════

@app.get("/api/messages")
async def get_messages(room: str = "global", limit: int = 50, before_id: int = None):
    """Get messages with cursor-based pagination for infinite scroll.
    - before_id: fetch messages older than this ID
    - limit: max messages per page (default 50)
    """
    db = None
    try:
        db = get_db()
        if before_id:
            messages = db.execute(
                """SELECT id, sender_id, sender_username, content, image_url,
                          protocol, delivered, read, dropped, room, reply_to, created_at
                   FROM messages WHERE room = ? AND id < ?
                   ORDER BY id DESC LIMIT ?""",
                (room, before_id, limit)
            ).fetchall()
        else:
            messages = db.execute(
                """SELECT id, sender_id, sender_username, content, image_url,
                          protocol, delivered, read, dropped, room, reply_to, created_at
                   FROM messages WHERE room = ?
                   ORDER BY id DESC LIMIT ?""",
                (room, limit)
            ).fetchall()
        result = []
        for m in reversed(messages):
            row = dict(m)
            # Parse reply_to JSON string → object
            if row.get('reply_to') and isinstance(row['reply_to'], str):
                try:
                    row['reply_to'] = json.loads(row['reply_to'])
                except Exception:
                    row['reply_to'] = None
            result.append(row)
        has_more = len(messages) == limit
        return {"messages": result, "has_more": has_more}
    finally:
        if db:
            db.close()


@app.get("/api/dm/history")
async def get_dm_history(user_id: int, target_id: int, limit: int = 50, before_id: int = None):
    """REST endpoint for DM history with pagination."""
    db = None
    try:
        db = get_db()
        if before_id:
            dms = db.execute(
                """SELECT * FROM direct_messages
                   WHERE ((sender_id = ? AND target_user_id = ?)
                      OR (sender_id = ? AND target_user_id = ?))
                      AND id < ?
                   ORDER BY id DESC LIMIT ?""",
                (user_id, target_id, target_id, user_id, before_id, limit)
            ).fetchall()
        else:
            dms = db.execute(
                """SELECT * FROM direct_messages
                   WHERE (sender_id = ? AND target_user_id = ?)
                      OR (sender_id = ? AND target_user_id = ?)
                   ORDER BY id DESC LIMIT ?""",
                (user_id, target_id, target_id, user_id, limit)
            ).fetchall()
        result = [dict(d) for d in reversed(dms)]
        has_more = len(dms) == limit
        return {"messages": result, "has_more": has_more}
    finally:
        if db:
            db.close()


@app.post("/api/dm/mark-read")
async def mark_dm_read(sender_id: int, reader_id: int):
    """Mark all DMs from sender as read by reader."""
    db = None
    try:
        db = get_db()
        db.execute(
            """UPDATE direct_messages SET status = 'read', read = 1
               WHERE sender_id = ? AND target_user_id = ? AND status != 'read'""",
            (sender_id, reader_id)
        )
        db.commit()
        return {"status": "ok"}
    finally:
        if db:
            db.close()


@app.delete("/api/dm/{message_id}")
async def delete_dm(message_id: int, user_id: str = None, token: str = None):
    """Soft-delete a DM (sender only). Call as DELETE /api/dm/<id>?token=<jwt>"""
    if not token:
        raise HTTPException(401, "Token required")
    payload = decode_token(token)
    if not payload:
        raise HTTPException(401, "Invalid token")
    requester = payload["user_id"]
    # Resolve Supabase UUID → integer id
    db = None
    try:
        db = get_db()
        if isinstance(requester, str) and not str(requester).isdigit():
            row = db.execute("SELECT id FROM users WHERE username = ?", (payload["username"],)).fetchone()
            if row:
                requester = row[0]
        msg = db.execute("SELECT sender_id, target_user_id FROM direct_messages WHERE id = ?", (message_id,)).fetchone()
        if not msg:
            raise HTTPException(404, "Message not found")
        if int(msg["sender_id"]) != int(requester):
            raise HTTPException(403, "Can only delete your own messages")
        db.execute("UPDATE direct_messages SET deleted = 1, content = '' WHERE id = ?", (message_id,))
        db.commit()
        return {"status": "ok", "message_id": message_id, "target_user_id": msg["target_user_id"]}
    finally:
        if db:
            db.close()


@app.post("/api/dm/{message_id}/react")
async def react_to_dm(message_id: int, emoji: str, token: str = None):
    """Toggle an emoji reaction on a DM. Returns updated reactions dict."""
    if not token:
        raise HTTPException(401, "Token required")
    payload = decode_token(token)
    if not payload:
        raise HTTPException(401, "Invalid token")
    username = payload["username"]
    user_id = payload["user_id"]
    db = None
    try:
        db = get_db()
        if isinstance(user_id, str) and not str(user_id).isdigit():
            row = db.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
            if row:
                user_id = row[0]
        msg = db.execute("SELECT reactions, sender_id, target_user_id FROM direct_messages WHERE id = ? AND deleted = 0", (message_id,)).fetchone()
        if not msg:
            raise HTTPException(404, "Message not found")
        reactions = json.loads(msg["reactions"] or "{}")
        if emoji not in reactions:
            reactions[emoji] = []
        uid = str(user_id)
        if uid in reactions[emoji]:
            reactions[emoji].remove(uid)
            if not reactions[emoji]:
                del reactions[emoji]
        else:
            reactions[emoji].append(uid)
        db.execute("UPDATE direct_messages SET reactions = ? WHERE id = ?", (json.dumps(reactions), message_id))
        db.commit()
        return {
            "status": "ok",
            "message_id": message_id,
            "reactions": reactions,
            "sender_id": msg["sender_id"],
            "target_user_id": msg["target_user_id"],
        }
    finally:
        if db:
            db.close()


@app.get("/api/dm/search")
async def search_dms(user_id: str, target_id: int, q: str, limit: int = 20):
    """Full-text search within a DM conversation."""
    db = None
    try:
        db = get_db()
        # Resolve UUID → int
        if isinstance(user_id, str) and not user_id.isdigit():
            row = db.execute("SELECT id FROM users WHERE username = ?", (user_id,)).fetchone()
            if row:
                user_id = row[0]
        user_id = int(user_id)
        dms = db.execute(
            """SELECT * FROM direct_messages
               WHERE ((sender_id = ? AND target_user_id = ?)
                   OR (sender_id = ? AND target_user_id = ?))
                  AND content LIKE ? AND deleted = 0
               ORDER BY id DESC LIMIT ?""",
            (user_id, target_id, target_id, user_id, f"%{q}%", limit)
        ).fetchall()
        return {"messages": [dict(d) for d in reversed(dms)]}
    finally:
        if db:
            db.close()


# ═════════════════════════════════════════════════════════
#  IMAGE UPLOAD
# ═════════════════════════════════════════════════════════

@app.post("/api/upload")
async def upload_image(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "Only image files are allowed")

    ext = file.filename.split(".")[-1] if "." in file.filename else "png"
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    logger.info(f"📸 Image uploaded: {filename} ({len(content)} bytes)")
    return {"url": f"/uploads/{filename}", "filename": filename}


# ═════════════════════════════════════════════════════════
#  AI ENGINE ROUTES
# ═════════════════════════════════════════════════════════

@app.post("/api/ai/analyze")
async def ai_analyze(req: AIAnalyzeRequest):
    """Analyze a message for toxicity and generate smart replies."""
    result = ai_engine.process_message(req.content, req.context)
    return result


@app.post("/api/ai/summarize")
async def ai_summarize(req: SummarizeRequest):
    """Summarize recent messages in a room."""
    db = get_db()
    messages = db.execute(
        """SELECT id, sender_id, sender_username, content, protocol, created_at
           FROM messages WHERE room = ?
           ORDER BY created_at DESC LIMIT ?""",
        (req.room, req.limit)
    ).fetchall()
    db.close()
    msg_list = [dict(m) for m in reversed(messages)]
    summary = ai_engine.summarize_messages(msg_list)
    return summary


@app.post("/api/ai/study")
async def ai_study(req: StudyQueryRequest):
    """Handle a study mode query."""
    result = ai_engine.handle_study_query(req.query)
    return result


@app.get("/api/ai/stats")
async def ai_stats():
    """Get AI engine statistics."""
    return ai_engine.get_stats()


@app.post("/api/ai/route-protocol")
async def ai_route_protocol(msg: dict):
    """Get AI-recommended protocol for a message."""
    protocol = ai_engine.select_protocol(msg)
    info = ai_engine.protocol_router.get_protocol_info(protocol)
    return {"recommended_protocol": protocol, "info": info}


# ═════════════════════════════════════════════════════════
#  HEALTH CHECK + NETWORK STATS
# ═════════════════════════════════════════════════════════

@app.get("/api/health")
async def health_check():
    """Primary health probe — used by frontend WebSocket reconnect logic."""
    return {
        "status": "ok",
        "version": "4.0",
        "online_users": manager.online_count,
        "ai_engine": "active",
        "webrtc_signaling": "active",
        "protocol_router": "active",
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/api/network/stats")
async def get_network_stats():
    """Get live TCP/UDP network statistics from the bridge."""
    return {
        "status": "active",
        "timestamp": datetime.utcnow().isoformat(),
        **manager.get_network_stats(),
        "ai_stats": ai_engine.get_stats(),
    }


# ═════════════════════════════════════════════════════════
#  WEBSOCKET — Real-time Chat with TCP/UDP + AI + WebRTC
# ═════════════════════════════════════════════════════════

@app.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str):
    """
    ═══════════════════════════════════════════════════
    MAIN WEBSOCKET HANDLER — The Integration Hub v3.0
    ═══════════════════════════════════════════════════

    New in v3.0:
    - AI toxicity screening on every message
    - Smart reply suggestions sent back
    - Study mode commands (/study, /quiz)
    - Adaptive protocol auto-selection
    - WebRTC signaling relay (offer/answer/ICE)
    - Chat summarization (/summarize)
    """
    # ── Authenticate ─────────────────────────────────
    payload = decode_token(token)
    if not payload:
        await websocket.close(code=4001, reason="Invalid token")
        return

    user_id = payload["user_id"]
    username = payload["username"]

    # ── Resolve Supabase UUID to DB integer ID ────────
    db_user_id = user_id
    try:
        db = get_db()
        if isinstance(user_id, str) and not user_id.isdigit():
            # Supabase user — look up by username
            row = db.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
            if row:
                db_user_id = row[0]
            else:
                # Auto-create profile
                cursor = db.execute(
                    "INSERT INTO users (username, password_hash, avatar) VALUES (?, ?, ?) RETURNING id",
                    (username, "supabase_auth", payload.get("avatar", "👤"))
                )
                db_user_id = cursor.fetchone()[0]
                db.commit()
        else:
            db_user_id = int(user_id)
        # Mark online
        db.execute("UPDATE users SET is_online = 1, last_seen = CURRENT_TIMESTAMP WHERE id = ?", (db_user_id,))
        db.commit()
    except Exception as e:
        logger.warning(f"[WS] DB resolve/mark-online failed: {e}")
    finally:
        try:
            db.close()
        except Exception:
            pass

    user_id = db_user_id  # Use resolved integer ID from here on

    # ── Connect WebSocket ────────────────────────────
    await manager.connect(user_id, username, websocket)
    logger.info(f"[WS] ⚡ {username} connected (ID: {user_id})")

    try:
        while True:
            data = await websocket.receive_text()
            # SEC: Reject oversized messages (64KB limit)
            if len(data) > 65536:
                await websocket.send_text(json.dumps({"type": "error", "message": "Message too large (max 64KB)"}))
                continue
            try:
                msg = json.loads(data)
            except json.JSONDecodeError:
                continue
            event_type = msg.get("type", "message")

            # ═══════════════════════════════════════════
            #  HANDLE: message — Full AI + TCP/UDP Pipeline
            # ═══════════════════════════════════════════
            if event_type == "message":
                content = msg.get("content", "")
                image_url = msg.get("image_url")
                protocol = msg.get("protocol", "TCP")
                room = msg.get("room", "global")

                # ── AI: Adaptive Protocol Selection ────
                if protocol == "AUTO":
                    protocol = ai_engine.select_protocol(msg)
                    logger.info(f"🌐 Auto-routed → {protocol} for {username}'s message")

                # Step 1: Save to DB immediately — don't wait for AI
                msg_id = 0
                db = None
                try:
                    db = get_db()
                    reply_to_json = json.dumps(msg.get("reply_to")) if msg.get("reply_to") else None
                    cursor = db.execute(
                        """INSERT INTO messages (sender_id, sender_username, content,
                           image_url, protocol, room, reply_to)
                           VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id""",
                        (user_id, username, content, image_url, protocol, room, reply_to_json)
                    )
                    msg_id = cursor.fetchone()[0]
                    db.commit()
                except Exception as e:
                    logger.error(f"[WS] DB insert failed: {e}")
                    msg_id = int(time.time() * 1000) % 1000000
                finally:
                    if db:
                        try: db.close()
                        except Exception: pass

                message_data = {
                    "id": msg_id,
                    "sender_id": user_id,
                    "sender_username": username,
                    "content": content,
                    "image_url": image_url,
                    "protocol": protocol,
                    "room": room,
                    "created_at": datetime.utcnow().isoformat(),
                    "delivered": 0,
                    "read": 0,
                    "dropped": 0,
                }
                if msg.get("reply_to"):
                    message_data["reply_to"] = msg["reply_to"]

                # Step 2: Send confirmation immediately (no AI wait)
                await websocket.send_text(json.dumps({
                    **message_data,
                    "type": "message_sent",
                    "auto_protocol": protocol if msg.get("protocol") == "AUTO" else None,
                }))

                # Step 3: Route through TCP/UDP and run AI in background
                # IMPORTANT: fire-and-forget — never await these in the hot path
                async def _background_tasks(ws=websocket, md=message_data,
                                            uid=user_id, uname=username, c=content):
                    # 3a. Network bridge delivery
                    try:
                        await manager.simulate_send(md, uid)
                    except Exception as _e:
                        logger.error(f"[WS] Network bridge error: {_e}")
                    # 3b. AI: toxicity + smart replies (non-blocking)
                    if c:
                        try:
                            tox = ai_engine.toxicity_detector.analyze(c)
                            replies = ai_engine.smart_reply.generate(c)
                            if tox["toxic"]:
                                logger.warning(f"⚠️ Toxic msg from {uname}: score={tox['score']}")
                                await ws.send_text(json.dumps({
                                    "type": "toxicity_warning",
                                    "score": tox["score"],
                                    "severity": tox["severity"],
                                    "flags": tox["flags"],
                                    "message": "⚠️ Your message may contain harmful content.",
                                }))
                            if replies:
                                await ws.send_text(json.dumps({
                                    "type": "smart_replies",
                                    "message_id": md["id"],
                                    "replies": replies,
                                }))
                        except Exception as _e:
                            logger.debug(f"AI task error: {_e}")

                asyncio.create_task(_background_tasks())

                logger.info(f"📨 [{protocol}] {username}: "
                            f"{content[:50]}{'...' if len(content)>50 else ''}")

            # ═══════════════════════════════════════════
            #  HANDLE: typing — routed to DM partner only
            # ═══════════════════════════════════════════
            elif event_type == "typing":
                target_id = msg.get("target_user_id")
                payload_typing = json.dumps({
                    "type": "user_typing",
                    "user_id": user_id,
                    "username": username,
                })
                if target_id:
                    # DM context — send only to conversation partner
                    await manager.send_to(target_id, payload_typing)
                else:
                    # Legacy global context fallback
                    await manager.broadcast(json.dumps({
                        "type": "user_typing",
                        "user_id": user_id,
                        "username": username,
                        "room": msg.get("room", "global"),
                    }), exclude_id=user_id)

            elif event_type == "stop_typing":
                target_id = msg.get("target_user_id")
                payload_stop = json.dumps({
                    "type": "user_stop_typing",
                    "user_id": user_id,
                    "username": username,
                })
                if target_id:
                    await manager.send_to(target_id, payload_stop)
                else:
                    await manager.broadcast(payload_stop, exclude_id=user_id)

            # ═══════════════════════════════════════════
            #  HANDLE: read_receipt — persisted to DB
            # ═══════════════════════════════════════════
            elif event_type == "read_receipt":
                target_id = msg.get("target_user_id")
                message_ids = msg.get("message_ids", [])
                if target_id:
                    # Persist read status
                    try:
                        db = get_db()
                        if message_ids:
                            for mid in message_ids:
                                db.execute("UPDATE direct_messages SET status = 'read', read = 1 WHERE id = ? AND target_user_id = ?", (mid, user_id))
                        else:
                            db.execute("UPDATE direct_messages SET status = 'read', read = 1 WHERE sender_id = ? AND target_user_id = ? AND status != 'read'", (target_id, user_id))
                        db.commit()
                        db.close()
                    except Exception as e:
                        logger.warning(f"Read receipt DB error: {e}")
                    # Notify sender
                    await manager.send_to(target_id, json.dumps({
                        "type": "messages_read",
                        "reader_id": user_id,
                        "reader_username": username,
                        "message_ids": message_ids,
                    }))

            # ═══════════════════════════════════════════
            #  HANDLE: study_mode — AI Study Tutor (Groq enhanced)
            # ═══════════════════════════════════════════
            elif event_type == "study_query":
                query = msg.get("query", "")
                # Try Groq LLM first, fallback to local
                groq_result = await groq_ai.study_tutor(query) if groq_ai.enabled else None
                if groq_result:
                    await websocket.send_text(json.dumps({"type": "study_response", **groq_result}))
                else:
                    result = ai_engine.handle_study_query(query)
                    await websocket.send_text(json.dumps({"type": "study_response", **result}))

            # ═══════════════════════════════════════════
            #  HANDLE: summarize — AI Chat Summarizer (Groq enhanced)
            # ═══════════════════════════════════════════
            elif event_type == "summarize":
                room = msg.get("room", "global")
                limit = msg.get("limit", 50)
                try:
                    db = get_db()
                    messages_raw = db.execute(
                        """SELECT id, sender_id, sender_username, content, protocol, created_at
                           FROM messages WHERE room = ? ORDER BY created_at DESC LIMIT ?""",
                        (room, limit)
                    ).fetchall()
                    db.close()
                    msg_list = [dict(m) for m in reversed(messages_raw)]
                    # Try Groq LLM summary
                    groq_summary = await groq_ai.summarize_chat(msg_list) if groq_ai.enabled else None
                    if groq_summary:
                        summary = ai_engine.summarize_messages(msg_list)
                        summary["summary"] = groq_summary
                        summary["powered_by"] = "Groq"
                    else:
                        summary = ai_engine.summarize_messages(msg_list)
                    await websocket.send_text(json.dumps({"type": "summary_response", **summary}))
                except Exception as e:
                    logger.error(f"Summarize error: {e}")

            # ═══════════════════════════════════════════
            #  HANDLE: private_message — DM (only sender + target see it)
            # ═══════════════════════════════════════════
            elif event_type == "private_message":
                target_id   = msg.get("target_user_id")
                content     = msg.get("content", "")
                image_url   = msg.get("image_url")
                content_type = msg.get("content_type", "text")
                voice_url   = msg.get("voice_url")
                voice_dur   = msg.get("voice_duration", 0)
                file_url    = msg.get("file_url")
                file_name   = msg.get("file_name")
                file_size   = msg.get("file_size", 0)
                reply_to    = msg.get("reply_to")

                has_content = content or image_url or voice_url or file_url
                if target_id and has_content:
                    dm_id = 0
                    db = None
                    try:
                        db = get_db()
                        cursor = db.execute(
                            """INSERT INTO direct_messages
                               (sender_id, sender_username, target_user_id,
                                content, image_url, content_type,
                                voice_url, voice_duration,
                                file_url, file_name, file_size,
                                reply_to, status)
                               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sent')
                               RETURNING id""",
                            (
                                user_id, username, target_id,
                                content, image_url, content_type,
                                voice_url, voice_dur,
                                file_url, file_name, file_size,
                                json.dumps(reply_to) if reply_to else None,
                            )
                        )
                        dm_id = cursor.fetchone()[0]
                        db.commit()
                    except Exception as e:
                        logger.error(f"DM save error: {e}")
                        dm_id = int(time.time() * 1000) % 1000000
                    finally:
                        if db:
                            try: db.close()
                            except: pass

                    dm_data = {
                        "type": "private_message",
                        "id": dm_id,
                        "sender_id": user_id,
                        "sender_username": username,
                        "target_user_id": target_id,
                        "content": content,
                        "image_url": image_url,
                        "content_type": content_type,
                        "voice_url": voice_url,
                        "voice_duration": voice_dur,
                        "file_url": file_url,
                        "file_name": file_name,
                        "file_size": file_size,
                        "reply_to": reply_to,
                        "status": "sent",
                        # Always send ISO-8601 with Z suffix so browsers parse as UTC
                        "created_at": datetime.utcnow().isoformat() + "Z",
                    }
                    # Deliver to target — promote to 'delivered' if online
                    sent_ok = await manager.send_to(target_id, json.dumps(dm_data))
                    if sent_ok:
                        dm_data["status"] = "delivered"
                        try:
                            db2 = get_db()
                            db2.execute(
                                "UPDATE direct_messages SET status='delivered', delivered=1 WHERE id=?",
                                (dm_id,)
                            )
                            db2.commit(); db2.close()
                        except: pass
                    await websocket.send_text(json.dumps({**dm_data, "type": "dm_sent"}))
                    logger.info(f"💌 DM [{content_type}]: {username} → user#{target_id} [status={dm_data['status']}]")

            # ═══════════════════════════════════════════
            #  HANDLE: get_dm_history
            # ═══════════════════════════════════════════
            elif event_type == "get_dm_history":
                target_id = msg.get("target_user_id")
                before_id = msg.get("before_id")  # cursor for infinite scroll
                limit = min(msg.get("limit", 50), 100)
                if target_id:
                    db = None
                    try:
                        db = get_db()
                        if before_id:
                            dms = db.execute(
                                """SELECT * FROM direct_messages
                                   WHERE ((sender_id = ? AND target_user_id = ?)
                                      OR (sender_id = ? AND target_user_id = ?))
                                      AND id < ?
                                   ORDER BY id DESC LIMIT ?""",
                                (user_id, target_id, target_id, user_id, before_id, limit)
                            ).fetchall()
                        else:
                            dms = db.execute(
                                """SELECT * FROM direct_messages
                                   WHERE (sender_id = ? AND target_user_id = ?)
                                      OR (sender_id = ? AND target_user_id = ?)
                                   ORDER BY id DESC LIMIT ?""",
                                (user_id, target_id, target_id, user_id, limit)
                            ).fetchall()
                        result = [dict(d) for d in reversed(dms)]
                        has_more = len(dms) == limit
                        await websocket.send_text(json.dumps({
                            "type": "dm_history",
                            "target_user_id": target_id,
                            "messages": result,
                            "has_more": has_more,
                        }))
                        # Auto-mark received DMs as read
                        db.execute(
                            """UPDATE direct_messages SET status = 'read', read = 1
                               WHERE sender_id = ? AND target_user_id = ? AND status != 'read'""",
                            (target_id, user_id)
                        )
                        db.commit()
                    except Exception as e:
                        logger.error(f"DM history error: {e}")
                    finally:
                        if db:
                            try: db.close()
                            except: pass

            # ═══════════════════════════════════════════
            #  HANDLE: dm_delete — Soft-delete own message
            # ═══════════════════════════════════════════
            elif event_type == "dm_delete":
                msg_id = msg.get("message_id")
                target_id = msg.get("target_user_id")
                if msg_id and target_id:
                    db = None
                    try:
                        db = get_db()
                        row = db.execute(
                            "SELECT sender_id FROM direct_messages WHERE id = ?", (msg_id,)
                        ).fetchone()
                        if row and int(row["sender_id"]) == int(db_user_id):
                            db.execute(
                                "UPDATE direct_messages SET deleted = 1, content = '' WHERE id = ?",
                                (msg_id,)
                            )
                            db.commit()
                            notify = json.dumps({"type": "dm_deleted", "message_id": msg_id, "target_user_id": target_id})
                            await websocket.send_text(notify)
                            await manager.send_to(target_id, notify)
                            logger.info(f"🗑️ DM #{msg_id} deleted by {username}")
                    except Exception as e:
                        logger.error(f"DM delete error: {e}")
                    finally:
                        if db:
                            try: db.close()
                            except: pass

            # ═══════════════════════════════════════════
            #  HANDLE: dm_react — Emoji reaction toggle
            # ═══════════════════════════════════════════
            elif event_type == "dm_react":
                msg_id = msg.get("message_id")
                emoji = msg.get("emoji", "")
                target_id = msg.get("target_user_id")
                if msg_id and emoji and target_id:
                    db = None
                    try:
                        db = get_db()
                        row = db.execute(
                            "SELECT reactions, sender_id, target_user_id FROM direct_messages WHERE id = ? AND deleted = 0",
                            (msg_id,)
                        ).fetchone()
                        if row:
                            reactions = json.loads(row["reactions"] or "{}")
                            if emoji not in reactions:
                                reactions[emoji] = []
                            uid = str(db_user_id)
                            if uid in reactions[emoji]:
                                reactions[emoji].remove(uid)
                                if not reactions[emoji]:
                                    del reactions[emoji]
                            else:
                                reactions[emoji].append(uid)
                            db.execute(
                                "UPDATE direct_messages SET reactions = ? WHERE id = ?",
                                (json.dumps(reactions), msg_id)
                            )
                            db.commit()
                            notify = json.dumps({
                                "type": "dm_reaction",
                                "message_id": msg_id,
                                "reactions": reactions,
                                "by_user_id": db_user_id,
                            })
                            await websocket.send_text(notify)
                            await manager.send_to(target_id, notify)
                    except Exception as e:
                        logger.error(f"DM react error: {e}")
                    finally:
                        if db:
                            try: db.close()
                            except: pass

            # ═══════════════════════════════════════════
            #  HANDLE: Call Signaling (Voice/Video)
            # ═══════════════════════════════════════════
            elif event_type in ["call_offer", "call_answer", "call_reject", "call_busy", "call_end", "call_ice", "group_call_offer"]:
                target_id = msg.get("target_user_id")
                if target_id:
                    # NOTE: Use 'sig_payload' to avoid overwriting the JWT 'payload' decoded above
                    sig_payload = dict(msg)
                    sig_payload.pop("target_user_id", None)
                    sig_payload["from_user_id"] = user_id
                    sig_payload["from_username"] = username

                    if event_type in ("call_offer", "group_call_offer"):
                        sig_payload["type"] = "incoming_call"
                        if "call_type" not in sig_payload:
                            sig_payload["call_type"] = "voice"
                        logger.info(f"📞 {sig_payload['call_type'].upper()} call: {username} → user#{target_id}")
                    elif event_type == "call_answer":
                        sig_payload["type"] = "call_accepted"
                        logger.info(f"📞 Call accepted by {username}")
                    elif event_type == "call_reject":
                        sig_payload["type"] = "call_rejected"
                        logger.info(f"📞 Call rejected by {username}")
                    elif event_type == "call_busy":
                        sig_payload["type"] = "call_busy"
                    elif event_type == "call_end":
                        sig_payload["type"] = "call_ended"
                        logger.info(f"📞 Call ended by {username}")
                    elif event_type == "call_ice":
                        sig_payload["type"] = "call_ice"

                    await manager.send_to(target_id, json.dumps(sig_payload))

            # ═══════════════════════════════════════════
            #  HANDLE: WebRTC Signaling (P2P Data)
            # ═══════════════════════════════════════════
            elif event_type == "webrtc_offer":
                target_id = msg.get("target_user_id")
                if target_id:
                    await manager.send_to(target_id, json.dumps({
                        "type": "webrtc_offer",
                        "offer": msg.get("offer"),
                        "from_user_id": user_id,
                        "from_username": username,
                    }))
                    logger.info(f"📞 WebRTC offer: {username} → user#{target_id}")

            elif event_type == "webrtc_answer":
                target_id = msg.get("target_user_id")
                if target_id:
                    await manager.send_to(target_id, json.dumps({
                        "type": "webrtc_answer",
                        "answer": msg.get("answer"),
                        "from_user_id": user_id,
                        "from_username": username,
                    }))

            elif event_type == "webrtc_ice":
                target_id = msg.get("target_user_id")
                if target_id:
                    await manager.send_to(target_id, json.dumps({
                        "type": "webrtc_ice",
                        "candidate": msg.get("candidate"),
                        "from_user_id": user_id,
                        "from_username": username,
                    }))

            elif event_type == "webrtc_disconnect":
                target_id = msg.get("target_user_id")
                if target_id:
                    await manager.send_to(target_id, json.dumps({
                        "type": "webrtc_disconnect",
                        "from_user_id": user_id,
                        "from_username": username,
                    }))

            # ═══════════════════════════════════════════
            #  HANDLE: ai_chat — Groq LLM Chat
            # ═══════════════════════════════════════════
            elif event_type == "ai_chat":
                content = msg.get("content", "")
                history = msg.get("history", [])
                if groq_ai.enabled:
                    reply = await groq_ai.ai_chat(content, history)
                    await websocket.send_text(json.dumps({
                        "type": "ai_chat_response",
                        "content": reply or "Sorry, I couldn't process that.",
                        "powered_by": "Groq" if reply else "fallback",
                    }))
                else:
                    await websocket.send_text(json.dumps({
                        "type": "ai_chat_response",
                        "content": "🔑 Groq AI not configured. Set GROQ_API_KEY environment variable.",
                        "powered_by": "none",
                    }))

            # ═══════════════════════════════════════════
            #  HANDLE: translate — Groq Translation
            # ═══════════════════════════════════════════
            elif event_type == "translate":
                text = msg.get("text", "")
                target_lang = msg.get("language", "English")
                if groq_ai.enabled:
                    translated = await groq_ai.translate_message(text, target_lang)
                    await websocket.send_text(json.dumps({
                        "type": "translate_response",
                        "original": text,
                        "translated": translated or text,
                        "language": target_lang,
                    }))

            # ═══════════════════════════════════════════
            #  HANDLE: get_network_stats
            # ═══════════════════════════════════════════
            elif event_type == "get_network_stats":
                stats = manager.get_network_stats()
                await websocket.send_text(json.dumps({
                    "type": "network_stats",
                    **stats,
                    "ai_stats": ai_engine.get_stats(),
                    "groq_stats": groq_ai.get_stats(),
                }))

            # ═══════════════════════════════════════════
            #  HANDLE: get_smart_replies (Groq enhanced)
            # ═══════════════════════════════════════════
            elif event_type == "get_smart_replies":
                content = msg.get("content", "")
                if groq_ai.enabled:
                    replies = await groq_ai.smart_reply(content, username)
                    if not replies:
                        replies = ai_engine.smart_reply.generate(content)
                else:
                    replies = ai_engine.smart_reply.generate(content)
                await websocket.send_text(json.dumps({
                    "type": "smart_replies",
                    "replies": replies,
                }))

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"[WS] Error for {username}: {e}")
    finally:
        await manager.disconnect(user_id)
        try:
            db = get_db()
            db.execute("UPDATE users SET is_online = 0, last_seen = CURRENT_TIMESTAMP WHERE id = ?", (user_id,))
            db.commit()
            db.close()
        except Exception:
            pass
        logger.info(f"[WS] 👋 {username} disconnected")


# ═════════════════════════════════════════════════════════
#  RUN SERVER — Starts TCP + UDP Servers + FastAPI
# ═════════════════════════════════════════════════════════

def start_tcp_server():
    """Start the TCP socket server in a background thread."""
    import sys
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), ".."))

    try:
        from networking.tcp.tcp_server import TCPServer
        server = TCPServer(host="127.0.0.1", port=9000)
        logger.info("🟢 TCP Server starting on port 9000...")
        server.start()
    except Exception as e:
        logger.error(f"TCP Server failed: {e}")
        # Fallback: start the simple TCP server from /server/
        try:
            from server.tcp_server import start_tcp_server as start_simple_tcp
            start_simple_tcp()
        except Exception as e2:
            logger.error(f"Fallback TCP also failed: {e2}")


def start_udp_server():
    """Start the UDP socket server in a background thread."""
    import sys
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), ".."))

    try:
        from networking.udp.udp_server import UDPServer
        server = UDPServer(host="127.0.0.1", port=9001)
        logger.info("🟣 UDP Server starting on port 9001...")
        server.start()
    except Exception as e:
        logger.error(f"UDP Server failed: {e}")
        try:
            from server.udp_server import start_udp_server as start_simple_udp
            start_simple_udp()
        except Exception as e2:
            logger.error(f"Fallback UDP also failed: {e2}")


if __name__ == "__main__":
    import uvicorn
    import sys

    # Add project root to path
    project_root = os.path.dirname(os.path.dirname(__file__))
    sys.path.insert(0, project_root)

    # Start TCP server in background thread
    tcp_thread = threading.Thread(target=start_tcp_server, daemon=True, name="TCP-Server")
    tcp_thread.start()

    # Start UDP server in background thread
    udp_thread = threading.Thread(target=start_udp_server, daemon=True, name="UDP-Server")
    udp_thread.start()

    # Give servers time to start
    import time as _time
    _time.sleep(0.5)

    logger.info("═" * 55)
    logger.info("  🚀 Starting FastAPI with uvicorn...")
    logger.info("  TCP → :9000 | UDP → :9001 | API → :8000")
    logger.info("  🧠 AI Engine: Smart Replies + Toxicity + Study Mode")
    logger.info("  🌐 Protocol Router: Auto TCP/UDP/Hybrid/WebRTC")
    logger.info("  📞 WebRTC: P2P Signaling Active")
    logger.info("═" * 55)

    # Start FastAPI
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False, log_level="info")

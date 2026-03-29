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

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (needed for phone access via hotspot IP)
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
    init_db()
    # Create DMs table if not exists
    try:
        db = get_db()
        db.execute("""CREATE TABLE IF NOT EXISTS direct_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_id INTEGER NOT NULL,
            sender_username TEXT NOT NULL,
            target_user_id INTEGER NOT NULL,
            content TEXT,
            image_url TEXT,
            protocol TEXT DEFAULT 'TCP',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""")
        db.commit()
        db.close()
    except Exception as e:
        logger.warning(f"DM table creation: {e}")
    logger.info("═" * 55)
    logger.info("  ⚡ SmartChat X Backend v4.0 — ONLINE")
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
    db = get_db()
    user = db.execute("SELECT id, username, avatar, last_seen FROM users WHERE id = ?",
                      (payload["user_id"],)).fetchone()
    db.close()
    if not user:
        raise HTTPException(404, "User not found")
    return dict(user)


# ═════════════════════════════════════════════════════════
#  USERS ROUTES
# ═════════════════════════════════════════════════════════

@app.get("/api/users")
async def get_users():
    db = get_db()
    users = db.execute(
        "SELECT id, username, avatar, is_online, last_seen FROM users ORDER BY is_online DESC, username"
    ).fetchall()
    db.close()
    return [dict(u) for u in users]


@app.get("/api/users/online")
async def get_online_users():
    return manager.get_online_list()


# ═════════════════════════════════════════════════════════
#  MESSAGES ROUTES
# ═════════════════════════════════════════════════════════

@app.get("/api/messages")
async def get_messages(room: str = "global", limit: int = 100):
    db = get_db()
    messages = db.execute(
        """SELECT id, sender_id, sender_username, content, image_url,
                  protocol, delivered, read, dropped, room, created_at
           FROM messages WHERE room = ?
           ORDER BY created_at DESC LIMIT ?""",
        (room, limit)
    ).fetchall()
    db.close()
    return [dict(m) for m in reversed(messages)]


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
async def health():
    return {
        "status": "healthy",
        "service": "SmartChat X Backend v3.0",
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

    # ── Mark online in DB ────────────────────────────
    try:
        db = get_db()
        db.execute("UPDATE users SET is_online = 1, last_seen = CURRENT_TIMESTAMP WHERE id = ?", (user_id,))
        db.commit()
    except Exception as e:
        logger.warning(f"[WS] DB mark-online failed: {e}")
    finally:
        try:
            db.close()
        except Exception:
            pass

    # ── Connect WebSocket ────────────────────────────
    await manager.connect(user_id, username, websocket)
    logger.info(f"[WS] ⚡ {username} connected (ID: {user_id})")

    try:
        while True:
            data = await websocket.receive_text()
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

                # ── AI: Toxicity Detection ─────────────
                toxicity_result = None
                if content:
                    toxicity_result = ai_engine.toxicity_detector.analyze(content)
                    if toxicity_result["toxic"]:
                        logger.warning(f"⚠️ Toxic message from {username}: score={toxicity_result['score']}")
                        # Send warning to sender
                        await websocket.send_text(json.dumps({
                            "type": "toxicity_warning",
                            "score": toxicity_result["score"],
                            "severity": toxicity_result["severity"],
                            "flags": toxicity_result["flags"],
                            "message": "⚠️ Your message may contain harmful content.",
                        }))

                # ── AI: Smart Reply Suggestions ────────
                smart_replies = []
                if content:
                    smart_replies = ai_engine.smart_reply.generate(content)

                # Step 1: Save to SQLite
                msg_id = 0
                try:
                    db = get_db()
                    cursor = db.execute(
                        """INSERT INTO messages (sender_id, sender_username, content,
                           image_url, protocol, room)
                           VALUES (?, ?, ?, ?, ?, ?) RETURNING id""",
                        (user_id, username, content, image_url, protocol, room)
                    )
                    msg_id = cursor.fetchone()[0]
                    db.commit()
                except Exception as e:
                    logger.error(f"[WS] DB insert failed: {e}")
                    msg_id = int(time.time() * 1000) % 1000000
                finally:
                    try:
                        db.close()
                    except Exception:
                        pass

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
                # Include reply_to data if replying
                if msg.get("reply_to"):
                    message_data["reply_to"] = msg["reply_to"]

                # Step 2: Send confirmation + AI data to sender
                await websocket.send_text(json.dumps({
                    **message_data,
                    "type": "message_sent",
                    "smart_replies": smart_replies,
                    "toxicity": toxicity_result,
                    "auto_protocol": protocol if msg.get("protocol") == "AUTO" else None,
                }))

                # Step 3: Route through TCP/UDP network layer
                try:
                    await manager.simulate_send(message_data, user_id)
                except Exception as e:
                    logger.error(f"[WS] Network bridge error: {e}")

                logger.info(f"📨 [{protocol}] {username}: "
                            f"{content[:50]}{'...' if len(content)>50 else ''}")

            # ═══════════════════════════════════════════
            #  HANDLE: typing — Via UDP (fast, fire-and-forget)
            # ═══════════════════════════════════════════
            elif event_type == "typing":
                await manager.broadcast(json.dumps({
                    "type": "user_typing",
                    "user_id": user_id,
                    "username": username,
                    "room": msg.get("room", "global"),
                }), exclude_id=user_id)

            elif event_type == "stop_typing":
                await manager.broadcast(json.dumps({
                    "type": "user_stop_typing",
                    "user_id": user_id,
                    "username": username,
                }), exclude_id=user_id)

            # ═══════════════════════════════════════════
            #  HANDLE: read_receipt
            # ═══════════════════════════════════════════
            elif event_type == "read_receipt":
                target_id = msg.get("target_user_id")
                if target_id:
                    await manager.send_to(target_id, json.dumps({
                        "type": "messages_read",
                        "reader_id": user_id,
                        "reader_username": username,
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
                target_id = msg.get("target_user_id")
                content = msg.get("content", "")
                image_url = msg.get("image_url")
                if target_id and (content or image_url):
                    # Save DM to database
                    dm_id = 0
                    try:
                        db = get_db()
                        cursor = db.execute(
                            """INSERT INTO direct_messages (sender_id, sender_username, target_user_id, content, image_url)
                               VALUES (?, ?, ?, ?, ?) RETURNING id""",
                            (user_id, username, target_id, content, image_url)
                        )
                        dm_id = cursor.fetchone()[0]
                        db.commit()
                        db.close()
                    except Exception as e:
                        logger.error(f"DM save error: {e}")
                        dm_id = int(time.time() * 1000) % 1000000

                    dm_data = {
                        "type": "private_message",
                        "id": dm_id,
                        "sender_id": user_id,
                        "sender_username": username,
                        "target_user_id": target_id,
                        "content": content,
                        "image_url": image_url,
                        "created_at": datetime.utcnow().isoformat(),
                    }
                    # Send to target user only
                    await manager.send_to(target_id, json.dumps(dm_data))
                    # Send confirmation to sender
                    await websocket.send_text(json.dumps({**dm_data, "type": "dm_sent"}))
                    logger.info(f"💌 DM: {username} → user#{target_id}")

            # ═══════════════════════════════════════════
            #  HANDLE: get_dm_history
            # ═══════════════════════════════════════════
            elif event_type == "get_dm_history":
                target_id = msg.get("target_user_id")
                if target_id:
                    try:
                        db = get_db()
                        dms = db.execute(
                            """SELECT * FROM direct_messages
                               WHERE (sender_id = ? AND target_user_id = ?)
                                  OR (sender_id = ? AND target_user_id = ?)
                               ORDER BY created_at ASC LIMIT 100""",
                            (user_id, target_id, target_id, user_id)
                        ).fetchall()
                        db.close()
                        await websocket.send_text(json.dumps({
                            "type": "dm_history",
                            "target_user_id": target_id,
                            "messages": [dict(d) for d in dms],
                        }))
                    except Exception as e:
                        logger.error(f"DM history error: {e}")

            # ═══════════════════════════════════════════
            #  HANDLE: Call Signaling (Voice/Video)
            # ═══════════════════════════════════════════
            elif event_type == "call_offer":
                target_id = msg.get("target_user_id")
                call_type = msg.get("call_type", "voice")  # voice or video
                if target_id:
                    await manager.send_to(target_id, json.dumps({
                        "type": "incoming_call",
                        "from_user_id": user_id,
                        "from_username": username,
                        "call_type": call_type,
                        "offer": msg.get("offer"),
                    }))
                    logger.info(f"📞 {call_type.upper()} call: {username} → user#{target_id}")

            elif event_type == "call_answer":
                target_id = msg.get("target_user_id")
                if target_id:
                    await manager.send_to(target_id, json.dumps({
                        "type": "call_accepted",
                        "from_user_id": user_id,
                        "from_username": username,
                        "answer": msg.get("answer"),
                    }))

            elif event_type == "call_reject":
                target_id = msg.get("target_user_id")
                if target_id:
                    await manager.send_to(target_id, json.dumps({
                        "type": "call_rejected",
                        "from_user_id": user_id,
                        "from_username": username,
                    }))
                    logger.info(f"📞 Call rejected by {username}")

            elif event_type == "call_end":
                target_id = msg.get("target_user_id")
                if target_id:
                    await manager.send_to(target_id, json.dumps({
                        "type": "call_ended",
                        "from_user_id": user_id,
                        "from_username": username,
                    }))
                    logger.info(f"📞 Call ended by {username}")

            elif event_type == "call_ice":
                target_id = msg.get("target_user_id")
                if target_id:
                    await manager.send_to(target_id, json.dumps({
                        "type": "call_ice",
                        "candidate": msg.get("candidate"),
                        "from_user_id": user_id,
                    }))

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

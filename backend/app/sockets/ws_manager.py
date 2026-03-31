"""
═══════════════════════════════════════════════════════════
  ws_manager.py — WebSocket Connection Manager
  Manages connections, broadcasts, and TCP/UDP delivery
═══════════════════════════════════════════════════════════

Integration flow:
  User sends message → WebSocket → ws_manager → NetworkBridge
  → TCP/UDP server → ACK/Drop → ws_manager → WebSocket → User
"""
from typing import Dict, List, Optional, Any, Set
import json
import random
import asyncio
import time
import logging

try:
    from fastapi import WebSocket
except ImportError:
    WebSocket = object  # type: ignore

from app.sockets.network_bridge import network_bridge

logger = logging.getLogger("SmartChatX.WSManager")


class ConnectionManager:
    """Manages all active WebSocket connections with TCP/UDP integration."""

    def __init__(self) -> None:
        self.active: Dict[int, Any] = {}              # user_id -> websocket
        self.usernames: Dict[int, str] = {}            # user_id -> username
        self.typing_users: Dict[str, Set[str]] = {}    # room -> set of usernames
        self.message_status: Dict[int, Dict[str, Any]] = {}  # msg_id -> delivery status
        self._connect_times: Dict[int, float] = {}     # user_id -> connect timestamp

    async def connect(self, user_id: int, username: str, websocket: Any) -> None:
        """Accept a WebSocket connection and notify all users."""
        await websocket.accept()
        self.active[user_id] = websocket
        self.usernames[user_id] = username
        self._connect_times[user_id] = time.time()

        logger.info(f"✅ {username} (ID:{user_id}) connected | "
                     f"Online: {len(self.active)}")

        await self.broadcast(json.dumps({
            "type": "user_online",
            "user_id": user_id,
            "username": username,
            "online_users": self.get_online_list(),
            "timestamp": time.time(),
        }))

    async def disconnect(self, user_id: int) -> None:
        """Remove a WebSocket connection and notify all users."""
        username = self.usernames.pop(user_id, "Unknown")
        self.active.pop(user_id, None)
        self._connect_times.pop(user_id, None)

        logger.info(f"👋 {username} (ID:{user_id}) disconnected | "
                     f"Online: {len(self.active)}")

        await self.broadcast(json.dumps({
            "type": "user_offline",
            "user_id": user_id,
            "username": username,
            "online_users": self.get_online_list(),
            "timestamp": time.time(),
        }))

    async def broadcast(self, message: str, exclude_id: Optional[int] = None) -> None:
        """Send a message to all connected clients except the excluded one."""
        disconnected: List[int] = []
        # Iterate over a snapshot to avoid "dictionary changed size" errors
        snapshot = list(self.active.items())
        for uid, ws in snapshot:
            if uid != exclude_id:
                try:
                    await ws.send_text(message)
                except Exception:
                    disconnected.append(uid)

        for uid in disconnected:
            self.active.pop(uid, None)
            self.usernames.pop(uid, None)

    async def send_to(self, user_id: int, message: str) -> bool:
        """Send a message to a specific user. Returns True if delivered."""
        ws = self.active.get(user_id)
        if ws:
            try:
                await ws.send_text(message)
                return True
            except Exception:
                return False
        return False

    async def simulate_send(self, message_data: Dict[str, Any], sender_id: int) -> None:
        """
        ═══════════════════════════════════════════════
        CORE INTEGRATION: Route message through TCP/UDP
        ═══════════════════════════════════════════════

        1. Routes the message through the NetworkBridge
        2. NetworkBridge sends to real TCP or UDP socket server
        3. Packets are fragmented, checksummed, sent via socket
        4. ACK handling (TCP) or loss simulation (UDP)
        5. Results broadcast to all clients via WebSocket
        """
        protocol = message_data.get("protocol", "TCP")
        msg_id = message_data.get("id")

        # ── Step 1: Route through Network Bridge ──────────
        try:
            network_result = await network_bridge.route_message(message_data)
        except Exception as e:
            logger.error(f"Network bridge error: {e}")
            network_result = {
                "delivered": True,
                "protocol": protocol,
                "message_id": msg_id,
                "fragments_sent": 1,
                "delivery_time_ms": 0,
                "reliability": "fallback",
                "error": str(e),
            }

        # ── Step 2: Store delivery status ─────────────────
        if msg_id is not None:
            self.message_status[int(msg_id)] = {
                "delivered": network_result["delivered"],
                "protocol": protocol,
                "network_result": network_result,
                "timestamp": time.time(),
            }

        # ── Step 3: Send network processing details to sender ──
        sender_ws = self.active.get(sender_id)
        if sender_ws:
            try:
                await sender_ws.send_text(json.dumps({
                    "type": "network_processed",
                    "message_id": msg_id,
                    "protocol": protocol,
                    "network_result": {
                        "delivered": network_result["delivered"],
                        "fragments_sent": network_result.get("fragments_sent", 1),
                        "delivery_time_ms": network_result.get("delivery_time_ms", 0),
                        "reliability": network_result.get("reliability", "unknown"),
                        "packet_info": network_result.get("packet_info", []),
                    },
                }))
            except Exception:
                pass

        # ── Step 4: Deliver to all recipients ──────────────
        if protocol == "UDP":
            await self._deliver_udp(message_data, sender_id, network_result)
        else:
            await self._deliver_tcp(message_data, sender_id, network_result)

    async def _deliver_tcp(self, message_data: Dict[str, Any], sender_id: int,
                           network_result: Dict[str, Any]) -> None:
        """
        TCP delivery: guaranteed, ordered, with ACK.
        Each recipient gets the message + sender gets ACK.
        """
        msg_id = message_data.get("id")
        payload = json.dumps({**message_data, "type": "new_message"})

        # Snapshot to avoid dict mutation during iteration
        snapshot = list(self.active.items())
        for uid, ws in snapshot:
            if uid == sender_id:
                continue
            try:
                await ws.send_text(payload)

                sender_ws = self.active.get(sender_id)
                if sender_ws:
                    await sender_ws.send_text(json.dumps({
                        "type": "message_delivered",
                        "message_id": msg_id,
                        "target_user": self.usernames.get(uid, "Unknown"),
                        "protocol": "TCP",
                        "ack": True,
                        "ack_time_ms": network_result.get("delivery_time_ms", 0),
                        "fragments_acked": network_result.get("fragments_sent", 1),
                    }))

                logger.info(f"📨 TCP delivered msg#{msg_id} → "
                            f"{self.usernames.get(uid, '?')}")

            except Exception as e:
                logger.warning(f"TCP delivery failed to user {uid}: {e}")

    async def _deliver_udp(self, message_data: Dict[str, Any], sender_id: int,
                           network_result: Dict[str, Any]) -> None:
        """
        UDP delivery: best-effort with realistic packet loss.
        Some recipients may not receive the message.
        """
        msg_id = message_data.get("id")
        payload = json.dumps({**message_data, "type": "new_message"})

        overall_dropped = not network_result.get("delivered", True)

        # Snapshot to avoid dict mutation during iteration
        snapshot = list(self.active.items())
        for uid, ws in snapshot:
            if uid == sender_id:
                continue

            drop_this = random.random() < 0.02  # 2% per-recipient loss (was 10%)

            if drop_this or overall_dropped:
                try:
                    sender_ws = self.active.get(sender_id)
                    if sender_ws:
                        await sender_ws.send_text(json.dumps({
                            "type": "message_dropped",
                            "message_id": msg_id,
                            "target_user": self.usernames.get(uid, "Unknown"),
                            "protocol": "UDP",
                            "reason": "packet_lost_in_transit",
                            "dropped_fragments": network_result.get("dropped_fragment_ids", []),
                        }))

                    logger.info(f"📡 UDP DROPPED msg#{msg_id} → "
                                f"{self.usernames.get(uid, '?')}")
                except Exception:
                    pass
                continue

            jitter = random.uniform(0, 0.03)  # 0-30ms jitter (was 0-150ms)
            await asyncio.sleep(jitter)

            try:
                await ws.send_text(payload)

                sender_ws = self.active.get(sender_id)
                if sender_ws:
                    jitter_rounded = float(int(jitter * 10000)) / 10  # round to 1 decimal
                    await sender_ws.send_text(json.dumps({
                        "type": "message_delivered",
                        "message_id": msg_id,
                        "target_user": self.usernames.get(uid, "Unknown"),
                        "protocol": "UDP",
                        "ack": False,
                        "jitter_ms": jitter_rounded,
                    }))

                logger.info(f"📡 UDP delivered msg#{msg_id} → "
                            f"{self.usernames.get(uid, '?')}")

            except Exception as e:
                logger.warning(f"UDP delivery failed to user {uid}: {e}")

    def get_online_list(self) -> List[Dict[str, Any]]:
        """Get list of currently online users."""
        return [
            {
                "user_id": uid,
                "username": uname,
                "connected_since": self._connect_times.get(uid, 0),
            }
            for uid, uname in self.usernames.items()
        ]

    @property
    def online_count(self) -> int:
        return len(self.active)

    def get_network_stats(self) -> Dict[str, Any]:
        """Get combined network statistics."""
        return {
            "online_users": self.online_count,
            "total_messages_tracked": len(self.message_status),
            "bridge_stats": network_bridge.get_stats(),
        }


# ── Singleton ─────────────────────────────────────────────
manager = ConnectionManager()

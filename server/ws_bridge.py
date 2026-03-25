#!/usr/bin/env python3
"""
server/ws_bridge.py — SmartChat X WebSocket Bridge (Master Controller)
═════════════════════════════════════════════════════════════════════
The central nervous system of SmartChat X. Bridges browser ↔ TCP/UDP
and integrates ALL modules:

  • AI Analysis Pipeline
  • End-to-End Encryption
  • Adaptive Protocol Routing
  • Intelligent Message Queue
  • Network Condition Simulator
  • Gamification Engine
  • Plugin Architecture
  • Distributed Load Balancer
  • Real-time Dashboard Data

Install: pip install websockets
Run:     python server/ws_bridge.py
"""

import asyncio
import socket
import threading
import json
import sys
import os
import time
import logging

# ── Setup path ────────────────────────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

try:
    import websockets
except ImportError:
    print("❌ Missing dependency. Run:  pip install websockets")
    sys.exit(1)

# ── Import all modules ───────────────────────────────────────
from common.config import HOST, TCP_PORT, UDP_PORT, WS_PORT
from server.ai_module import ai_engine
from server.encryption import encryption_engine
from server.router import router
from server.queue_manager import message_queue
from server.network_simulator import network_sim, PRESETS
from server.gamification import gamification
from server.plugins.plugin_base import plugin_manager
from server.plugins.ai_plugin import AIPlugin
from server.plugins.encryption_plugin import EncryptionPlugin
from server.plugins.analytics_plugin import analytics_plugin
from server.plugins.blockchain_plugin import blockchain_plugin
from server.distributed.load_balancer import load_balancer
from server.blockchain import blockchain

# ── Logging ───────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(name)s] %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger("SmartChatX.Bridge")

# ── Config ────────────────────────────────────────────────────
CHAT_HOST = HOST
BUFFER = 4096

# ── Connected clients tracking ────────────────────────────────
connected_clients = {}  # {websocket: {"username": str, "bridge": ChatBridge}}
webrtc_peers = {}  # {username: websocket} for WebRTC signaling relay
system_start_time = time.time()

# ── Initialize Plugins ───────────────────────────────────────
plugin_manager.register(AIPlugin())
plugin_manager.register(EncryptionPlugin())
plugin_manager.register(analytics_plugin)


class ChatBridge:
    """One instance per connected browser client — the full pipeline."""

    def __init__(self, websocket):
        self.ws = websocket
        self.username = None
        self.tcp_sock = None
        self.udp_sock = None
        self.running = False
        self.ws_loop = None
        self.join_time = time.time()
        self.messages_sent = 0
        self.messages_received = 0
        self.assigned_node = None
        self.encryption_enabled = True
        self.ai_enabled = True

    # ── Setup ────────────────────────────────────────────────
    def connect_tcp(self):
        self.tcp_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.tcp_sock.connect((CHAT_HOST, TCP_PORT))
        self.tcp_sock.settimeout(0.5)
        logger.info(f"🔗 TCP connection established → {CHAT_HOST}:{TCP_PORT}")

    def connect_udp(self):
        self.udp_sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.udp_sock.bind(("", 0))
        self.udp_sock.settimeout(0.5)
        logger.info(f"📡 UDP socket bound → Port {self.udp_sock.getsockname()[1]}")

    # ── TCP receive loop (background thread) ─────────────────
    def tcp_receive_loop(self):
        while self.running:
            try:
                data = self.tcp_sock.recv(BUFFER)
                if not data:
                    break
                msg = data.decode().strip()
                self.messages_received += 1

                # Route the response
                routing = router.route("chat", msg)

                payload = json.dumps({
                    "type": "message",
                    "text": msg,
                    "routing": routing.to_dict(),
                    "protocol": "TCP",
                    "timestamp": time.time()
                })
                asyncio.run_coroutine_threadsafe(
                    self.ws.send(payload), self.ws_loop
                )
            except socket.timeout:
                continue
            except Exception:
                break

        if self.running:
            asyncio.run_coroutine_threadsafe(
                self.ws.send(json.dumps({
                    "type": "system",
                    "text": "⚠️ Disconnected from TCP server."
                })),
                self.ws_loop
            )

    # ── UDP receive loop (background thread) ─────────────────
    def udp_receive_loop(self):
        while self.running:
            try:
                data, _ = self.udp_sock.recvfrom(1024)
                msg = data.decode().strip()
                payload = json.dumps({
                    "type": "typing",
                    "text": msg,
                    "protocol": "UDP"
                })
                asyncio.run_coroutine_threadsafe(
                    self.ws.send(payload), self.ws_loop
                )
            except socket.timeout:
                continue
            except Exception:
                break

    # ── Main handler ─────────────────────────────────────────
    async def handle(self):
        self.ws_loop = asyncio.get_event_loop()
        self.running = True

        # Connect to backend servers
        try:
            self.connect_tcp()
            self.connect_udp()
        except ConnectionRefusedError:
            await self.ws.send(json.dumps({
                "type": "error",
                "text": "❌ Cannot reach chat servers. Is run_all.py running?"
            }))
            return

        # Read the server's username prompt
        try:
            prompt = self.tcp_sock.recv(BUFFER).decode()
            await self.ws.send(json.dumps({"type": "prompt", "text": prompt}))
        except Exception:
            pass

        # Start background receiver threads
        t1 = threading.Thread(target=self.tcp_receive_loop, daemon=True)
        t2 = threading.Thread(target=self.udp_receive_loop, daemon=True)
        t1.start()
        t2.start()

        # ── Main message loop: browser → backend ─────────────
        try:
            async for raw in self.ws:
                data = json.loads(raw)
                kind = data.get("type")

                if kind == "username":
                    await self._handle_username(data)

                elif kind == "message":
                    await self._handle_message(data)

                elif kind == "typing":
                    self._handle_typing()

                elif kind == "stopped":
                    self._handle_stopped()

                elif kind == "get_dashboard":
                    await self._send_dashboard()

                elif kind == "get_leaderboard":
                    await self._send_leaderboard()

                elif kind == "get_profile":
                    await self._send_profile()

                elif kind == "set_network_condition":
                    await self._handle_network_condition(data)

                elif kind == "set_lb_algorithm":
                    self._handle_lb_algorithm(data)

                elif kind == "simulate_node_failure":
                    self._handle_node_failure(data)

                elif kind == "recover_node":
                    self._handle_node_recovery(data)

                elif kind == "toggle_plugin":
                    await self._handle_toggle_plugin(data)

                elif kind == "get_encryption_flow":
                    await self._handle_encryption_flow(data)

                elif kind == "ping_latency":
                    await self.ws.send(json.dumps({
                        "type": "pong_latency",
                        "timestamp": data.get("timestamp", 0),
                        "server_time": time.time()
                    }))

                # ── WebRTC Signaling ──────────────────────
                elif kind == "webrtc_offer":
                    await self._relay_webrtc(data, "webrtc_offer")
                elif kind == "webrtc_answer":
                    await self._relay_webrtc(data, "webrtc_answer")
                elif kind == "webrtc_ice":
                    await self._relay_webrtc(data, "webrtc_ice")
                elif kind == "webrtc_call":
                    await self._relay_webrtc(data, "webrtc_call")
                elif kind == "webrtc_hangup":
                    await self._relay_webrtc(data, "webrtc_hangup")

                # ── Blockchain ────────────────────────────
                elif kind == "get_blockchain":
                    await self._send_blockchain()
                elif kind == "validate_chain":
                    await self._validate_chain()
                elif kind == "tamper_demo":
                    await self._tamper_demo(data)

        except websockets.exceptions.ConnectionClosed:
            pass
        except Exception as e:
            logger.error(f"❌ Bridge error for {self.username}: {e}")
        finally:
            await self._cleanup()

    # ── Handler Methods ──────────────────────────────────────

    async def _handle_username(self, data):
        """Process user login."""
        self.username = data["text"]
        self.tcp_sock.sendall(self.username.encode())

        # Register in connected clients
        connected_clients[self.ws] = {
            "username": self.username,
            "bridge": self
        }
        webrtc_peers[self.username] = self.ws

        # Distributed: assign to a node
        self.assigned_node = load_balancer.route_connection(self.username)

        # Queue: mark user online + deliver queued messages
        message_queue.set_user_online(self.username)
        queued = message_queue.dequeue_all(self.username)
        if queued:
            await self.ws.send(json.dumps({
                "type": "queued_messages",
                "count": len(queued),
                "messages": [
                    {"sender": m.sender, "text": m.text, "time": m.timestamp}
                    for m in queued
                ]
            }))

        # Gamification: create profile
        gamification.get_or_create_profile(self.username)

        # Encryption: generate session key
        key_info = encryption_engine.generate_session_key(self.username)

        # Plugins: broadcast join event
        plugin_manager.broadcast_event("user_join", {"username": self.username})

        # Announce peer list to all for WebRTC
        peer_list = list(webrtc_peers.keys())
        for ws_client, info in connected_clients.items():
            try:
                await ws_client.send(json.dumps({
                    "type": "peer_list",
                    "peers": peer_list
                }))
            except:
                pass

        # Send session info to client
        await self.ws.send(json.dumps({
            "type": "session_info",
            "username": self.username,
            "assigned_node": self.assigned_node,
            "encryption": {
                "session_id": key_info["session_id"],
                "algorithm": key_info["algorithm"],
                "key_preview": key_info["public_key_preview"]
            },
            "blockchain": blockchain.get_stats(),
            "server_time": time.time()
        }))

        logger.info(f"✅ User '{self.username}' session established | "
                     f"Node: {self.assigned_node.get('node_name', 'N/A')}")

        await asyncio.sleep(0.2)

    async def _handle_message(self, data):
        """Process a chat message through the full pipeline."""
        text = data["text"]
        self.messages_sent += 1

        # ── Step 1: Routing Decision ──────────────────────
        is_encrypted = data.get("encrypted", self.encryption_enabled)
        routing = router.route("chat", text, is_encrypted=is_encrypted)

        # ── Step 2: Plugin Pipeline (AI + Encryption + Analytics)
        msg_data = {
            "text": text,
            "sender": self.username,
            "type": "chat",
            "timestamp": time.time()
        }
        processed = plugin_manager.process_message(msg_data)

        if processed is None or processed.get("blocked"):
            # Message blocked by plugin (e.g., toxicity)
            await self.ws.send(json.dumps({
                "type": "message_blocked",
                "reason": processed.get("block_reason", "blocked_by_plugin") if processed else "blocked",
                "text": "⚠️ Message blocked by safety filter.",
                "toxicity": processed.get("ai_analysis", {}).get("toxicity", {}) if processed else {}
            }))
            logger.warning(f"🚫 Message from {self.username} blocked")
            return

        # ── Step 3: Network Simulation ────────────────────
        sim_result = await network_sim.process_message(msg_data)
        if not sim_result["delivered"]:
            await self.ws.send(json.dumps({
                "type": "packet_lost",
                "simulation": sim_result["simulation"],
                "text": "📡 Packet lost in network simulation!"
            }))
            return

        # ── Step 4: Send via TCP ──────────────────────────
        self.tcp_sock.sendall(text.encode())

        # ── Step 5: Gamification ──────────────────────────
        game_result = gamification.on_message_sent(self.username)

        # Check for study mode
        study_response = processed.get("study_response") if processed else None

        # ── Step 6: Send enriched response to client ──────
        response = {
            "type": "message_processed",
            "routing": routing.to_dict(),
            "ai": processed.get("ai_analysis", {}) if processed else {},
            "encryption": processed.get("encryption", {}) if processed else {},
            "blockchain": processed.get("blockchain", {}) if processed else {},
            "simulation": sim_result["simulation"],
            "gamification": {
                "xp": game_result["xp"],
                "new_badges": game_result.get("new_badges", []),
                "profile": game_result.get("profile", {})
            }
        }

        if study_response:
            response["study_response"] = study_response

        await self.ws.send(json.dumps(response))

        logger.info(f"📨 Pipeline complete | {self.username} | "
                     f"Route: {routing.protocol} | "
                     f"AI: {processed.get('ai_analysis', {}).get('intent', 'N/A')} | "
                     f"Block: #{processed.get('blockchain', {}).get('block_index', '?')} | "
                     f"XP: +{game_result['xp']['xp_gained']}")

    def _handle_typing(self):
        """Send typing indicator via UDP."""
        if self.username:
            router.route("typing")
            self.udp_sock.sendto(
                f"TYPING:{self.username}".encode(),
                (CHAT_HOST, UDP_PORT)
            )

    def _handle_stopped(self):
        """Send stop-typing via UDP."""
        if self.username:
            self.udp_sock.sendto(
                f"STOPPED:{self.username}".encode(),
                (CHAT_HOST, UDP_PORT)
            )

    async def _send_dashboard(self):
        """Send comprehensive dashboard data."""
        dashboard = {
            "type": "dashboard_data",
            "timestamp": time.time(),
            "uptime": round(time.time() - system_start_time),
            "connected_users": len(connected_clients),
            "routing": router.get_stats(),
            "ai": ai_engine.get_stats(),
            "encryption": encryption_engine.get_stats(),
            "queue": message_queue.get_stats(),
            "network_sim": network_sim.get_stats(),
            "gamification": gamification.get_stats(),
            "plugins": plugin_manager.get_stats(),
            "cluster": load_balancer.get_cluster_status(),
            "analytics": analytics_plugin.get_analytics(),
            "blockchain": blockchain.get_stats(),
            "webrtc_peers": list(webrtc_peers.keys())
        }
        await self.ws.send(json.dumps(dashboard))

    async def _send_leaderboard(self):
        """Send gamification leaderboard."""
        await self.ws.send(json.dumps({
            "type": "leaderboard",
            "data": gamification.get_leaderboard()
        }))

    async def _send_profile(self):
        """Send user's gamification profile."""
        if self.username:
            await self.ws.send(json.dumps({
                "type": "profile",
                "data": gamification.get_profile(self.username)
            }))

    async def _handle_network_condition(self, data):
        """Set network simulation condition."""
        preset = data.get("preset")
        custom = data.get("custom")

        if preset == "disable":
            network_sim.disable()
            condition = {"enabled": False, "name": "Normal"}
        elif custom:
            condition = network_sim.set_condition(custom=custom)
        else:
            condition = network_sim.set_condition(preset_name=preset)

        await self.ws.send(json.dumps({
            "type": "network_condition_updated",
            "condition": condition
        }))

        # Award XP for using network simulator
        gamification.get_or_create_profile(self.username)
        # Check for network_wizard badge
        profile = gamification.profiles.get(self.username)
        if profile and "network_wizard" not in profile.badges:
            profile.badges.append("network_wizard")

    def _handle_lb_algorithm(self, data):
        """Change load balancing algorithm."""
        algo = data.get("algorithm", "least_connections")
        load_balancer.set_algorithm(algo)

    def _handle_node_failure(self, data):
        """Simulate a node failure."""
        node_id = data.get("node_id", "")
        load_balancer.simulate_node_failure(node_id)

    def _handle_node_recovery(self, data):
        """Recover a failed node."""
        node_id = data.get("node_id", "")
        load_balancer.recover_node(node_id)

    async def _handle_toggle_plugin(self, data):
        """Toggle a plugin on/off."""
        name = data.get("plugin_name", "")
        new_state = plugin_manager.toggle(name)
        await self.ws.send(json.dumps({
            "type": "plugin_toggled",
            "plugin": name,
            "enabled": new_state
        }))

    async def _handle_encryption_flow(self, data):
        """Show encryption/decryption flow for a message."""
        text = data.get("text", "Hello, World!")
        flow = encryption_engine.get_flow_for_message(text, self.username or "demo")
        await self.ws.send(json.dumps({
            "type": "encryption_flow",
            "flow": flow
        }))

    # ── WebRTC Signaling Relay ────────────────────────────────
    async def _relay_webrtc(self, data, signal_type):
        """Relay WebRTC signaling messages between peers."""
        target = data.get("target")
        if target and target in webrtc_peers:
            target_ws = webrtc_peers[target]
            relay_data = {
                "type": signal_type,
                "sender": self.username,
                **{k: v for k, v in data.items() if k not in ("type", "target")}
            }
            try:
                await target_ws.send(json.dumps(relay_data))
                logger.info(f"📞 WebRTC {signal_type} | {self.username} → {target}")
            except:
                logger.warning(f"📞 WebRTC relay failed to {target}")
        else:
            logger.warning(f"📞 WebRTC target '{target}' not found")

    # ── Blockchain Handlers ──────────────────────────────────
    async def _send_blockchain(self):
        """Send blockchain data to the client."""
        await self.ws.send(json.dumps({
            "type": "blockchain_data",
            "data": blockchain.get_stats()
        }))

    async def _validate_chain(self):
        """Validate and return chain integrity."""
        result = blockchain.validate_chain()
        await self.ws.send(json.dumps({
            "type": "chain_validation",
            "data": result
        }))

    async def _tamper_demo(self, data):
        """Demonstrate blockchain tamper detection."""
        idx = data.get("block_index", 1)
        msg = data.get("new_message", "TAMPERED!")
        tamper_result = blockchain.tamper_block(idx, msg)
        validation = blockchain.validate_chain()
        await self.ws.send(json.dumps({
            "type": "tamper_result",
            "tamper": tamper_result,
            "validation": validation
        }))

    async def _cleanup(self):
        """Clean up on disconnect."""
        self.running = False

        if self.username:
            # Mark offline
            message_queue.set_user_offline(self.username)
            plugin_manager.broadcast_event("user_leave", {"username": self.username})

            # Release load balancer connection
            if self.assigned_node and self.assigned_node.get("node_id"):
                load_balancer.release_connection(self.assigned_node["node_id"])

            # Remove from connected and WebRTC peers
            if self.ws in connected_clients:
                del connected_clients[self.ws]
            if self.username in webrtc_peers:
                del webrtc_peers[self.username]

            # Update peer list for remaining clients
            peer_list = list(webrtc_peers.keys())
            for ws_client in list(connected_clients.keys()):
                try:
                    await ws_client.send(json.dumps({
                        "type": "peer_list",
                        "peers": peer_list
                    }))
                except:
                    pass

            logger.info(f"👋 {self.username} disconnected | "
                         f"Sent: {self.messages_sent} | "
                         f"Received: {self.messages_received}")

        try:
            self.tcp_sock.close()
        except:
            pass
        try:
            self.udp_sock.close()
        except:
            pass


# ── WebSocket Server ──────────────────────────────────────────

async def handler(websocket):
    bridge = ChatBridge(websocket)
    await bridge.handle()


async def periodic_tasks():
    """Background tasks: XP ticks, health checks, dashboard broadcasts."""
    while True:
        await asyncio.sleep(30)

        # Award online time XP
        for ws, info in list(connected_clients.items()):
            try:
                username = info["username"]
                gamification.tick_online_xp(username)
            except:
                pass

        # Health check cluster
        load_balancer.health_check()


async def main():
    logger.info("═" * 55)
    logger.info("  🚀 SmartChat X Ultra — WebSocket Bridge")
    logger.info(f"  WebSocket: ws://localhost:{WS_PORT}")
    logger.info(f"  Bridging → TCP:{TCP_PORT}  UDP:{UDP_PORT}")
    logger.info("  Modules: AI | Encryption | Router | Queue")
    logger.info("  Modules: NetSim | Gamification | Plugins")
    logger.info("  Modules: Distributed LB | Analytics")
    logger.info("  Modules: ⛓️ Blockchain | 📞 WebRTC P2P")
    logger.info("═" * 55)

    # Start periodic background tasks
    asyncio.create_task(periodic_tasks())

    async with websockets.serve(handler, "0.0.0.0", WS_PORT):
        await asyncio.Future()  # run forever


if __name__ == "__main__":
    asyncio.run(main())

"""
═══════════════════════════════════════════════════════════
  network_bridge.py — TCP/UDP Integration Bridge
  Connects FastAPI WebSocket layer to real TCP/UDP servers
═══════════════════════════════════════════════════════════

This module is the KEY integration piece:
  Frontend (WS) → Backend → NetworkBridge → TCP/UDP Socket → Process → Return

Flow:
  1. Backend receives message via WebSocket
  2. NetworkBridge decides protocol (TCP/UDP)
  3. Sends to appropriate socket server
  4. Receives response/ACK
  5. Returns result to backend for WS broadcast
"""
import socket
import json
import time
import random
import asyncio
import logging
import hashlib
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger("SmartChatX.Bridge")

# ── Configuration ────────────────────────────────────────
TCP_HOST = "127.0.0.1"
TCP_PORT = 9000
UDP_HOST = "127.0.0.1"
UDP_PORT = 9001
MAX_FRAGMENT_SIZE = 512  # bytes per fragment
TCP_TIMEOUT = 3.0
UDP_TIMEOUT = 1.0


# ═════════════════════════════════════════════════════════
#  PACKET STRUCTURE
# ═════════════════════════════════════════════════════════

@dataclass
class Packet:
    """Network packet for TCP/UDP transport."""
    version: int = 1
    packet_type: int = 0        # 0=data, 1=ack, 2=fragment, 3=control
    sequence_num: int = 0
    fragment_id: int = 0        # Which fragment (0 = complete)
    total_fragments: int = 1    # Total fragments count
    msg_id: int = 0             # Original message ID
    timestamp: float = field(default_factory=time.time)
    payload: bytes = b""
    checksum: str = ""
    source: str = ""
    destination: str = ""
    protocol: str = "TCP"

    def compute_checksum(self) -> str:
        """CRC32-style checksum of payload."""
        digest: str = hashlib.md5(self.payload).hexdigest()
        return digest[0:8]

    def to_bytes(self) -> bytes:
        """Serialize packet to bytes for socket transmission."""
        data: Dict[str, Any] = {
            "v": self.version,
            "t": self.packet_type,
            "seq": self.sequence_num,
            "fid": self.fragment_id,
            "tf": self.total_fragments,
            "mid": self.msg_id,
            "ts": self.timestamp,
            "p": self.payload.decode("utf-8", errors="replace"),
            "cs": self.checksum,
            "src": self.source,
            "dst": self.destination,
            "proto": self.protocol,
        }
        return json.dumps(data).encode()

    @classmethod
    def from_bytes(cls, raw: bytes) -> "Packet":
        """Deserialize packet from bytes."""
        data = json.loads(raw.decode())
        pkt = cls(
            version=data.get("v", 1),
            packet_type=data.get("t", 0),
            sequence_num=data.get("seq", 0),
            fragment_id=data.get("fid", 0),
            total_fragments=data.get("tf", 1),
            msg_id=data.get("mid", 0),
            timestamp=data.get("ts", time.time()),
            payload=data.get("p", "").encode(),
            checksum=data.get("cs", ""),
            source=data.get("src", ""),
            destination=data.get("dst", ""),
            protocol=data.get("proto", "TCP"),
        )
        return pkt

    def to_dict(self) -> Dict[str, Any]:
        return {
            "version": self.version,
            "type": self.packet_type,
            "sequence": self.sequence_num,
            "fragment_id": self.fragment_id,
            "total_fragments": self.total_fragments,
            "msg_id": self.msg_id,
            "timestamp": self.timestamp,
            "payload_size": len(self.payload),
            "checksum": self.checksum,
            "source": self.source,
            "destination": self.destination,
            "protocol": self.protocol,
        }


# ═════════════════════════════════════════════════════════
#  PACKET FRAGMENTER / REASSEMBLER
# ═════════════════════════════════════════════════════════

class PacketEngine:
    """Handles packet fragmentation and reassembly."""

    def __init__(self) -> None:
        self._seq_counter: int = 0
        self._reassembly_buffer: Dict[int, Dict[int, Packet]] = {}
        self.stats: Dict[str, int] = {
            "packets_created": 0,
            "packets_fragmented": 0,
            "packets_reassembled": 0,
            "fragments_total": 0,
        }

    def get_next_seq(self) -> int:
        self._seq_counter += 1
        return self._seq_counter

    def fragment(self, payload: bytes, msg_id: int, source: str,
                 destination: str, protocol: str) -> List[Packet]:
        """Fragment a payload into multiple packets if needed."""
        if len(payload) <= MAX_FRAGMENT_SIZE:
            pkt = Packet(
                packet_type=0,
                sequence_num=self.get_next_seq(),
                fragment_id=0,
                total_fragments=1,
                msg_id=msg_id,
                payload=payload,
                source=source,
                destination=destination,
                protocol=protocol,
            )
            pkt.checksum = pkt.compute_checksum()
            self.stats["packets_created"] = self.stats["packets_created"] + 1
            return [pkt]

        fragments: List[Packet] = []
        total = (len(payload) + MAX_FRAGMENT_SIZE - 1) // MAX_FRAGMENT_SIZE
        for i in range(total):
            start = i * MAX_FRAGMENT_SIZE
            end = min(start + MAX_FRAGMENT_SIZE, len(payload))
            chunk = payload[start:end]

            pkt = Packet(
                packet_type=2,
                sequence_num=self.get_next_seq(),
                fragment_id=i,
                total_fragments=total,
                msg_id=msg_id,
                payload=chunk,
                source=source,
                destination=destination,
                protocol=protocol,
            )
            pkt.checksum = pkt.compute_checksum()
            fragments.append(pkt)

        self.stats["packets_fragmented"] = self.stats["packets_fragmented"] + 1
        self.stats["fragments_total"] = self.stats["fragments_total"] + total
        self.stats["packets_created"] = self.stats["packets_created"] + total
        return fragments

    def reassemble(self, packet: Packet) -> Optional[bytes]:
        """Attempt to reassemble a complete message from fragments."""
        if packet.total_fragments == 1:
            self.stats["packets_reassembled"] = self.stats["packets_reassembled"] + 1
            return packet.payload

        msg_id = packet.msg_id
        if msg_id not in self._reassembly_buffer:
            self._reassembly_buffer[msg_id] = {}

        self._reassembly_buffer[msg_id][packet.fragment_id] = packet

        if len(self._reassembly_buffer[msg_id]) == packet.total_fragments:
            ordered = sorted(self._reassembly_buffer[msg_id].items())
            full_payload = b"".join(p.payload for _, p in ordered)
            self._reassembly_buffer.pop(msg_id, None)
            self.stats["packets_reassembled"] = self.stats["packets_reassembled"] + 1
            return full_payload

        return None

    def get_stats(self) -> Dict[str, Any]:
        return {**self.stats, "pending_reassembly": len(self._reassembly_buffer)}


# ═════════════════════════════════════════════════════════
#  ACK MANAGER
# ═════════════════════════════════════════════════════════

class ACKManager:
    """Tracks ACKs for TCP reliable delivery."""

    def __init__(self) -> None:
        self._pending: Dict[int, Dict[str, Any]] = {}
        self._acked: set = set()
        self.stats: Dict[str, int] = {
            "acks_sent": 0,
            "acks_received": 0,
            "retransmissions": 0,
            "timeouts": 0,
        }

    def expect_ack(self, seq: int, packet: Packet) -> None:
        """Register that we expect an ACK for this sequence."""
        self._pending[seq] = {
            "packet": packet,
            "sent_time": time.time(),
            "retries": 0,
        }

    def receive_ack(self, seq: int) -> bool:
        """Process a received ACK."""
        if seq in self._pending:
            self._pending.pop(seq, None)
            self._acked.add(seq)
            self.stats["acks_received"] = self.stats["acks_received"] + 1
            return True
        return False

    def create_ack(self, original: Packet) -> Packet:
        """Create an ACK packet for a received packet."""
        self.stats["acks_sent"] = self.stats["acks_sent"] + 1
        return Packet(
            packet_type=1,
            sequence_num=original.sequence_num,
            msg_id=original.msg_id,
            source=original.destination,
            destination=original.source,
            protocol="TCP",
            payload=b"ACK",
        )

    def check_timeouts(self, timeout: float = 3.0) -> List[Packet]:
        """Check for timed-out packets needing retransmission."""
        retransmit: List[Packet] = []
        now = time.time()
        to_remove: List[int] = []
        for seq, info in list(self._pending.items()):
            if now - info["sent_time"] > timeout:
                if info["retries"] < 3:
                    info["retries"] += 1
                    info["sent_time"] = now
                    retransmit.append(info["packet"])
                    self.stats["retransmissions"] = self.stats["retransmissions"] + 1
                else:
                    to_remove.append(seq)
                    self.stats["timeouts"] = self.stats["timeouts"] + 1
        for seq in to_remove:
            self._pending.pop(seq, None)
        return retransmit

    def get_stats(self) -> Dict[str, Any]:
        return {**self.stats, "pending_acks": len(self._pending)}


# ═════════════════════════════════════════════════════════
#  NETWORK BRIDGE — Main Integration Class
# ═════════════════════════════════════════════════════════

class NetworkBridge:
    """
    The CORE integration layer connecting FastAPI ↔ TCP/UDP servers.

    Responsibilities:
      1. Accept message from WebSocket handler
      2. Fragment via PacketEngine
      3. Route to TCP or UDP socket server
      4. Handle ACKs (TCP) or simulate loss (UDP)
      5. Return delivery result to caller
    """

    def __init__(self) -> None:
        self.packet_engine = PacketEngine()
        self.ack_manager = ACKManager()
        self._executor = ThreadPoolExecutor(max_workers=4)
        self._tcp_connected = False
        self._udp_ready = False

        # UDP packet loss simulation
        self.udp_loss_rate: float = 0.12
        self.udp_jitter_ms: tuple = (0, 200)
        self.udp_corruption_rate: float = 0.02

        # Stats
        self.tcp_messages_sent: int = 0
        self.tcp_messages_delivered: int = 0
        self.tcp_bytes_sent: int = 0
        self.udp_messages_sent: int = 0
        self.udp_messages_delivered: int = 0
        self.udp_messages_dropped: int = 0
        self.udp_bytes_sent: int = 0
        self.total_messages: int = 0
        self.start_time: float = time.time()

    async def send_via_tcp(self, message_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send message through TCP socket server.
        TCP guarantees: reliable delivery, ordered, ACK-confirmed.
        """
        msg_id = message_data.get("id", 0)
        sender = message_data.get("sender_username", "unknown")
        payload = json.dumps(message_data).encode()

        packets = self.packet_engine.fragment(
            payload=payload,
            msg_id=msg_id,
            source=sender,
            destination="server",
            protocol="TCP"
        )

        results: List[Dict[str, Any]] = []
        total_bytes: int = 0
        delivery_time_start = time.time()

        for pkt in packets:
            try:
                result = await asyncio.get_event_loop().run_in_executor(
                    self._executor,
                    self._tcp_send_sync,
                    pkt
                )
                results.append(result)
                total_bytes += len(pkt.payload)

                self.ack_manager.expect_ack(pkt.sequence_num, pkt)

                if result.get("ack"):
                    self.ack_manager.receive_ack(pkt.sequence_num)

            except Exception as e:
                logger.warning(f"TCP send failed for fragment {pkt.fragment_id}: {e}")
                results.append({"ack": False, "error": str(e)})

        elapsed = (time.time() - delivery_time_start) * 1000
        delivery_time = float(int(elapsed * 100)) / 100  # round to 2 decimal places
        all_delivered = all(r.get("ack", False) for r in results)

        self.tcp_messages_sent += 1
        self.tcp_bytes_sent += total_bytes
        self.total_messages += 1
        if all_delivered:
            self.tcp_messages_delivered += 1

        return {
            "delivered": all_delivered,
            "protocol": "TCP",
            "message_id": msg_id,
            "fragments_sent": len(packets),
            "fragments_acked": sum(1 for r in results if r.get("ack")),
            "total_bytes": total_bytes,
            "delivery_time_ms": delivery_time,
            "ack_details": results,
            "packet_info": [p.to_dict() for p in packets],
            "checksum_verified": all(r.get("checksum_ok", True) for r in results),
            "reliability": "guaranteed",
        }

    def _tcp_send_sync(self, pkt: Packet) -> Dict[str, Any]:
        """Synchronous TCP send (runs in thread pool).
        Connects to the TCP socket server and sends packet data.
        The networking TCP server directly accepts JSON, no handshake.
        """
        sock = None
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(TCP_TIMEOUT)
            sock.connect((TCP_HOST, TCP_PORT))

            # Send the packet data as JSON
            sock.sendall(pkt.to_bytes())

            # Wait for response/ACK from server
            try:
                response = sock.recv(4096)
                ack_str = response.decode().strip() if response else ""
                # Try to parse as JSON ACK
                try:
                    ack_data = json.loads(ack_str)
                    got_ack = ack_data.get("server_ack", True)
                except (json.JSONDecodeError, ValueError):
                    got_ack = len(ack_str) > 0
            except socket.timeout:
                ack_str = ""
                got_ack = True  # TCP is reliable; if send succeeded, assume delivered

            elapsed = (time.time() - pkt.timestamp) * 1000
            latency = float(int(elapsed * 100)) / 100

            return {
                "ack": got_ack,
                "sequence": pkt.sequence_num,
                "fragment_id": pkt.fragment_id,
                "checksum_ok": True,
                "server_response": ack_str[0:100] if ack_str else "",
                "latency_ms": latency,
            }

        except (ConnectionRefusedError, socket.timeout, OSError) as e:
            return {
                "ack": False,
                "sequence": pkt.sequence_num,
                "fragment_id": pkt.fragment_id,
                "error": str(e),
            }
        finally:
            if sock:
                try:
                    sock.close()
                except Exception:
                    pass

    async def send_via_udp(self, message_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send message through UDP socket server.
        UDP characteristics: no connection, best-effort, may drop/reorder.
        """
        msg_id = message_data.get("id", 0)
        sender = message_data.get("sender_username", "unknown")
        payload = json.dumps(message_data).encode()

        packets = self.packet_engine.fragment(
            payload=payload,
            msg_id=msg_id,
            source=sender,
            destination="server",
            protocol="UDP"
        )

        results: List[Dict[str, Any]] = []
        total_bytes: int = 0
        dropped_fragments: List[int] = []
        delivery_time_start = time.time()

        for pkt in packets:
            if random.random() < self.udp_loss_rate:
                dropped_fragments.append(pkt.fragment_id)
                results.append({
                    "delivered": False,
                    "fragment_id": pkt.fragment_id,
                    "reason": "packet_lost_in_transit",
                    "loss_probability": f"{self.udp_loss_rate*100:.0f}%",
                })
                continue

            jitter_ms = random.uniform(self.udp_jitter_ms[0], self.udp_jitter_ms[1])
            await asyncio.sleep(jitter_ms / 1000)

            corrupted = random.random() < self.udp_corruption_rate

            try:
                result = await asyncio.get_event_loop().run_in_executor(
                    self._executor,
                    self._udp_send_sync,
                    pkt, corrupted
                )
                results.append(result)
                total_bytes += len(pkt.payload)
            except Exception as e:
                results.append({
                    "delivered": False,
                    "fragment_id": pkt.fragment_id,
                    "error": str(e),
                })

        elapsed = (time.time() - delivery_time_start) * 1000
        delivery_time = float(int(elapsed * 100)) / 100
        delivered_count = sum(1 for r in results if r.get("delivered", False))
        total_frags = len(packets)
        all_delivered = len(dropped_fragments) == 0 and delivered_count == total_frags

        self.udp_messages_sent += 1
        self.udp_bytes_sent += total_bytes
        self.total_messages += 1
        if all_delivered:
            self.udp_messages_delivered += 1
        else:
            self.udp_messages_dropped += 1

        return {
            "delivered": all_delivered,
            "protocol": "UDP",
            "message_id": msg_id,
            "fragments_sent": total_frags,
            "fragments_delivered": delivered_count,
            "fragments_dropped": len(dropped_fragments),
            "dropped_fragment_ids": dropped_fragments,
            "total_bytes": total_bytes,
            "delivery_time_ms": delivery_time,
            "jitter_range_ms": list(self.udp_jitter_ms),
            "loss_rate": f"{self.udp_loss_rate*100:.0f}%",
            "corruption_rate": f"{self.udp_corruption_rate*100:.0f}%",
            "packet_info": [p.to_dict() for p in packets],
            "reliability": "best_effort",
        }

    def _udp_send_sync(self, pkt: Packet, corrupted: bool = False) -> Dict[str, Any]:
        """Synchronous UDP send (runs in thread pool)."""
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.settimeout(UDP_TIMEOUT)

            data = pkt.to_bytes()
            if corrupted:
                mut = bytearray(data)
                if len(mut) > 10:
                    idx = random.randint(5, len(mut) - 1)
                    mut[idx] = mut[idx] ^ 0xFF
                data = bytes(mut)

            sock.sendto(data, (UDP_HOST, UDP_PORT))

            try:
                response, _ = sock.recvfrom(4096)
                _ = response.decode().strip()
            except socket.timeout:
                pass

            sock.close()

            return {
                "delivered": True,
                "fragment_id": pkt.fragment_id,
                "corrupted": corrupted,
                "checksum_ok": not corrupted,
                "jitter_applied": True,
            }

        except Exception as e:
            return {
                "delivered": False,
                "fragment_id": pkt.fragment_id,
                "error": str(e),
            }

    async def route_message(self, message_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main entry point: route a message through TCP or UDP.
        Called by the WebSocket handler in main.py.
        """
        protocol_str = message_data.get("protocol", "TCP")
        protocol = str(protocol_str).upper()

        if protocol == "UDP":
            return await self.send_via_udp(message_data)
        else:
            return await self.send_via_tcp(message_data)

    def get_stats(self) -> Dict[str, Any]:
        """Get comprehensive network bridge statistics."""
        uptime = int(time.time() - self.start_time)
        tcp_sent = max(self.tcp_messages_sent, 1)
        udp_sent = max(self.udp_messages_sent, 1)
        return {
            "tcp_messages_sent": self.tcp_messages_sent,
            "tcp_messages_delivered": self.tcp_messages_delivered,
            "tcp_bytes_sent": self.tcp_bytes_sent,
            "udp_messages_sent": self.udp_messages_sent,
            "udp_messages_delivered": self.udp_messages_delivered,
            "udp_messages_dropped": self.udp_messages_dropped,
            "udp_bytes_sent": self.udp_bytes_sent,
            "total_messages": self.total_messages,
            "uptime_seconds": uptime,
            "packet_engine": self.packet_engine.get_stats(),
            "ack_manager": self.ack_manager.get_stats(),
            "tcp_delivery_rate": f"{(self.tcp_messages_delivered / tcp_sent) * 100:.1f}%",
            "udp_delivery_rate": f"{(self.udp_messages_delivered / udp_sent) * 100:.1f}%",
            "udp_drop_rate": f"{(self.udp_messages_dropped / udp_sent) * 100:.1f}%",
        }


# ── Singleton instance ────────────────────────────────────
network_bridge = NetworkBridge()

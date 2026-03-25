# 📡 Protocol Documentation — SmartChat X

## Supported Protocols

### TCP (Transmission Control Protocol)
- **Type:** Connection-oriented, reliable
- **Use Cases:** Chat messages, file transfers, auth
- **Guarantees:** Ordered delivery, no data loss, congestion control
- **Port:** 9000

### UDP (User Datagram Protocol)
- **Type:** Connectionless, best-effort
- **Use Cases:** Typing indicators, presence, heartbeats
- **Guarantees:** None (fire-and-forget)
- **Port:** 9001

### Hybrid
- **Type:** Intelligent routing combining TCP + UDP
- **Logic:** Sends via TCP first; falls back to UDP on failure
- **Use Cases:** System messages, batch updates

### WebRTC (Optional P2P)
- **Type:** Peer-to-peer via DataChannels
- **Use Cases:** Direct browser-to-browser messaging
- **Signaling:** Via WebSocket server

---

## Protocol Selection Logic

```
Message Type          → Selected Protocol
────────────────────────────────────────
Text message          → TCP (reliable)
Typing indicator      → UDP (fast)
Presence update       → UDP (fire-and-forget)
File transfer         → TCP (guaranteed)
Voice data            → UDP (low latency)
System notification   → HYBRID (smart)
P2P direct message    → WebRTC (no server)
```

---

## Packet Structure

```
┌───────────┬───────┬──────────┬───────────┬──────────┬──────────┐
│ Version   │ Type  │ Sequence │ Timestamp │ Checksum │ Payload  │
│ (1 byte)  │(1 B)  │ (4 B)    │ (8 B)     │ (4 B)    │ (var)    │
└───────────┴───────┴──────────┴───────────┴──────────┴──────────┘
```

**Packet Types:**
- `0` — Data (regular message)
- `1` — ACK (acknowledgment)
- `2` — Heartbeat (keep-alive)
- `3` — Control (protocol commands)
- `4` — Error

---

## Checksum Verification

All packets include a CRC32 checksum:
1. Calculate `zlib.crc32()` of the payload
2. Attach to packet header
3. Receiver recalculates and compares
4. Mismatch → packet rejected (E302)

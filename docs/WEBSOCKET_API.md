# 🔌 WebSocket API Documentation

Endpoint: `ws://localhost:8765`

---

## Connection

Connect to the WebSocket server and register:
```json
{ "type": "connect", "username": "YourName" }
```

---

## Client → Server Events

| Event | Description | Payload |
|-------|-------------|---------|
| `send_message` | Send a chat message | `{ content, protocol, room_id }` |
| `start_typing` | User started typing | `{ user, room_id }` |
| `stop_typing` | User stopped typing | `{ user, room_id }` |
| `join_room` | Join a chat room | `{ room_id }` |
| `leave_room` | Leave a chat room | `{ room_id }` |
| `switch_protocol` | Change protocol | `{ from_protocol, to_protocol }` |

---

## Server → Client Events

| Event | Description | Payload |
|-------|-------------|---------|
| `message_received` | New message | `{ sender, content, protocol, timestamp }` |
| `user_joined` | User came online | `{ user: { id, username } }` |
| `user_left` | User went offline | `{ userId }` |
| `user_typing` | Someone is typing | `{ user, room_id }` |
| `user_list` | Full online users | `{ users: [...] }` |
| `protocol_changed` | Protocol switched | `{ protocol, reason }` |
| `error` | Error occurred | `{ code, message }` |
| `system_message` | System notification | `{ content, severity }` |

---

## Example Message Flow

```
Client                          Server
  |                               |
  | {"type":"send_message",       |
  |  "content":"Hello!",          |
  |  "protocol":"TCP"}            |
  | ----------------------------→ |
  |                               |
  |        {"type":"message_received",
  |         "sender":"You",       |
  |         "content":"Hello!",   |
  |         "protocol":"TCP",     |
  |         "timestamp":"..."}    |
  | ←---------------------------- |
```

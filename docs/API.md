# 📡 API Documentation — SmartChat X

Base URL: `http://localhost:8000/api`

---

## Health & Status

### `GET /api/health`
Returns server health status.

**Response:**
```json
{
  "status": "healthy",
  "service": "SmartChat X API",
  "timestamp": "2024-01-01T00:00:00",
  "version": "1.0.0"
}
```

### `GET /api/status`
Returns detailed system status.

---

## Chat

### `GET /api/chat/history/{room_id}`
Get message history for a chat room.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| room_id | path | — | Room ID |
| limit | query | 50 | Max messages to return |

### `POST /api/chat/send`
Send a chat message via REST (WebSocket fallback).

**Body:**
```json
{
  "sender": "username",
  "content": "Hello!",
  "protocol": "TCP",
  "room_id": "general"
}
```

### `GET /api/chat/rooms`
List all available chat rooms.

### `POST /api/chat/rooms`
Create a new chat room.

---

## Users

### `POST /api/users/register`
Register with a username.

### `GET /api/users/{user_id}`
Get user profile.

### `PUT /api/users/settings`
Update user preferences.

### `GET /api/users/online`
Get online users list.

### `GET /api/users/leaderboard`
Get XP leaderboard (top 10).

---

## Analytics

### `GET /api/analytics/stats`
Get dashboard statistics.

### `GET /api/analytics/protocols`
Get protocol usage distribution.

### `GET /api/analytics/latency?minutes=30`
Get latency history.

### `GET /api/analytics/timeline?interval=5m`
Get message activity timeline.

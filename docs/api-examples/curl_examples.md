# SmartChat X — API Examples (cURL)

## Health Check
```bash
curl http://localhost:8000/api/health
```

## Register User
```bash
curl -X POST http://localhost:8000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"username": "alice"}'
```

## Send Message
```bash
curl -X POST http://localhost:8000/api/chat/send \
  -H "Content-Type: application/json" \
  -d '{
    "sender": "alice",
    "content": "Hello everyone!",
    "protocol": "TCP",
    "room_id": "general"
  }'
```

## Get Chat History
```bash
curl "http://localhost:8000/api/chat/history/general?limit=20"
```

## Get Dashboard Stats
```bash
curl http://localhost:8000/api/analytics/stats
```

## Get Protocol Distribution
```bash
curl http://localhost:8000/api/analytics/protocols
```

## Get Online Users
```bash
curl http://localhost:8000/api/users/online
```

## Get Leaderboard
```bash
curl http://localhost:8000/api/users/leaderboard
```

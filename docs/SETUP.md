# 🛠️ Setup Guide — SmartChat X

## Prerequisites

- **Python** 3.10+
- **Node.js** 18+ (with npm)
- **Git**

---

## Quick Start

### 1. Clone the Repository
```bash
git clone <repo-url>
cd CN_TCP_UDP_CHAT
```

### 2. Install Frontend Dependencies
```bash
cd frontend
npm install
```

### 3. Install Backend Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 4. Environment Configuration
```bash
# Copy the template
cp .env.example .env
# Edit .env with your values
```

### 5. Start All Servers
```bash
# Option A: Use the launcher
python run_all.py

# Option B: Start individually
# Terminal 1: Backend API
cd backend && python main.py

# Terminal 2: Frontend dev server
cd frontend && npm run dev
```

### 6. Open the Application
- Frontend: http://localhost:3000
- API Docs: http://localhost:8000/docs
- Health Check: http://localhost:8000/api/health

---

## Server Ports

| Service | Port | Protocol |
|---------|------|----------|
| Frontend (Vite) | 3000 | HTTP |
| Backend API | 8000 | HTTP |
| TCP Server | 9000 | TCP |
| UDP Server | 9001 | UDP |
| WebSocket Bridge | 8765 | WS |

---

## Troubleshooting

### Port already in use
```bash
# Windows
netstat -ano | findstr :9000
taskkill /PID <PID> /F
```

### Module not found
```bash
pip install -r requirements.txt
```

### CORS errors
Ensure the frontend URL is listed in `backend/app/config/settings.py` → `CORS_ORIGINS`.

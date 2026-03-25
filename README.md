# ⚡ SmartChat X v4.0 — AI-Powered Multi-Protocol Chat System

> Advanced TCP/UDP/WebRTC Communication with Groq LLM AI, Private Messaging, Voice Calling, and Peer-to-Peer

![Version](https://img.shields.io/badge/version-4.0.0-00f0ff?style=flat-square)
![Python](https://img.shields.io/badge/Python-3.9+-blue?style=flat-square)
![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square)

---

## 🚀 Features

### 🧠 AI-Powered Chat Engine (Groq LLM)
- **AI Chat Assistant** — Full LLM conversation powered by Groq (click 🤖 or type `/ai <question>`)
- **Smart Reply Suggestions** — LLM-generated contextual quick replies
- **Toxicity Detection** — Real-time screening with severity scoring
- **Chat Summarization** — LLM-powered conversation summaries (`/summarize`)
- **Study Mode Tutor** — Deep AI explanations (`/study <topic>` or `/quiz`)
- **Translation** — Translate messages to any language (`/translate hello to Spanish`)

### 💬 Private Direct Messaging (DMs)
- **Personal conversations** visible only to sender and recipient
- **Persistent DM history** stored in database
- Click **💬** next to any online user in the sidebar to open DM panel
- Messages are **NOT visible** in the global chat — fully private

### 📞 Voice Calling
- **WebRTC voice calls** between users (click **📞** next to any online user)
- **Incoming call modal** with accept/reject buttons
- **In-call timer** showing call duration
- **Call end** button to hang up
- Uses STUN server for NAT traversal

### 🌐 Adaptive Multi-Protocol Routing
- **AUTO Mode** — AI auto-selects TCP/UDP per message type
- **TCP** → Reliable delivery | **UDP** → Fast, fire-and-forget
- Protocol toggle cycles: **TCP → UDP → AUTO**

### 📞 WebRTC P2P Communication
- Direct browser-to-browser messaging via DataChannels
- Click **🔗** next to any online user to establish P2P connection

---

## 📋 Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| **Python** | 3.9+ | `python --version` |
| **Node.js** | 18+ | `node --version` |
| **npm** | 9+ | `npm --version` |

---

## 🛠️ Quick Start

### Step 1: Install Backend Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### Step 2: Set Groq API Key (for AI features)
```bash
# Windows PowerShell:
$env:GROQ_API_KEY="your_groq_api_key_here"

# Or Linux/Mac:
export GROQ_API_KEY="your_groq_api_key_here"
```
> Get a free API key at https://console.groq.com/keys

### Step 3: Install Frontend Dependencies
```bash
cd frontend
npm install
```

### Step 4: Start Backend (Terminal 1)
```bash
cd backend
python main.py
```

### Step 5: Start Frontend (Terminal 2)
```bash
cd frontend
npm run dev -- --host
```
Opens at `http://localhost:5173` (also accessible on your local network)

---

## 👥 Multiple Simultaneous Users (Same Browser)

Each browser tab gets its own independent session (uses `sessionStorage`):

1. **Tab 1** → `http://localhost:5173` → Register as `user1`
2. **Tab 2** → `http://localhost:5173` → Register as `user2`
3. **Tab 3** → `http://localhost:5173` → Register as `user3`

All three users appear online and can chat, DM, and call each other!

---

## 📱 Access from Phone (via Mobile Hotspot)

If your **phone is providing hotspot** to your PC, you can open SmartChat X on the phone browser too!

### Step 1: Find your PC's IP address on the hotspot network

Open **PowerShell** or **CMD** and run:
```bash
ipconfig
```

Look for the **Wireless LAN adapter Wi-Fi** section and find the `IPv4 Address`:
```
Wireless LAN adapter Wi-Fi:
   IPv4 Address. . . . . . . . . . . : 192.168.x.x   ← THIS IS YOUR PC's IP
```

> **Typical hotspot IPs:** `192.168.43.x`, `192.168.137.x`, or `172.20.10.x`

### Step 2: Start Backend (binds to all interfaces automatically)
```bash
cd backend
python main.py
```
> The backend now binds to `0.0.0.0:8000` so it's accessible from any device on the network.

### Step 3: Start Frontend with `--host` flag
```bash
cd frontend
npm run dev -- --host
```
You'll see output like:
```
  ➜  Local:   http://localhost:5173/
  ➜  Network: http://10.240.237.183:5173/    ← USE THIS URL ON PHONE
```

### Step 4: Allow through Windows Firewall (if prompted)
When you run the servers for the first time, Windows may ask to allow network access:
- ✅ Click **"Allow access"** for both **Python** and **Node.js**

If you missed the prompt, manually allow:
```powershell
# Run as Administrator
netsh advfirewall firewall add rule name="SmartChatX Backend" dir=in action=allow protocol=TCP localport=8000
netsh advfirewall firewall add rule name="SmartChatX Frontend" dir=in action=allow protocol=TCP localport=5173
```

### Step 5: Open on Phone
1. Open your **phone browser** (Chrome recommended)
2. Navigate to: `http://<YOUR_PC_IP>:5173`
   - Example: `http://192.168.43.100:5173`
3. Register/Login — you can now chat with users on the PC!

### 📝 Quick Example
```
PC IP on hotspot:  192.168.43.100

Phone browser URL: http://192.168.43.100:5173
PC browser URL:    http://localhost:5173

Both connect to:   Backend at 192.168.43.100:8000 (auto-detected)
```

> **Note:** The app auto-detects the host from the browser URL — no code changes needed! WebSocket and API connections automatically use the correct IP.

---

## 🎮 How to Use

### 💬 Private DMs
1. In the sidebar, click **💬** next to an online user
2. A private chat panel slides in from the right
3. Send messages — only you and the recipient can see them

### 📞 Voice Calling
1. Click **📞** next to an online user in the sidebar
2. They see an **incoming call modal** with accept/reject
3. Once accepted, a live call starts with a timer
4. Click the red button to end the call

### 🤖 AI Chat (Groq)
1. Click the **🤖** button in the header, OR type `/ai <your question>`
2. An AI chat panel opens on the right
3. Ask anything — powered by Groq's Llama 3.3 70B model

### 📚 Study Mode
- Type `/study TCP` or `/study what is WebRTC?`
- Type `/quiz` for a random practice question

### 📝 Summarize Chat
- Type `/summarize` or click **📝** in the header

### 🌍 Translate
- Type `/translate hello world to Hindi`

### 🌐 Protocol Modes
- Click the protocol badge to cycle: **TCP → UDP → AUTO**
- AUTO mode lets AI pick the best protocol per message

---

## 🔑 Chat Commands

| Command | Description |
|---------|-------------|
| `/study <topic>` | AI tutor explanation |
| `/quiz` | Random quiz question |
| `/summarize` | Summarize chat history |
| `/ai <question>` | Ask Groq AI anything |
| `/translate <text> to <language>` | Translate text |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    SMARTCHAT X v4.0                       │
├──────────────────────────────────────────────────────────┤
│  ┌────────────┐   WebSocket    ┌────────────────┐        │
│  │  React UI  │◄──────────────►│   FastAPI v4    │        │
│  │ (Vite/5173)│   REST API     │  (Port 8000)    │        │
│  └─────┬──────┘                └───┬────────┬───┘        │
│        │                           │        │            │
│   WebRTC│                NetworkBridge   Groq API        │
│        │                     │          (LLM)            │
│  ┌─────▼──────┐        ┌────▼────┐  ┌────▼────┐        │
│  │ Phone/PC   │        │TCP:9000 │  │UDP:9001 │        │
│  │ (Browser)  │        └─────────┘  └─────────┘        │
│  └────────────┘                                          │
│  Features: DM • Calls • AI Chat • Smart Routing          │
└──────────────────────────────────────────────────────────┘
```

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `backend/main.py` | FastAPI + WebSocket + AI + Calls + DMs |
| `backend/app/services/ai_engine.py` | Local AI (toxicity, smart replies, study) |
| `backend/app/services/groq_ai.py` | Groq LLM integration |
| `frontend/src/App.jsx` | Main UI + protocol routing + P2P |
| `frontend/src/DMPanel.jsx` | Private DM panel + Call modal + AI Chat |

---

## ⚙️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, Vite, Framer Motion, TailwindCSS, Chart.js |
| **Backend** | Python, FastAPI, SQLite (WAL), JWT Auth |
| **Real-time** | WebSocket, WebRTC DataChannels + MediaStream |
| **Networking** | Raw TCP/UDP sockets, Packet Fragmentation |
| **AI** | Groq API (Llama 3.3 70B) + Local NLP fallback |

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| AI features not working | Set `GROQ_API_KEY` in `backend/.env` |
| Backend port in use | Kill process: `netstat -ano \| findstr :8000` |
| Call not connecting | Allow microphone access in browser |
| Phone can't connect | Check firewall allows ports 5173 & 8000 |
| Phone shows blank page | Make sure you used `npm run dev -- --host` |
| Wrong IP on phone | Run `ipconfig` again — IP may change on reconnect |

---

<p align="center">
  <b>⚡ SmartChat X v4.0</b> — Groq AI • Private DMs • Voice Calls • WebRTC P2P • Smart Routing
</p>

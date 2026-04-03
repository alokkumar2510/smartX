/**
 * ─── chatService.js ────────────────────────────────────
 * API service for chat-related operations.
 */
import { API } from './api';

const chatService = {
  /** Get chat history */
  getHistory: (roomId, limit = 50) =>
    fetch(`${API}/chat/history/${roomId}?limit=${limit}`).then(r => r.json()),

  /** Send a message via REST (fallback when WS is down) */
  sendMessage: (roomId, content, protocol = 'TCP') =>
    fetch(`${API}/chat/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, content, protocol }),
    }).then(r => r.json()),

  /** Get available chat rooms */
  getRooms: () => fetch(`${API}/chat/rooms`).then(r => r.json()),

  /** Create a new chat room */
  createRoom: (name) =>
    fetch(`${API}/chat/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }).then(r => r.json()),
};

export default chatService;

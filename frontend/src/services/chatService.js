/**
 * ─── chatService.js ────────────────────────────────────
 * API service for chat-related operations.
 */
import api from './api';

const chatService = {
  /** Get chat history */
  getHistory: (roomId, limit = 50) =>
    api.get(`/chat/history/${roomId}`, { params: { limit } }),

  /** Send a message via REST (fallback when WS is down) */
  sendMessage: (roomId, content, protocol = 'TCP') =>
    api.post(`/chat/send`, { roomId, content, protocol }),

  /** Get available chat rooms */
  getRooms: () =>
    api.get('/chat/rooms'),

  /** Create a new chat room */
  createRoom: (name) =>
    api.post('/chat/rooms', { name }),
};

export default chatService;

/**
 * ─── socketService.js ──────────────────────────────────
 * Abstraction layer for WebSocket event management.
 * Provides typed event emitters on top of raw WS.
 */

class SocketService {
  constructor() {
    this.listeners = new Map();
  }

  /** Register an event listener */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback); // Return unsubscribe function
  }

  /** Remove an event listener */
  off(event, callback) {
    this.listeners.get(event)?.delete(callback);
  }

  /** Dispatch an event to all listeners */
  emit(event, data) {
    this.listeners.get(event)?.forEach((cb) => cb(data));
  }

  /** Process incoming WebSocket message and dispatch to listeners */
  handleMessage(data) {
    if (data.type) {
      this.emit(data.type, data);
    }
    this.emit('*', data); // Wildcard listener
  }
}

export default new SocketService();

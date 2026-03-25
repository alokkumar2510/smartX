/**
 * ─── userService.js ────────────────────────────────────
 * API service for user management operations.
 */
import api from './api';

const userService = {
  /** Register a new user */
  register: (username) => api.post('/users/register', { username }),

  /** Get user profile */
  getProfile: (userId) => api.get(`/users/${userId}`),

  /** Update user settings */
  updateSettings: (settings) => api.put('/users/settings', settings),

  /** Get online users */
  getOnlineUsers: () => api.get('/users/online'),

  /** Get leaderboard (gamification) */
  getLeaderboard: () => api.get('/users/leaderboard'),
};

export default userService;

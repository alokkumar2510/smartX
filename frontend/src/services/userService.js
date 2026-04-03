/**
 * ─── userService.js ────────────────────────────────────
 * API service for user management operations.
 */
import { API } from './api';

const userService = {
  /** Register a new user */
  register: (username) =>
    fetch(`${API}/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    }).then(r => r.json()),

  /** Get user profile */
  getProfile: (userId) => fetch(`${API}/users/${userId}`).then(r => r.json()),

  /** Update user settings */
  updateSettings: (settings) =>
    fetch(`${API}/users/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    }).then(r => r.json()),

  /** Get online users */
  getOnlineUsers: () => fetch(`${API}/users/online`).then(r => r.json()),

  /** Get leaderboard (gamification) */
  getLeaderboard: () => fetch(`${API}/users/leaderboard`).then(r => r.json()),
};

export default userService;

/**
 * ─── api.js ────────────────────────────────────────────
 * Axios instance with base URL, interceptors, and
 * error handling for all API calls.
 */
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request Interceptor ────────────────────────────────
api.interceptors.request.use(
  (config) => {
    // Attach auth token if available
    const token = localStorage.getItem('smartchat_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor ───────────────────────────────
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.detail || error.message || 'Network Error';
    console.error('[API Error]', message);
    return Promise.reject({ message, status: error.response?.status });
  }
);

export default api;

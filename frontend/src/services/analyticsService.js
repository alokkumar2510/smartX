/**
 * ─── analyticsService.js ───────────────────────────────
 * API service for analytics data.
 */
import api from './api';

const analyticsService = {
  /** Get dashboard stats */
  getStats: () => api.get('/analytics/stats'),

  /** Get protocol distribution data */
  getProtocolDistribution: () => api.get('/analytics/protocols'),

  /** Get latency history */
  getLatencyHistory: (minutes = 30) =>
    api.get('/analytics/latency', { params: { minutes } }),

  /** Get message timeline */
  getTimeline: (interval = '5m') =>
    api.get('/analytics/timeline', { params: { interval } }),
};

export default analyticsService;

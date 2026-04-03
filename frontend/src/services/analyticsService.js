/**
 * ─── analyticsService.js ───────────────────────────────
 * API service for analytics data.
 */
import { API } from './api';

const analyticsService = {
  /** Get dashboard stats */
  getStats: () => fetch(`${API}/analytics/stats`).then(r => r.json()),

  /** Get protocol distribution data */
  getProtocolDistribution: () => fetch(`${API}/analytics/protocols`).then(r => r.json()),

  /** Get latency history */
  getLatencyHistory: (minutes = 30) =>
    fetch(`${API}/analytics/latency?minutes=${minutes}`).then(r => r.json()),

  /** Get message timeline */
  getTimeline: (interval = '5m') =>
    fetch(`${API}/analytics/timeline?interval=${interval}`).then(r => r.json()),
};

export default analyticsService;

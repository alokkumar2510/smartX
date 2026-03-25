/**
 * ─── useNetworkStats.js ────────────────────────────────
 * Hook for collecting and exposing real-time network statistics.
 */
import { useState, useEffect } from 'react';

const useNetworkStats = (lastMessage) => {
  const [stats, setStats] = useState({
    totalMessages: 0,
    tcpCount: 0,
    udpCount: 0,
    hybridCount: 0,
    avgLatency: 0,
    latencyHistory: [],
  });

  useEffect(() => {
    if (!lastMessage || lastMessage.type !== 'chat_message') return;

    setStats((prev) => {
      const protocol = lastMessage.protocol?.toUpperCase() || 'TCP';
      const latency = lastMessage.latency || Math.random() * 30;
      const newHistory = [...prev.latencyHistory.slice(-29), latency];
      const avgLatency = Math.round(newHistory.reduce((a, b) => a + b, 0) / newHistory.length);

      return {
        totalMessages: prev.totalMessages + 1,
        tcpCount: prev.tcpCount + (protocol === 'TCP' ? 1 : 0),
        udpCount: prev.udpCount + (protocol === 'UDP' ? 1 : 0),
        hybridCount: prev.hybridCount + (protocol === 'HYBRID' ? 1 : 0),
        avgLatency,
        latencyHistory: newHistory,
      };
    });
  }, [lastMessage]);

  return stats;
};

export default useNetworkStats;

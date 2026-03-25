/**
 * ─── protocolUtils.js ──────────────────────────────────
 * Protocol-related utility functions.
 */

/** Get display color class for a protocol */
export const getProtocolColor = (protocol) => {
  const colors = {
    TCP:    'text-blue-400',
    UDP:    'text-green-400',
    HYBRID: 'text-purple-400',
    WEBRTC: 'text-orange-400',
    AUTO:   'text-cyan-400',
  };
  return colors[protocol?.toUpperCase()] || colors.TCP;
};

/** Get protocol description */
export const getProtocolDescription = (protocol) => {
  const descriptions = {
    TCP:    'Reliable, ordered delivery with acknowledgment',
    UDP:    'Fast, low-latency with no delivery guarantee',
    HYBRID: 'Smart routing combining TCP reliability with UDP speed',
    AUTO:   'System auto-selects based on message type and network conditions',
  };
  return descriptions[protocol?.toUpperCase()] || '';
};

/** Recommend protocol based on message type */
export const recommendProtocol = (messageType) => {
  const map = {
    text:     'TCP',      // Text needs reliability
    typing:   'UDP',      // Typing indicators are ephemeral
    presence: 'UDP',      // Presence is fire-and-forget
    file:     'TCP',      // Files need guaranteed delivery
    voice:    'UDP',      // Voice needs low latency
    system:   'HYBRID',   // System messages use hybrid routing
  };
  return map[messageType] || 'TCP';
};

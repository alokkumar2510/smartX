const _host    = window.location.hostname || '127.0.0.1';
const _apiBase = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '')
  : `http://${_host}:8000`;

export const API = _apiBase;

const _wsProtocol = _apiBase.startsWith('https') ? 'wss:' : 'ws:';
const _wsHost     = _apiBase.replace(/^https?:\/\//, '');
export const WS_URL = `${_wsProtocol}//${_wsHost}`;

// ── ICE Servers — P2P WebRTC NAT traversal ─────────────────────
// Priority: Google STUN (free, fast) → TURN relay (fallback only)
// These are embedded in useWebRTC.js too; export for any component that needs them directly.
export const ICE_SERVERS = [
  // Google STUN — most globally reliable public STUN servers
  { urls: 'stun:stun.l.google.com:19302'  },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  // Twilio STUN (geographic diversity)
  { urls: 'stun:global.stun.twilio.com:3478' },
  // Open Relay TURN — free community TURN (used only when STUN fails / symmetric NAT)
  {
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:443',
    ],
    username:   'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turns:openrelay.metered.ca:443', // TLS TURN — most NAT-friendly
    username:   'openrelayproject',
    credential: 'openrelayproject',
  },
];



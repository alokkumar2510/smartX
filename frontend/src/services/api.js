const _host = window.location.hostname || '127.0.0.1';
const _apiBase = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "") : `http://${_host}:8000`;
export const API = _apiBase;
const _wsProtocol = _apiBase.startsWith("https") ? "wss:" : "ws:";
const _wsHost = _apiBase.replace(/^https?:\/\//, "");
export const WS_URL = `${_wsProtocol}//${_wsHost}`;

export const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
];

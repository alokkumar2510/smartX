'use strict';
require('dotenv').config();
const os = require('os');

/**
 * ════════════════════════════════════════════════════════
 *  Mediasoup Configuration
 *  All tunable parameters in one place.
 * ════════════════════════════════════════════════════════
 */
const config = {

  // ── HTTP / Socket.io Server ─────────────────────────────────
  http: {
    port: parseInt(process.env.PORT, 10) || 3001,
    corsOrigin: process.env.CORS_ORIGIN || '*',
  },

  // ── Auth ────────────────────────────────────────────────────
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'change_this_in_production',
    backendApiUrl: process.env.BACKEND_API_URL || 'http://localhost:8000',
  },

  // ── Mediasoup Worker ────────────────────────────────────────
  mediasoup: {
    // Spawn one worker per CPU core for maximum throughput
    numWorkers: process.env.MEDIASOUP_NUM_WORKERS
      ? parseInt(process.env.MEDIASOUP_NUM_WORKERS, 10)
      : Math.max(1, os.cpus().length),

    worker: {
      rtcMinPort: parseInt(process.env.MEDIASOUP_RTC_MIN_PORT, 10) || 40000,
      rtcMaxPort: parseInt(process.env.MEDIASOUP_RTC_MAX_PORT, 10) || 49999,
      logLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
      logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
    },

    // ── Router: Supported RTP Media Codecs ────────────────────
    router: {
      mediaCodecs: [
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2,
          parameters: {
            minptime: 10,
            useinbandfec: 1,
          },
        },
        {
          kind: 'video',
          mimeType: 'video/VP8',
          clockRate: 90000,
          parameters: {
            'x-google-start-bitrate': 1000,
          },
        },
        {
          kind: 'video',
          mimeType: 'video/VP9',
          clockRate: 90000,
          parameters: {
            'profile-id': 2,
            'x-google-start-bitrate': 1000,
          },
        },
        {
          kind: 'video',
          mimeType: 'video/h264',
          clockRate: 90000,
          parameters: {
            'packetization-mode': 1,
            'profile-level-id': '4d0032',
            'level-asymmetry-allowed': 1,
            'x-google-start-bitrate': 1000,
          },
        },
        {
          kind: 'video',
          mimeType: 'video/h264',
          clockRate: 90000,
          parameters: {
            'packetization-mode': 1,
            'profile-level-id': '42e01f',
            'level-asymmetry-allowed': 1,
            'x-google-start-bitrate': 1000,
          },
        },
      ],
    },

    // ── WebRTC Transport Settings ──────────────────────────────
    webRtcTransport: {
      listenIps: [
        {
          ip: '0.0.0.0',
          announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || '127.0.0.1',
        },
      ],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
      initialAvailableOutgoingBitrate: 1_000_000, // 1 Mbps
      minimumAvailableOutgoingBitrate: 100_000,   // 100 Kbps
      maxSctpMessageSize: 262144,
      // Bandwidth estimation
      maxIncomingBitrate: 15_000_000, // 15 Mbps max per transport
    },

    // ── Simulcast Encodings (Video) ───────────────────────────
    // Sent by client; SFU forwards layers selectively per consumer
    simulcastEncodings: [
      { maxBitrate: 100_000, scaleResolutionDownBy: 4 },  // Low  (quarter res)
      { maxBitrate: 300_000, scaleResolutionDownBy: 2 },  // Mid  (half res)
      { maxBitrate: 900_000, scaleResolutionDownBy: 1 },  // High (full res)
    ],

    // ── Audio Producer Settings ────────────────────────────────
    audioProducerOptions: {
      codecOptions: {
        opusStereo: false,
        opusDtx: true,      // Discontinuous Transmission — silence suppression
        opusFec: true,      // Forward Error Correction for packet loss
        opusMaxPlaybackRate: 48000,
      },
    },
  },
};

module.exports = config;

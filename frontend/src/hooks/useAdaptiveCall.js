/**
 * useAdaptiveCall — Adaptive WebRTC call quality based on network mode
 * Phase 3: Automatically adjusts video/audio constraints
 *
 * Features:
 *  - Degrades video resolution/framerate on medium/low network
 *  - Applies SDP bandwidth constraints
 *  - Provides quality label for UI display
 *  - Can upgrade/downgrade in real-time during an active call
 */
import { useCallback } from 'react';
import { useNetwork } from '../context/NetworkContext';

// Constraint presets per network quality
const VIDEO_PRESETS = {
  high: {
    width:     { ideal: 1280, max: 1920 },
    height:    { ideal: 720,  max: 1080 },
    frameRate: { ideal: 30,   max: 60 },
  },
  medium: {
    width:     { ideal: 640, max: 1280 },
    height:    { ideal: 360, max: 720  },
    frameRate: { ideal: 15,  max: 24   },
  },
  low: {
    width:     { ideal: 320, max: 480 },
    height:    { ideal: 240, max: 360 },
    frameRate: { ideal: 8,   max: 12  },
  },
};

const AUDIO_PRESETS = {
  high:   { echoCancellation: true, noiseSuppression: true, sampleRate: 48000 },
  medium: { echoCancellation: true, noiseSuppression: true, sampleRate: 32000 },
  low:    { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
};

const QUALITY_LABELS = {
  high:   { label: 'HD',   color: '#34d399', icon: '🟢' },
  medium: { label: 'SD',   color: '#fbbf24', icon: '🟡' },
  low:    { label: 'Low',  color: '#f87171', icon: '🔴' },
};

/**
 * Apply SDP bandwidth limits to an SDP string
 * Limits video to prevent congestion in poor conditions
 */
function applyBandwidthToSDP(sdp, mode) {
  const videoBW = mode === 'high' ? 2000 : mode === 'medium' ? 500 : 150; // kbps
  const audioBW = mode === 'high' ? 64   : mode === 'medium' ? 40  : 20;

  return sdp
    .replace(/(m=video[\s\S]*?)(a=rtcp-fb)/g,
      `$1b=AS:${videoBW}\r\n$2`)
    .replace(/(m=audio[\s\S]*?)(a=rtcp-fb)/g,
      `$1b=AS:${audioBW}\r\n$2`);
}

export function useAdaptiveCall() {
  const { mode } = useNetwork();

  /** Get getUserMedia constraints adapted to current network */
  const getAdaptiveConstraints = useCallback((callType) => {
    const audioConstraints = AUDIO_PRESETS[mode] || AUDIO_PRESETS.high;

    if (callType !== 'video') {
      return { audio: audioConstraints };
    }

    // On low network, force audio-only even for video calls
    if (mode === 'low') {
      return {
        audio: audioConstraints,
        // No video — save bandwidth
      };
    }

    return {
      audio: audioConstraints,
      video: VIDEO_PRESETS[mode] || VIDEO_PRESETS.high,
    };
  }, [mode]);

  /** Apply SDP bandwidth constraints on an RTCSessionDescription */
  const applyBandwidthConstraints = useCallback((sdp) => {
    return applyBandwidthToSDP(sdp, mode);
  }, [mode]);

  /** Dynamically change sender constraints on an active RTCPeerConnection */
  const applyToSenders = useCallback(async (pc) => {
    if (!pc) return;
    const senders = pc.getSenders();
    for (const sender of senders) {
      if (!sender.track) continue;
      const params = sender.getParameters();
      if (!params.encodings?.length) params.encodings = [{}];

      if (sender.track.kind === 'video') {
        const preset = VIDEO_PRESETS[mode] || VIDEO_PRESETS.high;
        const maxBitrate = mode === 'high' ? 2_000_000 : mode === 'medium' ? 500_000 : 150_000;
        params.encodings[0].maxBitrate    = maxBitrate;
        params.encodings[0].maxFramerate  = preset.frameRate.ideal;
        params.encodings[0].scaleResolutionDownBy =
          mode === 'high' ? 1 : mode === 'medium' ? 1.5 : 2;
      } else if (sender.track.kind === 'audio') {
        const maxBitrate = mode === 'high' ? 64_000 : mode === 'medium' ? 40_000 : 20_000;
        params.encodings[0].maxBitrate = maxBitrate;
      }

      try { await sender.setParameters(params); } catch {}
    }
  }, [mode]);

  return {
    mode,
    getAdaptiveConstraints,
    applyBandwidthConstraints,
    applyToSenders,
    qualityInfo: QUALITY_LABELS[mode] || QUALITY_LABELS.high,
    /** True when video gets auto-downgraded */
    isVideoDisabledInLow: mode === 'low',
  };
}

/**
 * ════════════════════════════════════════════════════════════════
 *  useWebRTC.js — Production-Grade P2P WebRTC Hook
 *
 *  REBUILT for maximum call stability:
 *    ✦ Persistent RTCPeerConnection stored in useRef (never re-created on render)
 *    ✦ Separated connection state vs UI state
 *    ✦ Full lifecycle: idle → ringing → connecting → active → reconnecting → ended
 *    ✦ ICE restart with exponential backoff (max 5 attempts)
 *    ✦ 45-second call timeout (auto-cancel if no answer)
 *    ✦ Speaker/earpiece audio routing via setSinkId
 *    ✦ DataChannel in-call chat
 *    ✦ RTCPeerConnection.getStats() quality monitoring
 *    ✦ Live device switching (camera / microphone / speaker)
 *    ✦ Codec preference (H.264 → VP8 fallback)
 *    ✦ Adaptive trickle ICE + candidate buffering
 *    ✦ getUserMedia with graceful fallback
 *    ✦ Guards against double-cleanup and stale closures
 *
 *  Signaling protocol (WebSocket relay — backend unchanged):
 *    Caller sends: call_offer   { sdp, call_type, target_user_id, from_username }
 *    Callee recv:  incoming_call { sdp, call_type, from_user_id, from_username }
 *    Callee sends: call_answer   { sdp, target_user_id }
 *    Caller recv:  call_accepted { sdp }
 *    Both send:    call_ice      { candidate, target_user_id }
 *    Either sends: call_end / call_reject { target_user_id }
 *
 *  ICE Restart (no backend change needed):
 *    Caller re-sends call_offer with { is_restart: true }
 *    Callee detects same-user offer while in call → treats as ICE restart
 * ════════════════════════════════════════════════════════════════
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  startRingtone, stopRingtone,
  playCallConnected, playCallEnded,
  showNotification,
} from '../sounds';
import { supabase } from '../lib/supabase';

/* ── ICE Server Config ──────────────────────────────────────────
   Priority order: STUN (free, fast) → TURN (relay fallback)
   Using multiple STUN ensures at least one is reachable globally.
────────────────────────────────────────────────────────────────── */
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
  {
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:443',
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turns:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

/* ── RTCPeerConnection Config ────────────────────────────────────
   bundlePolicy: 'max-bundle'  → single UDP connection for all media
   iceCandidatePoolSize: 10    → pre-gather candidates (faster SDP)
   rtcpMuxPolicy: 'require'   → multiplex RTCP on RTP port
────────────────────────────────────────────────────────────────── */
const PC_CONFIG = {
  iceServers: ICE_SERVERS,
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
  iceCandidatePoolSize: 10,
};

const CALL_TIMEOUT_MS      = 90000;  // Auto-cancel if no answer in 90s (extended for slow networks)
const MAX_RECONNECT        = 5;      // Max ICE restart attempts
const RECONNECT_GRACE_MS   = 8000;   // Wait before triggering ICE restart on 'disconnected'
const STATS_INTERVAL_MS    = 2000;   // Quality stats polling interval

/* ── Codec Preference ───────────────────────────────────────────
   Prefer H.264 (hardware-accelerated on most devices, lower CPU)
   Falls back to VP8 automatically if H.264 not available.
────────────────────────────────────────────────────────────────── */
function preferH264(sdp) {
  if (!sdp) return sdp;
  const lines = sdp.split('\r\n');
  const mVideoIdx = lines.findIndex(l => l.startsWith('m=video'));
  if (mVideoIdx === -1) return sdp;

  const h264Line = lines.find(l =>
    l.startsWith('a=rtpmap:') && l.toLowerCase().includes('h264')
  );
  if (!h264Line) return sdp;

  const pt = h264Line.match(/a=rtpmap:(\d+)/)?.[1];
  if (!pt) return sdp;

  const mParts = lines[mVideoIdx].split(' ');
  if (mParts.length < 4) return sdp;

  const others = mParts.slice(3).filter(p => p.trim() !== pt.trim());
  lines[mVideoIdx] = [...mParts.slice(0, 3), pt, ...others].join(' ');
  return lines.join('\r\n');
}

/* ── Persist call history to Supabase ───────────────────────────*/
async function saveCallRecord({ fromId, toId, callType, duration, status }) {
  try {
    await supabase.from('call_history').insert({
      caller_id: fromId,
      callee_id: toId,
      call_type: callType || 'voice',
      duration: duration || 0,
      status: status || 'ended',
    });
  } catch (_) {
    // Table might not exist yet — silent fail
  }
}

/* ════════════════════════════════════════════════════════════════
   Hook: useWebRTC
   Production-grade P2P calling with full lifecycle management.
════════════════════════════════════════════════════════════════ */
export function useWebRTC(currentUser, _token, ws) {

  // ── Call State ────────────────────────────────────────────────
  const [callState, setCallState] = useState(null);
  /*  callState shape:
      { status: 'ringing'|'incoming'|'connecting'|'active'|'reconnecting',
        type:   'voice'|'video',
        userId:  number,
        username: string,
        sdp?:    RTCSessionDescriptionInit (stored for acceptCall) }
  */

  // ── Media State ───────────────────────────────────────────────
  const [localStream, setLocalStream]       = useState(null);
  const [remoteStreams, setRemoteStreams]    = useState(new Map());
  const [isMuted, setIsMuted]               = useState(false);
  const [isCameraOff, setIsCameraOff]       = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn]       = useState(true);  // Default: speaker on

  // ── Connection Quality ────────────────────────────────────────
  const [connectionQuality, setConnectionQuality] = useState({
    rtt: 0,
    packetLoss: 0,
    bitrate: 0,
    iceState: 'new',
    connState: 'new',
    quality: 'good',
  });

  // ── DataChannel Messages ──────────────────────────────────────
  const [dataMessages, setDataMessages] = useState([]);

  // ── Available Devices ─────────────────────────────────────────
  const [availableDevices, setAvailableDevices] = useState({
    cameras:      [],
    microphones:  [],
    speakers:     [],
  });

  // ── Refs (persist across renders — NEVER recreate) ────────────
  const pcRef               = useRef(null);     // RTCPeerConnection
  const localStreamRef      = useRef(null);
  const screenTrackRef      = useRef(null);
  const callStateRef        = useRef(null);
  const callStartRef        = useRef(null);
  const wsRef               = useRef(ws);
  const pendingIceRef       = useRef([]);       // ICE candidates buffered before remote SDP
  const dataChannelRef      = useRef(null);     // RTCDataChannel
  const statsTimerRef       = useRef(null);
  const reconnectTimerRef   = useRef(null);
  const callTimeoutRef      = useRef(null);     // Auto-cancel timer
  const reconnectAttemptRef = useRef(0);
  const isPoliteRef         = useRef(false);    // false=caller, true=callee
  const lastBytesRef        = useRef({ sent: 0, received: 0, time: Date.now() });
  const cleanupGuardRef     = useRef(false);    // Prevent double cleanup
  const currentUserRef      = useRef(currentUser);

  // Keep refs in sync — ONLY update when value is non-null
  useEffect(() => { if (ws) wsRef.current = ws; }, [ws]);
  useEffect(() => { callStateRef.current = callState; }, [callState]);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  // ── Device Enumeration ────────────────────────────────────────
  const refreshDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAvailableDevices({
        cameras:      devices.filter(d => d.kind === 'videoinput'),
        microphones:  devices.filter(d => d.kind === 'audioinput'),
        speakers:     devices.filter(d => d.kind === 'audiooutput'),
      });
    } catch (_) {}
  }, []);

  useEffect(() => {
    refreshDevices();
    navigator.mediaDevices?.addEventListener?.('devicechange', refreshDevices);
    return () => navigator.mediaDevices?.removeEventListener?.('devicechange', refreshDevices);
  }, [refreshDevices]);

  // ── WebSocket sender with retry ───────────────────────────────
  // Retries up to 3 times with 500ms backoff if socket not yet OPEN.
  // This prevents offer/answer messages being silently dropped when
  // the socket connects slightly after initiateCall is called.
  const wsSend = useCallback((payload, retries = 3) => {
    const socket = wsRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
      console.debug('[WebRTC] WS sent:', payload.type);
      return true;
    }
    if (retries > 0) {
      console.warn(`[WebRTC] WS not open (${socket?.readyState ?? 'null'}) – retrying in 500ms for:`, payload.type);
      setTimeout(() => wsSend(payload, retries - 1), 500);
      return false;
    }
    console.error('[WebRTC] WS not open after retries – dropped:', payload.type);
    return false;
  }, []);

  // ── getStats() Quality Monitor ────────────────────────────────
  const startStatsMonitor = useCallback((pc) => {
    if (statsTimerRef.current) clearInterval(statsTimerRef.current);
    lastBytesRef.current = { sent: 0, received: 0, time: Date.now() };

    statsTimerRef.current = setInterval(async () => {
      if (!pc || pc.connectionState === 'closed') {
        clearInterval(statsTimerRef.current);
        statsTimerRef.current = null;
        return;
      }
      try {
        const stats = await pc.getStats();
        let rtt = 0, packetsLost = 0, totalPackets = 0, bytesSent = 0;

        stats.forEach(report => {
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            rtt = Math.round((report.currentRoundTripTime || 0) * 1000);
          }
          if (report.type === 'inbound-rtp' && !report.isRemote) {
            packetsLost  += report.packetsLost   || 0;
            totalPackets += (report.packetsReceived || 0) + (report.packetsLost || 0);
          }
          if (report.type === 'outbound-rtp' && !report.isRemote) {
            bytesSent += report.bytesSent || 0;
          }
        });

        const now     = Date.now();
        const elapsed = (now - lastBytesRef.current.time) / 1000;
        const bitrate = elapsed > 0
          ? Math.round(((bytesSent - lastBytesRef.current.sent) * 8) / elapsed / 1000)
          : 0;
        lastBytesRef.current = { sent: bytesSent, time: now };

        const packetLoss = totalPackets > 0
          ? Math.round((packetsLost / totalPackets) * 1000) / 10
          : 0;

        const quality =
          rtt < 120  && packetLoss < 2  ? 'good' :
          rtt < 350  && packetLoss < 10 ? 'fair' : 'poor';

        setConnectionQuality({
          rtt, packetLoss, bitrate,
          iceState:  pc.iceConnectionState,
          connState: pc.connectionState,
          quality,
        });
      } catch (_) {}
    }, STATS_INTERVAL_MS);
  }, []);

  const stopStatsMonitor = useCallback(() => {
    if (statsTimerRef.current) {
      clearInterval(statsTimerRef.current);
      statsTimerRef.current = null;
    }
    setConnectionQuality({
      rtt: 0, packetLoss: 0, bitrate: 0,
      iceState: 'new', connState: 'new', quality: 'good',
    });
  }, []);

  // ── DataChannel Setup ─────────────────────────────────────────
  const setupDataChannel = useCallback((channel) => {
    channel.binaryType = 'arraybuffer';
    channel.onopen  = () => console.info('[WebRTC] DataChannel open');
    channel.onclose = () => console.info('[WebRTC] DataChannel closed');
    channel.onerror = (e) => console.warn('[WebRTC] DataChannel error:', e);
    channel.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        setDataMessages(prev => [...prev, { ...msg, received: true }]);
      } catch (_) {}
    };
    dataChannelRef.current = channel;
  }, []);

  // ── Clear Call Timeout ────────────────────────────────────────
  const clearCallTimeout = useCallback(() => {
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
  }, []);

  // ── Cleanup (GUARDED against double-invocation) ───────────────
  const cleanup = useCallback((opts = {}) => {
    // Guard: prevent double cleanup
    if (cleanupGuardRef.current) return;
    cleanupGuardRef.current = true;

    // Clear all timers
    stopStatsMonitor();
    clearCallTimeout();

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    reconnectAttemptRef.current = 0;

    // Close DataChannel
    if (dataChannelRef.current) {
      try { dataChannelRef.current.close(); } catch (_) {}
      dataChannelRef.current = null;
    }

    // Stop all local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => {
        try { t.stop(); } catch (_) {}
      });
      localStreamRef.current = null;
    }
    setLocalStream(null);

    // Stop screen sharing track
    if (screenTrackRef.current) {
      try { screenTrackRef.current.stop(); } catch (_) {}
      screenTrackRef.current = null;
    }
    setIsScreenSharing(false);

    // Close PeerConnection
    if (pcRef.current) {
      // Remove all event handlers first to prevent callbacks during close
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.ondatachannel = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.oniceconnectionstatechange = null;
      pcRef.current.onicegatheringstatechange = null;
      pcRef.current.onnegotiationneeded = null;
      try { pcRef.current.close(); } catch (_) {}
      pcRef.current = null;
    }

    // Reset state
    setRemoteStreams(new Map());
    setDataMessages([]);
    pendingIceRef.current = [];

    if (!opts.keepState) {
      setCallState(null);
      setIsMuted(false);
      setIsCameraOff(false);
      setIsSpeakerOn(true);
    }

    // Release guard after a tick (allows re-invocation on next call)
    setTimeout(() => { cleanupGuardRef.current = false; }, 100);
  }, [stopStatsMonitor, clearCallTimeout]);

  // ── ICE Restart (auto-reconnect) ──────────────────────────────
  const attemptIceRestart = useCallback(async () => {
    const cs = callStateRef.current;
    const pc = pcRef.current;
    if (!cs || !pc || pc.connectionState === 'closed') return;

    reconnectAttemptRef.current++;
    if (reconnectAttemptRef.current > MAX_RECONNECT) {
      console.warn('[WebRTC] ICE restart: max attempts reached — ending call');
      wsSend({ type: 'call_end', target_user_id: cs.userId });
      stopRingtone();
      cleanup();
      playCallEnded();
      return;
    }

    console.info(`[WebRTC] ICE restart attempt ${reconnectAttemptRef.current}/${MAX_RECONNECT}`);
    setCallState(prev => prev ? { ...prev, status: 'reconnecting' } : prev);

    // Only the caller (non-polite) makes offers to avoid glare
    if (!isPoliteRef.current) {
      try {
        const offer = await pc.createOffer({ iceRestart: true });
        offer.sdp = preferH264(offer.sdp);
        await pc.setLocalDescription(offer);
        wsSend({
          type: 'call_offer',
          target_user_id: cs.userId,
          sdp: pc.localDescription,
          call_type: cs.type,
          from_username: currentUserRef.current?.username,
          is_restart: true,
        });
      } catch (err) {
        console.error('[WebRTC] ICE restart offer failed:', err);
        // Retry after exponential backoff
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 16000);
        reconnectTimerRef.current = setTimeout(() => attemptIceRestart(), delay);
      }
    }
  }, [wsSend, cleanup]);

  // ── Create RTCPeerConnection ──────────────────────────────────
  const createPC = useCallback((targetUserId) => {
    // Guard: close any existing PC first
    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.ondatachannel = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.oniceconnectionstatechange = null;
      try { pcRef.current.close(); } catch (_) {}
    }

    const pc = new RTCPeerConnection(PC_CONFIG);

    // Trickle ICE — send candidates as discovered
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        wsSend({
          type: 'call_ice',
          target_user_id: targetUserId,
          candidate: candidate.toJSON(),
        });
      }
    };

    pc.onicegatheringstatechange = () =>
      console.info('[WebRTC] ICE gathering:', pc.iceGatheringState);

    // Remote tracks → build MediaStream
    let remoteStream = new MediaStream();
    pc.ontrack = ({ track, streams }) => {
      console.info('[WebRTC] Remote track received:', track.kind);
      const src = streams?.[0];

      // Ensure tracks stay alive when re-added
      track.onended = () => console.warn('[WebRTC] Remote track ended:', track.kind);
      track.onmute = () => console.warn('[WebRTC] Remote track muted:', track.kind);
      track.onunmute = () => console.info('[WebRTC] Remote track unmuted:', track.kind);

      if (src) {
        setRemoteStreams(new Map([[String(targetUserId), src]]));
      } else {
        remoteStream.addTrack(track);
        setRemoteStreams(new Map([[String(targetUserId), remoteStream]]));
      }
    };

    // DataChannel from callee side
    pc.ondatachannel = ({ channel }) => setupDataChannel(channel);

    // ═══ Connection State Machine ═══════════════════════════════
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.info('[WebRTC] Connection state:', state);

      switch (state) {
        case 'connected':
          reconnectAttemptRef.current = 0;
          // Clear any pending reconnect timer
          if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
          }
          // Clear call timeout (call was answered)
          clearCallTimeout();
          callStartRef.current = callStartRef.current || Date.now();
          startStatsMonitor(pc);
          playCallConnected();
          setCallState(prev => prev ? { ...prev, status: 'active' } : prev);
          refreshDevices();
          break;

        case 'disconnected':
          // IMPORTANT: 'disconnected' is TRANSIENT — often self-heals
          // Show reconnecting UI but DO NOT destroy the call
          setCallState(prev => prev ? { ...prev, status: 'reconnecting' } : prev);
          if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = setTimeout(() => {
            // Check if still disconnected after grace period
            if (pcRef.current?.connectionState === 'disconnected') {
              console.info('[WebRTC] Still disconnected after grace period — ICE restart');
              attemptIceRestart();
            } else if (pcRef.current?.connectionState === 'connected') {
              // Self-healed
              setCallState(prev => prev ? { ...prev, status: 'active' } : prev);
            }
          }, RECONNECT_GRACE_MS);
          break;

        case 'failed':
          // Hard failure — attempt ICE restart immediately
          if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
          attemptIceRestart();
          break;

        case 'closed':
          // Only clean up if there is no pending reconnect
          if (!reconnectTimerRef.current && reconnectAttemptRef.current === 0) {
            // Don't call cleanup here — it will be called by endCall/rejectCall
          }
          break;

        default:
          break;
      }
    };

    pc.oniceconnectionstatechange = () =>
      console.info('[WebRTC] ICE connection:', pc.iceConnectionState);

    pcRef.current = pc;
    return pc;
  }, [wsSend, setupDataChannel, startStatsMonitor, refreshDevices, attemptIceRestart, clearCallTimeout]);

  // ── Get Local Media ───────────────────────────────────────────
  const getLocalStream = useCallback(async (callType, deviceIds = {}) => {
    const audio = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl:  true,
      sampleRate:       48000,
      channelCount:     1,
      ...(deviceIds.microphone ? { deviceId: { exact: deviceIds.microphone } } : {}),
    };

    const video = callType === 'video' ? {
      width:     { ideal: 1280, max: 1920 },
      height:    { ideal: 720,  max: 1080 },
      frameRate: { ideal: 30,   max: 60   },
      facingMode: 'user',
      ...(deviceIds.camera ? { deviceId: { exact: deviceIds.camera } } : {}),
    } : false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio, video });
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error('[WebRTC] getUserMedia failed:', err.name, err.message);

      // Fallback: try audio-only if video failed
      if (callType === 'video' && err.name === 'NotAllowedError') {
        console.warn('[WebRTC] Camera denied — falling back to audio-only');
        try {
          const audioOnly = await navigator.mediaDevices.getUserMedia({ audio, video: false });
          localStreamRef.current = audioOnly;
          setLocalStream(audioOnly);
          return audioOnly;
        } catch (audioErr) {
          console.error('[WebRTC] Audio-only fallback also failed:', audioErr);
          throw audioErr;
        }
      }
      throw err;
    }
  }, []);

  // ── Drain buffered ICE candidates ─────────────────────────────
  const drainPendingIce = useCallback(async (pc) => {
    const pending = [...pendingIceRef.current];
    pendingIceRef.current = [];
    for (const c of pending) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      } catch (err) {
        console.warn('[WebRTC] Failed to add buffered ICE candidate:', err.message);
      }
    }
  }, []);

  // ═════════════════════════════════════════════════════════════
  //  PUBLIC API — Call lifecycle
  // ═════════════════════════════════════════════════════════════

  /** Start an outgoing call */
  const initiateCall = useCallback(async (targetUserId, targetUsername, callType = 'voice') => {
    if (callStateRef.current) {
      console.warn('[WebRTC] Already in a call');
      return;
    }

    cleanupGuardRef.current = false; // Reset guard
    isPoliteRef.current = false;     // caller = not polite

    // ── PERMISSION CHECK BEFORE UI ──────────────────────────────
    // Request camera/mic permission BEFORE showing the call UI.
    // This prevents the call modal from opening if the user denies access.
    try {
      const constraints = {
        audio: true,
        video: callType === 'video',
      };
      await navigator.mediaDevices.getUserMedia(constraints).then(s => {
        // Immediately stop the probe stream — getLocalStream will re-acquire properly
        s.getTracks().forEach(t => t.stop());
      });
    } catch (permErr) {
      console.warn('[WebRTC] Permission denied before call start:', permErr.name);
      const errorMsg = permErr.name === 'NotAllowedError'
        ? `${callType === 'video' ? 'Camera/microphone' : 'Microphone'} access denied. Please allow permissions in your browser settings and try again.`
        : permErr.name === 'NotFoundError'
        ? 'No camera or microphone found on this device.'
        : `Cannot start call: ${permErr.message || 'Permission error'}`;
      // Show a transient error state (no call modal, just a brief error indicator)
      setCallState({ status: 'error', type: callType, userId: targetUserId, username: targetUsername, errorMsg });
      setTimeout(() => setCallState(null), 5000);
      return; // Abort — do NOT open call UI
    }
    // ────────────────────────────────────────────────────────────

    // Show ringing state — permissions are granted at this point
    setCallState({ status: 'ringing', type: callType, userId: targetUserId, username: targetUsername });
    startRingtone();

    // Set call timeout — auto-cancel if no answer
    clearCallTimeout();
    callTimeoutRef.current = setTimeout(() => {
      const cs = callStateRef.current;
      if (cs && (cs.status === 'ringing' || cs.status === 'connecting')) {
        console.info('[WebRTC] Call timeout — no answer');
        stopRingtone();
        wsSend({ type: 'call_end', target_user_id: targetUserId });
        cleanup();
        playCallEnded();
      }
    }, CALL_TIMEOUT_MS);

    try {
      const stream = await getLocalStream(callType);
      const pc     = createPC(targetUserId);

      // Create DataChannel BEFORE offer (caller side)
      const dc = pc.createDataChannel('chat', { ordered: true });
      setupDataChannel(dc);

      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      const offer = await pc.createOffer();
      offer.sdp = preferH264(offer.sdp);
      await pc.setLocalDescription(offer);

      wsSend({
        type: 'call_offer',
        target_user_id: targetUserId,
        sdp: pc.localDescription,
        call_type: callType,
        from_username: currentUserRef.current?.username,
      });

    } catch (err) {
      console.error('[WebRTC] initiateCall error:', err);
      stopRingtone();
      clearCallTimeout();
      // Show error state instead of silently closing — this way the user
      // can see WHY the call failed (e.g., camera permission denied)
      const errorMsg = err.name === 'NotAllowedError'
        ? 'Camera/microphone access denied. Please allow permissions and try again.'
        : err.name === 'NotFoundError'
        ? 'No camera or microphone found on this device.'
        : `Call failed: ${err.message || 'Unknown error'}`;
      setCallState(prev => prev ? { ...prev, status: 'error', errorMsg } : null);
      // Auto-dismiss error state after 4s
      setTimeout(() => {
        setCallState(prev => prev?.status === 'error' ? null : prev);
        cleanup();
      }, 4000);
    }
  }, [getLocalStream, createPC, setupDataChannel, wsSend, cleanup, clearCallTimeout]);

  /** Accept an incoming call */
  const acceptCall = useCallback(async () => {
    const cs = callStateRef.current;
    if (!cs || cs.status !== 'incoming') return;
    stopRingtone();
    isPoliteRef.current = true; // callee = polite
    cleanupGuardRef.current = false;

    try {
      setCallState(prev => prev ? { ...prev, status: 'connecting' } : prev);

      const stream = await getLocalStream(cs.type);
      const pc     = createPC(cs.userId);

      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      if (cs.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(cs.sdp));
        await drainPendingIce(pc);
      }

      const answer = await pc.createAnswer();
      answer.sdp = preferH264(answer.sdp);
      await pc.setLocalDescription(answer);

      wsSend({ type: 'call_answer', target_user_id: cs.userId, sdp: pc.localDescription });

    } catch (err) {
      console.error('[WebRTC] acceptCall error:', err);
      cleanup();
    }
  }, [getLocalStream, createPC, wsSend, cleanup, drainPendingIce]);

  /** Reject an incoming call */
  const rejectCall = useCallback(() => {
    const cs = callStateRef.current;
    if (!cs) return;
    stopRingtone();
    wsSend({ type: 'call_reject', target_user_id: cs.userId });
    cleanup();
    playCallEnded();
  }, [wsSend, cleanup]);

  /** End an active call */
  const endCall = useCallback(async () => {
    const cs = callStateRef.current;
    if (!cs) return;
    stopRingtone();
    clearCallTimeout();
    wsSend({ type: 'call_end', target_user_id: cs.userId });

    // Save call history if call was active
    if (cs.status === 'active' && callStartRef.current) {
      const duration = Math.floor((Date.now() - callStartRef.current) / 1000);
      saveCallRecord({
        fromId:   currentUserRef.current?.id,
        toId:     cs.userId,
        callType: cs.type,
        duration,
        status:   'ended',
      });
      callStartRef.current = null;
    }

    cleanup();
    playCallEnded();
  }, [wsSend, cleanup, clearCallTimeout]);

  // ─── Media controls ────────────────────────────────────────

  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsMuted(prev => !prev);
  }, []);

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsCameraOff(prev => !prev);
  }, []);

  /** Toggle speaker/earpiece audio output */
  const toggleSpeaker = useCallback(async () => {
    // setSinkId is supported in Chrome/Edge, partially in Firefox
    const remoteMap = remoteStreams;
    const newSpeakerState = !isSpeakerOn;

    // Try to find all <audio> and <video> elements playing remote streams
    try {
      const mediaElements = document.querySelectorAll('video, audio');
      for (const el of mediaElements) {
        if (typeof el.setSinkId === 'function') {
          const speakers = availableDevices.speakers;
          if (speakers.length > 1) {
            // Switch between default and the non-default speaker
            const targetDevice = newSpeakerState
              ? speakers.find(d => d.deviceId === 'default') || speakers[0]
              : speakers.find(d => d.deviceId !== 'default') || speakers[speakers.length - 1];
            await el.setSinkId(targetDevice.deviceId);
          }
        }
      }
    } catch (err) {
      console.warn('[WebRTC] setSinkId not supported:', err.message);
    }

    setIsSpeakerOn(newSpeakerState);
  }, [isSpeakerOn, remoteStreams, availableDevices.speakers]);

  const toggleScreenShare = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) return;

    if (isScreenSharing) {
      screenTrackRef.current?.stop();
      screenTrackRef.current = null;
      const camTrack = localStreamRef.current?.getVideoTracks()[0];
      if (camTrack) {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        await sender?.replaceTrack(camTrack).catch(() => {});
      }
      setIsScreenSharing(false);
    } else {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
          alert('Screen sharing is not supported on this device/browser.');
          return;
        }

        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: 30, cursor: 'always' },
          audio: false,
        });
        const screenTrack = screenStream.getVideoTracks()[0];
        screenTrackRef.current = screenTrack;

        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          await sender.replaceTrack(screenTrack);
        } else {
          // If audio-only call originally, add track and manually trigger renegotiation
          pc.addTrack(screenTrack, localStreamRef.current || new MediaStream());
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            const cs = callStateRef.current;
            wsSend({
              type: 'call_offer',
              target_user_id: cs?.userId,
              sdp: pc.localDescription,
              call_type: 'video',
              from_username: currentUserRef.current?.username,
              is_restart: true, // Reuse the ICE restart handler on remote
            });
            // Update UI to video
            setCallState(prev => prev ? { ...prev, type: 'video' } : prev);
          } catch(e) {
            console.warn('[WebRTC] Renegotiation for screenshare failed:', e);
          }
        }

        screenTrack.onended = () => {
          if (pcRef.current) {
            const camTrack = localStreamRef.current?.getVideoTracks()[0];
            if (camTrack) {
              const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
              sender?.replaceTrack(camTrack).catch(() => {});
            }
            setIsScreenSharing(false);
            screenTrackRef.current = null;
          }
        };
        setIsScreenSharing(true);
      } catch (err) {
        console.warn('[WebRTC] Screen share cancelled/failed:', err);
        if (err.name !== 'NotAllowedError') {
          alert('Screen sharing failed or is unsupported on this device.');
        }
      }
    }
  }, [isScreenSharing, wsSend]);

  // ─── Device switching ──────────────────────────────────────

  const switchCamera = useCallback(async (deviceId) => {
    const pc     = pcRef.current;
    const stream = localStreamRef.current;
    if (!stream) return;
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      const newTrack = newStream.getVideoTracks()[0];

      stream.getVideoTracks().forEach(t => { t.stop(); stream.removeTrack(t); });
      stream.addTrack(newTrack);
      localStreamRef.current = stream;
      setLocalStream(new MediaStream(stream.getTracks()));

      if (pc) {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        await sender?.replaceTrack(newTrack).catch(() => {});
      }
    } catch (err) {
      console.error('[WebRTC] Camera switch failed:', err);
    }
  }, []);

  const switchMicrophone = useCallback(async (deviceId) => {
    const pc     = pcRef.current;
    const stream = localStreamRef.current;
    if (!stream) return;
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: deviceId },
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      const newTrack = newStream.getAudioTracks()[0];

      stream.getAudioTracks().forEach(t => { t.stop(); stream.removeTrack(t); });
      stream.addTrack(newTrack);
      localStreamRef.current = stream;
      setLocalStream(new MediaStream(stream.getTracks()));

      if (pc) {
        const sender = pc.getSenders().find(s => s.track?.kind === 'audio');
        await sender?.replaceTrack(newTrack).catch(() => {});
      }
    } catch (err) {
      console.error('[WebRTC] Microphone switch failed:', err);
    }
  }, []);

  /** Switch speaker output device */
  const switchSpeaker = useCallback(async (deviceId) => {
    try {
      const mediaElements = document.querySelectorAll('video, audio');
      for (const el of mediaElements) {
        if (typeof el.setSinkId === 'function') {
          await el.setSinkId(deviceId);
        }
      }
    } catch (err) {
      console.warn('[WebRTC] Speaker switch failed:', err);
    }
  }, []);

  // ─── DataChannel message sender ───────────────────────────

  const sendDataMessage = useCallback((text) => {
    const dc = dataChannelRef.current;
    if (!dc || dc.readyState !== 'open') {
      console.warn('[WebRTC] DataChannel not open');
      return false;
    }
    const msg = { text, from: currentUserRef.current?.username, ts: Date.now() };
    try {
      dc.send(JSON.stringify(msg));
      setDataMessages(prev => [...prev, { ...msg, received: false }]);
      return true;
    } catch (err) {
      console.error('[WebRTC] DataChannel send error:', err);
      return false;
    }
  }, []);

  // ═════════════════════════════════════════════════════════════
  //  WebSocket Signaling Handler
  // ═════════════════════════════════════════════════════════════
  const handleWsMessage = useCallback(async (event) => {
    let msg;
    try { msg = JSON.parse(event.data || event); } catch { return; }
    const { type } = msg;

    // ── Incoming call ─────────────────────────────────────────
    if (type === 'incoming_call') {
      const cs = callStateRef.current;

      // ICE RESTART: same user sends a new offer while we're in the call
      if (cs && cs.userId === msg.from_user_id && msg.is_restart) {
        const pc = pcRef.current;
        if (pc && msg.sdp) {
          try {
            console.info('[WebRTC] Handling ICE restart from caller');
            await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
            await drainPendingIce(pc);
            const answer = await pc.createAnswer();
            answer.sdp = preferH264(answer.sdp);
            await pc.setLocalDescription(answer);
            wsSend({ type: 'call_answer', target_user_id: msg.from_user_id, sdp: pc.localDescription });
          } catch (err) {
            console.error('[WebRTC] ICE restart answer error:', err);
          }
        }
        return;
      }

      // Already in a call with someone else → auto-reject
      if (cs) {
        wsSend({ type: 'call_reject', target_user_id: msg.from_user_id });
        return;
      }

      startRingtone();
      setCallState({
        status:   'incoming',
        type:     msg.call_type || 'voice',
        userId:   msg.from_user_id,
        username: msg.from_username,
        sdp:      msg.sdp,
      });
      showNotification(
        `📞 Incoming ${msg.call_type === 'video' ? 'video' : 'voice'} call`,
        { body: `from ${msg.from_username}` }
      );

      // Vibrate on mobile
      try { navigator.vibrate?.([200, 100, 200, 100, 200]); } catch (_) {}
      return;
    }

    // ── Call accepted (caller gets answer) ────────────────────
    if (type === 'call_accepted' || type === 'call_answer') {
      stopRingtone();
      clearCallTimeout();
      const pc = pcRef.current;
      if (!pc) return;
      try {
        if (msg.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          await drainPendingIce(pc);
        }
        setCallState(prev => prev ? { ...prev, status: 'connecting' } : prev);
      } catch (err) {
        console.error('[WebRTC] setRemoteDescription (answer) failed:', err);
      }
      return;
    }

    // ── ICE candidate ─────────────────────────────────────────
    if (type === 'call_ice') {
      const pc        = pcRef.current;
      const candidate = msg.candidate;
      if (!candidate) return;
      if (pc?.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn('[WebRTC] addIceCandidate error:', err.message);
        }
      } else {
        // Buffer until remote description is set
        pendingIceRef.current.push(candidate);
      }
      return;
    }

    // ── Call rejected ─────────────────────────────────────────
    if (type === 'call_rejected') {
      stopRingtone();
      clearCallTimeout();
      cleanup();
      playCallEnded();
      return;
    }

    // ── Call ended by remote ──────────────────────────────────
    if (type === 'call_ended') {
      stopRingtone();
      clearCallTimeout();
      if (callStateRef.current?.status === 'active' && callStartRef.current) {
        const duration = Math.floor((Date.now() - callStartRef.current) / 1000);
        saveCallRecord({
          fromId:   currentUserRef.current?.id,
          toId:     callStateRef.current?.userId,
          callType: callStateRef.current?.type,
          duration,
          status:   'ended',
        });
        callStartRef.current = null;
      }
      cleanup();
      playCallEnded();
      return;
    }
  }, [cleanup, drainPendingIce, wsSend, clearCallTimeout]);

  // ── Attach / re-attach WS listener ───────────────────────────
  useEffect(() => {
    const socket = ws;
    if (!socket) return;
    socket.addEventListener('message', handleWsMessage);
    return () => socket.removeEventListener('message', handleWsMessage);
  }, [ws, handleWsMessage]);

  // ── Cleanup on unmount (NOT on ws change) ─────────────────────
  useEffect(() => {
    return () => {
      cleanupGuardRef.current = false; // Allow cleanup on unmount
      // Stop all timers
      if (statsTimerRef.current) clearInterval(statsTimerRef.current);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
      // Stop all tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => { try { t.stop(); } catch (_) {} });
      }
      if (screenTrackRef.current) {
        try { screenTrackRef.current.stop(); } catch (_) {}
      }
      // Close peer connection
      if (pcRef.current) {
        pcRef.current.onicecandidate = null;
        pcRef.current.ontrack = null;
        pcRef.current.onconnectionstatechange = null;
        pcRef.current.oniceconnectionstatechange = null;
        pcRef.current.ondatachannel = null;
        try { pcRef.current.close(); } catch (_) {}
      }
      // Close data channel
      if (dataChannelRef.current) {
        try { dataChannelRef.current.close(); } catch (_) {}
      }
      stopRingtone();
    };
  }, []);

  return {
    // ── Backward-compatible API ──────────────────────────────
    callState,
    localStream,
    remoteStreams,
    isMuted,
    isCameraOff,
    isScreenSharing,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMic,
    toggleCamera,
    toggleScreenShare,

    // ── Enhanced capabilities ────────────────────────────────
    isSpeakerOn,             // boolean
    toggleSpeaker,           // () => Promise
    connectionQuality,       // { rtt, packetLoss, bitrate, quality }
    dataMessages,            // [{ text, from, ts, received }]
    sendDataMessage,         // (text) => boolean
    availableDevices,        // { cameras: [], microphones: [], speakers: [] }
    switchCamera,            // (deviceId) => Promise
    switchMicrophone,        // (deviceId) => Promise
    switchSpeaker,           // (deviceId) => Promise
  };
}

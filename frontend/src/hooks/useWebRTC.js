/**
 * ════════════════════════════════════════════════════════════════
 *  useWebRTC.js — Pure P2P WebRTC Hook (Mediasoup-free)
 *
 *  Drop-in replacement for useMediasoup with extra capabilities:
 *    ✦ ICE restart / auto-reconnect (max 3 attempts)
 *    ✦ DataChannel in-call chat (no WebSocket)
 *    ✦ RTCPeerConnection.getStats() quality monitoring
 *    ✦ Live device switching (camera / microphone)
 *    ✦ Codec preference (H.264 → VP8 fallback)
 *    ✦ Adaptive trickle ICE + candidate buffering
 *    ✦ Clean state machine: idle→ringing/incoming→connecting→active
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
  // Google STUN (most reliable public STUN servers)
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  // Twilio STUN (fallback)
  { urls: 'stun:global.stun.twilio.com:3478' },
  // Free TURN — Open Relay Project (only used if STUN fails)
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
   rtcpMuxPolicy: 'require'   → multiplex RTCP on RTP port (fewer NAT holes)
────────────────────────────────────────────────────────────────── */
const PC_CONFIG = {
  iceServers: ICE_SERVERS,
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
  iceCandidatePoolSize: 10,
};

/* ── Codec Preference ───────────────────────────────────────────
   Prefer H.264 (hardware-accelerated on most devices, lower CPU)
   Falls back to VP8 automatically if H.264 not available.
────────────────────────────────────────────────────────────────── */
function preferH264(sdp) {
  if (!sdp) return sdp;
  const lines = sdp.split('\r\n');
  const mVideoIdx = lines.findIndex(l => l.startsWith('m=video'));
  if (mVideoIdx === -1) return sdp;

  // Find H264 payload type
  const h264Line = lines.find(l =>
    l.startsWith('a=rtpmap:') && l.toLowerCase().includes('h264')
  );
  if (!h264Line) return sdp; // not available, keep original

  const pt = h264Line.match(/a=rtpmap:(\d+)/)?.[1];
  if (!pt) return sdp;

  const mParts = lines[mVideoIdx].split(' ');
  if (mParts.length < 4) return sdp;

  // Move H264 payload type to front
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
   Provides identical API to useMediasoup + new capabilities.
════════════════════════════════════════════════════════════════ */
export function useWebRTC(currentUser, _token, ws) {

  // ── Existing State (backward-compatible) ─────────────────────
  const [callState, setCallState] = useState(null);
  /*  callState shape:
      { status: 'ringing'|'incoming'|'connecting'|'active'|'reconnecting',
        type:   'voice'|'video',
        userId:  number,
        username: string,
        sdp?:    RTCSessionDescriptionInit  (stored for acceptCall) }
  */
  const [localStream, setLocalStream]       = useState(null);
  const [remoteStreams, setRemoteStreams]    = useState(new Map());
  const [isMuted, setIsMuted]               = useState(false);
  const [isCameraOff, setIsCameraOff]       = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // ── New State ─────────────────────────────────────────────────
  const [connectionQuality, setConnectionQuality] = useState({
    rtt: 0,           // round-trip time in ms
    packetLoss: 0,    // packet loss %
    bitrate: 0,       // outbound kbps
    iceState: 'new',
    connState: 'new',
    quality: 'good',  // 'good' | 'fair' | 'poor'
  });
  const [dataMessages, setDataMessages]         = useState([]);
  const [availableDevices, setAvailableDevices] = useState({
    cameras:      [],
    microphones:  [],
  });

  // ── Refs ───────────────────────────────────────────────────────
  const pcRef               = useRef(null);   // RTCPeerConnection
  const localStreamRef      = useRef(null);
  const screenTrackRef      = useRef(null);
  const callStateRef        = useRef(null);
  const callStartRef        = useRef(null);
  const wsRef               = useRef(ws);
  const pendingIceRef       = useRef([]);     // ICE candidates buffered before remote SDP
  const dataChannelRef      = useRef(null);   // RTCDataChannel
  const statsTimerRef       = useRef(null);
  const reconnectTimerRef   = useRef(null);
  const reconnectAttemptRef = useRef(0);
  const isPoliteRef         = useRef(false);  // false=caller, true=callee (perfect negotiation)
  const lastBytesRef        = useRef({ sent: 0, received: 0, time: Date.now() });

  // Keep refs in sync
  useEffect(() => { wsRef.current = ws; }, [ws]);
  useEffect(() => { callStateRef.current = callState; }, [callState]);

  // ── Device Enumeration ────────────────────────────────────────
  const refreshDevices = useCallback(async () => {
    try {
      // Need permission before labels appear
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAvailableDevices({
        cameras:     devices.filter(d => d.kind === 'videoinput'),
        microphones: devices.filter(d => d.kind === 'audioinput'),
      });
    } catch (_) {}
  }, []);

  useEffect(() => {
    refreshDevices();
    navigator.mediaDevices.addEventListener?.('devicechange', refreshDevices);
    return () => navigator.mediaDevices.removeEventListener?.('devicechange', refreshDevices);
  }, [refreshDevices]);

  // ── WebSocket sender ──────────────────────────────────────────
  const wsSend = useCallback((payload) => {
    const socket = wsRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
      return true;
    }
    console.warn('[WebRTC] WS not open – skipped:', payload.type);
    return false;
  }, []);

  // ── getStats() Quality Monitor ────────────────────────────────
  const startStatsMonitor = useCallback((pc) => {
    if (statsTimerRef.current) clearInterval(statsTimerRef.current);
    lastBytesRef.current = { sent: 0, received: 0, time: Date.now() };

    statsTimerRef.current = setInterval(async () => {
      if (!pc || pc.connectionState === 'closed') return;
      try {
        const stats = await pc.getStats();
        let rtt = 0, packetsLost = 0, totalPackets = 0, bytesSent = 0;

        stats.forEach(report => {
          // Active candidate pair gives RTT
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            rtt = Math.round((report.currentRoundTripTime || 0) * 1000);
          }
          // Inbound: collect loss stats
          if (report.type === 'inbound-rtp' && !report.isRemote) {
            packetsLost  += report.packetsLost   || 0;
            totalPackets += (report.packetsReceived || 0) + (report.packetsLost || 0);
          }
          // Outbound: bytes for bitrate calculation
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
          rtt,
          packetLoss,
          bitrate,
          iceState:  pc.iceConnectionState,
          connState: pc.connectionState,
          quality,
        });
      } catch (_) {}
    }, 2000);
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

  // ── Cleanup ───────────────────────────────────────────────────
  const cleanup = useCallback((opts = {}) => {
    stopStatsMonitor();

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    reconnectAttemptRef.current = 0;

    if (dataChannelRef.current) {
      try { dataChannelRef.current.close(); } catch (_) {}
      dataChannelRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);

    if (screenTrackRef.current) {
      screenTrackRef.current.stop();
      screenTrackRef.current = null;
    }
    setIsScreenSharing(false);

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    setRemoteStreams(new Map());
    setDataMessages([]);
    pendingIceRef.current = [];

    if (!opts.keepState) {
      setCallState(null);
      setIsMuted(false);
      setIsCameraOff(false);
    }
  }, [stopStatsMonitor]);

  // ── ICE Restart (auto-reconnect) ──────────────────────────────
  const attemptIceRestart = useCallback(async () => {
    const cs = callStateRef.current;
    const pc = pcRef.current;
    if (!cs || !pc) return;

    reconnectAttemptRef.current++;
    if (reconnectAttemptRef.current > 3) {
      console.warn('[WebRTC] ICE restart: max attempts reached — ending call');
      wsSend({ type: 'call_end', target_user_id: cs.userId });
      cleanup();
      playCallEnded();
      return;
    }

    console.info(`[WebRTC] ICE restart attempt ${reconnectAttemptRef.current}/3`);
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
          from_username: currentUser?.username,
          is_restart: true,
        });
      } catch (err) {
        console.error('[WebRTC] ICE restart offer failed:', err);
      }
    }
    // Callee waits for the new offer from caller (handled in handleWsMessage)
  }, [wsSend, cleanup, currentUser]);

  // ── Create RTCPeerConnection ──────────────────────────────────
  const createPC = useCallback((targetUserId) => {
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
      const src = streams?.[0];
      if (src) {
        setRemoteStreams(new Map([[String(targetUserId), src]]));
      } else {
        remoteStream.addTrack(track);
        setRemoteStreams(new Map([[String(targetUserId), remoteStream]]));
      }
    };

    // DataChannel from callee side
    pc.ondatachannel = ({ channel }) => setupDataChannel(channel);

    // Connection state machine
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.info('[WebRTC] Connection state:', state);

      if (state === 'connected') {
        reconnectAttemptRef.current = 0;
        callStartRef.current = Date.now();
        startStatsMonitor(pc);
        playCallConnected();
        setCallState(prev => prev ? { ...prev, status: 'active' } : prev);
        // Re-enumerate devices after stream starts (labels now available)
        refreshDevices();
      }

      if (state === 'disconnected') {
        // Wait 5s before ICE restart (may self-recover)
        reconnectTimerRef.current = setTimeout(() => {
          if (pcRef.current?.connectionState === 'disconnected') {
            attemptIceRestart();
          }
        }, 5000);
      }

      if (state === 'failed') {
        // Immediate ICE restart on hard failure
        clearTimeout(reconnectTimerRef.current);
        attemptIceRestart();
      }
    };

    pc.oniceconnectionstatechange = () =>
      console.info('[WebRTC] ICE connection:', pc.iceConnectionState);

    pcRef.current = pc;
    return pc;
  }, [wsSend, setupDataChannel, startStatsMonitor, refreshDevices, attemptIceRestart]);

  // ── Get Local Media ───────────────────────────────────────────
  const getLocalStream = useCallback(async (callType, deviceIds = {}) => {
    const audio = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl:  true,
      sampleRate:       48000,
      channelCount:     1,        // mono saves bandwidth significantly
      ...(deviceIds.microphone ? { deviceId: { exact: deviceIds.microphone } } : {}),
    };

    const video = callType === 'video' ? {
      width:     { ideal: 1280, max: 1920 },
      height:    { ideal: 720,  max: 1080 },
      frameRate: { ideal: 30,  max: 60   },
      ...(deviceIds.camera ? { deviceId: { exact: deviceIds.camera } } : {}),
    } : false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio, video });
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error('[WebRTC] getUserMedia failed:', err);
      throw err;
    }
  }, []);

  // ── Drain buffered ICE candidates ─────────────────────────────
  const drainPendingIce = useCallback(async (pc) => {
    const pending = [...pendingIceRef.current];
    pendingIceRef.current = [];
    for (const c of pending) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (_) {}
    }
  }, []);

  // ═════════════════════════════════════════════════════════════
  //  PUBLIC API — Call lifecycle
  // ═════════════════════════════════════════════════════════════

  /** Start an outgoing call */
  const initiateCall = useCallback(async (targetUserId, targetUsername, callType = 'voice') => {
    if (callStateRef.current) {
      console.warn('[WebRTC] Already in a call'); return;
    }
    try {
      isPoliteRef.current = false; // caller = not polite
      setCallState({ status: 'ringing', type: callType, userId: targetUserId, username: targetUsername });
      startRingtone();

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
        from_username: currentUser?.username,
      });
    } catch (err) {
      console.error('[WebRTC] initiateCall error:', err);
      cleanup();
      stopRingtone();
    }
  }, [getLocalStream, createPC, setupDataChannel, wsSend, cleanup, currentUser]);

  /** Accept an incoming call */
  const acceptCall = useCallback(async () => {
    const cs = callStateRef.current;
    if (!cs || cs.status !== 'incoming') return;
    stopRingtone();
    isPoliteRef.current = true; // callee = polite

    try {
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
      setCallState(prev => prev ? { ...prev, status: 'connecting' } : prev);
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
    wsSend({ type: 'call_end', target_user_id: cs.userId });

    if (cs.status === 'active' && callStartRef.current) {
      const duration = Math.floor((Date.now() - callStartRef.current) / 1000);
      saveCallRecord({
        fromId: currentUser?.id,
        toId:   cs.userId,
        callType: cs.type,
        duration,
        status: 'ended',
      });
      callStartRef.current = null;
    }

    cleanup();
    playCallEnded();
  }, [wsSend, cleanup, currentUser]);

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
          pc.addTrack(screenTrack, localStreamRef.current || new MediaStream());
        }

        // Auto-revert when user stops sharing in browser UI
        screenTrack.onended = () => toggleScreenShare();
        setIsScreenSharing(true);
      } catch (err) {
        console.warn('[WebRTC] Screen share cancelled/failed:', err);
      }
    }
  }, [isScreenSharing]);

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

      // Swap in local stream
      stream.getVideoTracks().forEach(t => { t.stop(); stream.removeTrack(t); });
      stream.addTrack(newTrack);
      localStreamRef.current = stream;
      setLocalStream(new MediaStream(stream.getTracks()));

      // Swap in PeerConnection (no renegotiation)
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

  // ─── DataChannel message sender ───────────────────────────

  const sendDataMessage = useCallback((text) => {
    const dc = dataChannelRef.current;
    if (!dc || dc.readyState !== 'open') {
      console.warn('[WebRTC] DataChannel not open');
      return false;
    }
    const msg = { text, from: currentUser?.username, ts: Date.now() };
    try {
      dc.send(JSON.stringify(msg));
      setDataMessages(prev => [...prev, { ...msg, received: false }]);
      return true;
    } catch (err) {
      console.error('[WebRTC] DataChannel send error:', err);
      return false;
    }
  }, [currentUser]);

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
            await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
            const answer = await pc.createAnswer();
            answer.sdp = preferH264(answer.sdp);
            await pc.setLocalDescription(answer);
            wsSend({ type: 'call_answer', target_user_id: msg.from_user_id, sdp: pc.localDescription });
            setCallState(prev => prev ? { ...prev, status: 'active' } : prev);
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
      return;
    }

    // ── Call accepted (caller gets answer) ────────────────────
    if (type === 'call_accepted') {
      stopRingtone();
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
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (_) {}
      } else {
        // Buffer until remote description is set
        pendingIceRef.current.push(candidate);
      }
      return;
    }

    // ── Call rejected ─────────────────────────────────────────
    if (type === 'call_rejected') {
      stopRingtone();
      cleanup();
      playCallEnded();
      return;
    }

    // ── Call ended by remote ──────────────────────────────────
    if (type === 'call_ended') {
      stopRingtone();
      if (callStateRef.current?.status === 'active' && callStartRef.current) {
        const duration = Math.floor((Date.now() - callStartRef.current) / 1000);
        saveCallRecord({
          fromId:   currentUser?.id,
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
  }, [cleanup, drainPendingIce, wsSend, currentUser]);

  // ── Attach / re-attach WS listener ───────────────────────────
  useEffect(() => {
    const socket = ws;
    if (!socket) return;
    socket.addEventListener('message', handleWsMessage);
    return () => socket.removeEventListener('message', handleWsMessage);
  }, [ws, handleWsMessage]);

  // ── Cleanup on unmount ────────────────────────────────────────
  useEffect(() => () => cleanup(), []); // eslint-disable-line

  return {
    // ── Backward-compatible API (identical to useMediasoup) ──
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

    // ── New capabilities ─────────────────────────────────────
    connectionQuality,   // { rtt, packetLoss, bitrate, quality }
    dataMessages,        // [{ text, from, ts, received }]
    sendDataMessage,     // (text) => boolean
    availableDevices,    // { cameras: [], microphones: [] }
    switchCamera,        // (deviceId) => Promise
    switchMicrophone,    // (deviceId) => Promise
  };
}

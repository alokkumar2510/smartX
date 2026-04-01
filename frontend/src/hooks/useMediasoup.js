/**
 * ════════════════════════════════════════════════════════
 *  useMediasoup.js — React hook for Mediasoup SFU calls
 *
 *  Provides a complete calling interface:
 *    { callState, localStream, remoteStreams,
 *      initiateCall, acceptCall, rejectCall, endCall,
 *      toggleMic, toggleCamera, startScreenShare }
 *
 *  Call flow:
 *    1. initiateCall(userId, username, callType)
 *       → emit 'call-user' to mediasoup server
 *       → wait for 'call-accepted' event
 *       → both sides joinRoom + produce + consume
 *
 *    2. acceptCall()
 *       → emit 'accept-call'
 *       → joinRoom + produce + consume
 *
 *    3. endCall() / rejectCall()
 *       → close transports, stop tracks
 * ════════════════════════════════════════════════════════
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { MediasoupClient } from '../services/mediasoupClient';
import { MEDIA_URL } from '../services/api';
import {
  startRingtone, stopRingtone,
  playCallConnected, playCallEnded, playErrorSound,
  showNotification,
} from '../sounds';
import { supabase } from '../lib/supabase';

/**
 * Generate a deterministic room ID from two user IDs.
 * Sorted so both sides generate the same ID.
 */
function makeRoomId(uidA, uidB) {
  return `call_${[uidA, uidB].sort().join('_')}`;
}

/**
 * @param {Object} currentUser - { id, username, supabase_id }
 * @param {string} token - JWT token for socket auth
 */
export function useMediasoup(currentUser, token) {
  // ── State ───────────────────────────────────────────────────
  const [callState, setCallState] = useState(null);
  // callState shape:
  // { status: 'ringing'|'incoming'|'active', type: 'voice'|'video',
  //   userId, username, socketId, roomId }

  const [localStream, setLocalStream] = useState(null);

  /** @type {[Map<string, MediaStream>, Function]} */
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  // remoteStreams: peerId → MediaStream

  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  // ── Refs ────────────────────────────────────────────────────
  const socketRef = useRef(null);
  const msClientRef = useRef(null);
  const localStreamRef = useRef(null);
  const callStateRef = useRef(null);
  const screenTrackRef = useRef(null);
  const callStartTimeRef = useRef(null);

  // Keep callState ref in sync
  useEffect(() => { callStateRef.current = callState; }, [callState]);

  // ── Connect Socket.io on mount ──────────────────────────────
  useEffect(() => {
    if (!token || !currentUser?.id) return;

    const socket = io(MEDIA_URL, {
      auth: { token },
      // In production, Nginx proxies /media → :3001
      // Socket.io must use /media/socket.io as its handshake path
      path: MEDIA_URL.startsWith('http://localhost') || MEDIA_URL.includes(':3001')
        ? '/socket.io'
        : '/media/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });


    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[MS Socket] Connected:', socket.id);
      setSocketConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.warn('[MS Socket] Disconnected:', reason);
      setSocketConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('[MS Socket] Connection error:', err.message);
    });

    // ── Call signaling events ──────────────────────────────
    socket.on('incoming-call', handleIncomingCall);
    socket.on('call-accepted', handleCallAccepted);
    socket.on('call-rejected', handleCallRejected);
    socket.on('call-ringing', handleCallRinging);
    socket.on('call-ended', handleCallEnded);

    // ── Mediasoup room events ──────────────────────────────
    socket.on('peer-joined', handlePeerJoined);
    socket.on('peer-left', handlePeerLeft);
    socket.on('new-producer', handleNewProducer);
    socket.on('existing-producers', handleExistingProducers);
    socket.on('producer-paused-resumed', handleProducerPausedResumed);
    socket.on('producer-closed', handleProducerClosed);

    return () => {
      socket.off('incoming-call', handleIncomingCall);
      socket.off('call-accepted', handleCallAccepted);
      socket.off('call-rejected', handleCallRejected);
      socket.off('call-ringing', handleCallRinging);
      socket.off('call-ended', handleCallEnded);
      socket.off('peer-joined', handlePeerJoined);
      socket.off('peer-left', handlePeerLeft);
      socket.off('new-producer', handleNewProducer);
      socket.off('existing-producers', handleExistingProducers);
      socket.off('producer-paused-resumed', handleProducerPausedResumed);
      socket.off('producer-closed', handleProducerClosed);
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, currentUser?.id]);

  // ────────────────────────────────────────────────────────────
  //  Media Helpers
  // ────────────────────────────────────────────────────────────

  const getLocalStream = useCallback(async (callType) => {
    if (localStreamRef.current) return localStreamRef.current;

    const constraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 48000,
        sampleSize: 16,
      },
      video: callType === 'video' ? {
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
        frameRate: { ideal: 30, max: 60 },
        facingMode: 'user',
      } : false,
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  // ────────────────────────────────────────────────────────────
  //  Core: Join Room + Produce + Consume
  // ────────────────────────────────────────────────────────────

  const joinRoomAndPublish = useCallback(async (roomId, callType) => {
    const socket = socketRef.current;
    if (!socket) throw new Error('Socket not connected');

    // 1) Create mediasoup client for this socket
    const msClient = new MediasoupClient(socket);
    msClientRef.current = msClient;

    // 2) Join mediasoup room → loads Device with RTP caps
    const { rtpCapabilities, error: joinErr } = await new Promise((res) =>
      socket.emit('join-room', { roomId }, res)
    );
    if (joinErr) throw new Error(joinErr);

    const { Device } = await import('mediasoup-client');
    const device = new Device();
    await device.load({ routerRtpCapabilities: rtpCapabilities });

    // Store device on client
    msClient._device = device;
    msClient._roomId = roomId;

    // 3) Create send transport
    await msClient.createSendTransport();

    // 4) Create recv transport
    await msClient.createRecvTransport();

    // 5) Get local media and produce
    const stream = await getLocalStream(callType);

    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) await msClient.produceAudio(audioTrack);

    if (callType === 'video') {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) await msClient.produceVideo(videoTrack);
    }

    callStartTimeRef.current = new Date().toISOString();
    setCallState(prev => ({ ...prev, status: 'active' }));
    playCallConnected();
    console.log('[MS] ✅ Room joined and tracks published');
  }, [getLocalStream]);

  // ────────────────────────────────────────────────────────────
  //  Signaling Event Handlers
  // ────────────────────────────────────────────────────────────

  const handleIncomingCall = useCallback(({ fromUserId, fromUsername, fromSocketId, callType, roomId }) => {
    console.log(`[MS] Incoming ${callType} call from ${fromUsername}`);
    startRingtone();
    showNotification(`📞 ${fromUsername}`, `${callType === 'video' ? 'Video' : 'Voice'} call`);
    setCallState({
      status: 'incoming',
      type: callType,
      userId: fromUserId,
      username: fromUsername,
      socketId: fromSocketId,
      roomId,
    });
  }, []);

  const handleCallRinging = useCallback(({ targetUserId, roomId }) => {
    setCallState(prev => prev ? { ...prev, status: 'ringing', roomId } : prev);
  }, []);

  const handleCallAccepted = useCallback(async ({ fromUserId, fromUsername, fromSocketId, roomId }) => {
    console.log(`[MS] Call accepted by ${fromUsername}`);
    stopRingtone();
    const cs = callStateRef.current;
    if (!cs) return;

    setCallState(prev => ({ ...prev, status: 'connecting' }));

    try {
      await joinRoomAndPublish(roomId, cs.type);
    } catch (err) {
      console.error('[MS] Failed to join room after accept:', err);
      playErrorSound();
      cleanupCall();
    }
  }, [joinRoomAndPublish]);

  const handleCallRejected = useCallback(({ fromUserId, fromUsername }) => {
    console.log(`[MS] Call rejected by ${fromUsername}`);
    stopRingtone();
    playCallEnded();
    cleanupCall();
  }, []);

  const handleCallEnded = useCallback(({ byUserId, byUsername }) => {
    console.log(`[MS] Call ended by ${byUsername}`);
    stopRingtone();
    playCallEnded();
    cleanupCall();
  }, []);

  // ── Mediasoup peer/producer events ─────────────────────────

  const handlePeerJoined = useCallback(({ peerId, userId, username }) => {
    console.log(`[MS] Peer joined: ${username} (${peerId})`);
  }, []);

  const handlePeerLeft = useCallback(({ peerId }) => {
    setRemoteStreams(prev => {
      const next = new Map(prev);
      next.delete(peerId);
      return next;
    });
    // If no more remote peers, end the call
    setRemoteStreams(prev => {
      if (prev.size === 0) {
        cleanupCall();
      }
      return prev;
    });
  }, []);

  const consumeProducer = useCallback(async (producerId, peerId) => {
    const msClient = msClientRef.current;
    if (!msClient) return;

    try {
      const { consumer, track } = await msClient.consume(producerId);

      setRemoteStreams(prev => {
        const next = new Map(prev);
        const existing = next.get(peerId) || new MediaStream();
        existing.addTrack(track);
        next.set(peerId, existing);
        return next;
      });

      console.log(`[MS] Consuming ${consumer.kind} from peer ${peerId}`);
    } catch (err) {
      console.error('[MS] consume error:', err.message);
    }
  }, []);

  const handleNewProducer = useCallback(async ({ producerId, peerId, kind }) => {
    console.log(`[MS] New producer: ${kind} from peer ${peerId}`);
    await consumeProducer(producerId, peerId);
  }, [consumeProducer]);

  const handleExistingProducers = useCallback(async ({ producers }) => {
    console.log(`[MS] Existing producers to consume: ${producers.length}`);
    for (const { producerId, peerId } of producers) {
      await consumeProducer(producerId, peerId);
    }
  }, [consumeProducer]);

  const handleProducerPausedResumed = useCallback(({ producerId, peerId, paused }) => {
    // Could update UI state to show mic/cam off indicator for remote peers
    console.log(`[MS] Producer ${producerId} (peer ${peerId}) paused=${paused}`);
  }, []);

  const handleProducerClosed = useCallback(({ producerId, peerId }) => {
    console.log(`[MS] Producer ${producerId} closed for peer ${peerId}`);
  }, []);

  // ────────────────────────────────────────────────────────────
  //  Public API
  // ────────────────────────────────────────────────────────────

  /**
   * Initiate a call to a contact.
   */
  const initiateCall = useCallback(async (targetUserId, targetUsername, callType = 'voice') => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      playErrorSound();
      alert('Media server not connected. Please try again.');
      return;
    }

    try {
      // Pre-acquire media so there's no delay when call is accepted
      await getLocalStream(callType);
    } catch (err) {
      playErrorSound();
      alert(window.isSecureContext
        ? `Microphone${callType === 'video' ? '/Camera' : ''} access denied: ${err.message}`
        : '❌ HTTPS required for microphone access'
      );
      return;
    }

    const roomId = makeRoomId(currentUser.id, targetUserId);

    setCallState({
      status: 'ringing',
      type: callType,
      userId: targetUserId,
      username: targetUsername,
      roomId,
    });

    socket.emit('call-user', {
      targetUserId,
      callType,
      roomId,
    });
  }, [currentUser?.id, getLocalStream]);

  /**
   * Accept an incoming call.
   */
  const acceptCall = useCallback(async () => {
    const cs = callStateRef.current;
    if (!cs || cs.status !== 'incoming') return;
    const socket = socketRef.current;

    stopRingtone();
    setCallState(prev => ({ ...prev, status: 'connecting' }));

    try {
      await getLocalStream(cs.type);
    } catch (err) {
      playErrorSound();
      alert(`Media access failed: ${err.message}`);
      cleanupCall();
      return;
    }

    // Notify caller
    socket.emit('accept-call', {
      toUserId: cs.userId,
      toSocketId: cs.socketId,
      roomId: cs.roomId,
    });

    // Join room from our side
    try {
      await joinRoomAndPublish(cs.roomId, cs.type);
    } catch (err) {
      console.error('[MS] joinRoom failed on accept:', err);
      playErrorSound();
      cleanupCall();
    }
  }, [getLocalStream, joinRoomAndPublish]);

  /**
   * Reject an incoming call.
   */
  const rejectCall = useCallback(() => {
    const cs = callStateRef.current;
    if (!cs) return;
    const socket = socketRef.current;

    stopRingtone();
    playCallEnded();

    socket?.emit('reject-call', {
      toUserId: cs.userId,
      toSocketId: cs.socketId,
    });

    // Log missed call
    if (currentUser?.supabase_id) {
      supabase.from('call_history').insert({
        caller_id: cs.userId,
        callee_id: currentUser.supabase_id,
        caller_name: cs.username,
        callee_name: currentUser.username,
        call_type: cs.type,
        direction: 'incoming',
        status: 'missed',
        started_at: new Date().toISOString(),
        ended_at: new Date().toISOString(),
        duration_s: 0,
      }).then(({ error }) => { if (error) console.warn('call_history insert error:', error); });
    }

    cleanupCall();
  }, [currentUser]);

  /**
   * End the current call.
   */
  const endCall = useCallback(() => {
    const cs = callStateRef.current;
    const socket = socketRef.current;

    socket?.emit('end-call', { roomId: cs?.roomId });

    // Log completed call
    if (cs && currentUser?.supabase_id && callStartTimeRef.current) {
      const endedAt = new Date().toISOString();
      const durationS = Math.round(
        (new Date(endedAt) - new Date(callStartTimeRef.current)) / 1000
      );
      supabase.from('call_history').insert({
        caller_id: currentUser.supabase_id,
        callee_id: cs.userId,
        caller_name: currentUser.username,
        callee_name: cs.username,
        call_type: cs.type,
        direction: 'outgoing',
        status: cs.status === 'active' ? 'completed' : 'missed',
        started_at: callStartTimeRef.current,
        ended_at: endedAt,
        duration_s: durationS,
      }).then(({ error }) => { if (error) console.warn('call_history insert error:', error); });
    }

    playCallEnded();
    cleanupCall();
  }, [currentUser]);

  /**
   * Toggle microphone mute.
   */
  const toggleMic = useCallback(async () => {
    const msClient = msClientRef.current;
    const newMuted = !isMuted;
    setIsMuted(newMuted);

    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !newMuted; });
    }
    if (msClient) {
      await msClient.setProducerPaused('audio', newMuted);
    }
  }, [isMuted]);

  /**
   * Toggle camera on/off.
   */
  const toggleCamera = useCallback(async () => {
    const msClient = msClientRef.current;
    const newOff = !isCameraOff;
    setIsCameraOff(newOff);

    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = !newOff; });
    }
    if (msClient) {
      await msClient.setProducerPaused('video', newOff);
    }
  }, [isCameraOff]);

  /**
   * Start/stop screen sharing.
   */
  const toggleScreenShare = useCallback(async () => {
    const msClient = msClientRef.current;
    if (!msClient) return;

    if (isScreenSharing) {
      // Restore camera track
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const camTrack = stream.getVideoTracks()[0];
        await msClient.replaceVideoTrack(camTrack);
        if (localStreamRef.current) {
          localStreamRef.current.getVideoTracks().forEach(t => t.stop());
          const newStream = new MediaStream([
            ...localStreamRef.current.getAudioTracks(),
            camTrack,
          ]);
          localStreamRef.current = newStream;
          setLocalStream(newStream);
        }
        screenTrackRef.current?.stop();
        screenTrackRef.current = null;
        setIsScreenSharing(false);
      } catch (err) {
        console.error('[MS] restore camera failed:', err);
      }
    } else {
      // Start screen share
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: { ideal: 30 }, width: { ideal: 1920 } },
          audio: true,
        });
        const screenTrack = screenStream.getVideoTracks()[0];
        screenTrackRef.current = screenTrack;
        await msClient.replaceVideoTrack(screenTrack);

        if (localStreamRef.current) {
          localStreamRef.current.getVideoTracks().forEach(t => t.stop());
          const newStream = new MediaStream([
            ...localStreamRef.current.getAudioTracks(),
            screenTrack,
          ]);
          localStreamRef.current = newStream;
          setLocalStream(newStream);
        }

        screenTrack.onended = () => toggleScreenShare();
        setIsScreenSharing(true);
      } catch (err) {
        console.error('[MS] screen share failed:', err);
      }
    }
  }, [isScreenSharing]);

  // ────────────────────────────────────────────────────────────
  //  Cleanup
  // ────────────────────────────────────────────────────────────

  const cleanupCall = useCallback(() => {
    // Stop all local media tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    screenTrackRef.current?.stop();
    screenTrackRef.current = null;

    // Close mediasoup transports
    if (msClientRef.current) {
      msClientRef.current.leaveRoom().catch(console.warn);
      msClientRef.current = null;
    }

    // Reset state
    setCallState(null);
    setLocalStream(null);
    setRemoteStreams(new Map());
    setIsMuted(false);
    setIsCameraOff(false);
    setIsScreenSharing(false);
    callStartTimeRef.current = null;
  }, []);

  // ────────────────────────────────────────────────────────────
  //  Return public interface
  // ────────────────────────────────────────────────────────────

  return {
    // State
    callState,
    localStream,
    remoteStreams,        // Map<peerId, MediaStream>
    isMuted,
    isCameraOff,
    isScreenSharing,
    socketConnected,

    // Actions
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
  };
}

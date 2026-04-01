'use strict';
const roomManager = require('../mediasoup/RoomManager');
const logger = require('../utils/logger');

/**
 * ════════════════════════════════════════════════════════
 *  Socket.io Event Handlers
 *
 *  Call flow:
 *  ┌─────────────────────────────────────────────────────┐
 *  │  SIGNALING (pre-room)                               │
 *  │  call-user → incoming-call → accept-call / reject   │
 *  │                                                     │
 *  │  MEDIASOUP (in-room)                                │
 *  │  join-room → get-rtp-capabilities                   │
 *  │  → create-transport (send + recv)                   │
 *  │  → connect-transport                                │
 *  │  → produce (audio/video)                            │
 *  │  → consume (others' tracks)                         │
 *  └─────────────────────────────────────────────────────┘
 *
 *  Each socket.io socket represents ONE peer in ONE room.
 *  socket.data holds: { userId, username, roomId, peerId }
 * ════════════════════════════════════════════════════════
 */

/**
 * Register all event handlers for a connected socket.
 * @param {import('socket.io').Socket} socket
 * @param {import('socket.io').Server} io
 */
function registerHandlers(socket, io) {
  const { userId, username } = socket.data;
  const peerId = socket.id; // Socket ID = peer ID

  // Track which room this peer is in (for cleanup on disconnect)
  let currentRoomId = null;

  // ─────────────────────────────────────────────────────
  //  CALL SIGNALING  (peer-to-peer via server relay)
  // ─────────────────────────────────────────────────────

  /**
   * Caller initiates a call to a target user.
   * Payload: { targetUserId, targetSocketId, callType: 'voice'|'video', roomId }
   */
  socket.on('call-user', ({ targetUserId, callType, roomId }) => {
    logger.info(`[Sig] call-user: ${username}(${userId}) → ${targetUserId} | room: ${roomId}`);

    // Find the target user's socket(s)
    const targetSockets = findSocketsByUserId(io, targetUserId);
    if (targetSockets.length === 0) {
      socket.emit('call-failed', { reason: 'user_offline', targetUserId });
      return;
    }

    targetSockets.forEach((targetSocket) => {
      targetSocket.emit('incoming-call', {
        fromUserId: userId,
        fromUsername: username,
        fromSocketId: socket.id,
        callType,
        roomId,
      });
    });

    socket.emit('call-ringing', { targetUserId, roomId });
  });

  /**
   * Callee accepts the call.
   * Payload: { toUserId, toSocketId, roomId }
   */
  socket.on('accept-call', ({ toUserId, toSocketId, roomId }) => {
    logger.info(`[Sig] accept-call: ${username} → user ${toUserId} | room: ${roomId}`);

    const callerSocket = io.sockets.sockets.get(toSocketId);
    if (callerSocket) {
      callerSocket.emit('call-accepted', {
        fromUserId: userId,
        fromUsername: username,
        fromSocketId: socket.id,
        roomId,
      });
    }
  });

  /**
   * Callee rejects the call.
   * Payload: { toUserId, toSocketId }
   */
  socket.on('reject-call', ({ toUserId, toSocketId }) => {
    logger.info(`[Sig] reject-call: ${username} → user ${toUserId}`);

    const callerSocket = io.sockets.sockets.get(toSocketId);
    if (callerSocket) {
      callerSocket.emit('call-rejected', {
        fromUserId: userId,
        fromUsername: username,
      });
    }
  });

  /**
   * Any peer ends the call.
   * Payload: { roomId }
   */
  socket.on('end-call', ({ roomId }) => {
    logger.info(`[Sig] end-call: ${username} in room ${roomId}`);

    // Notify all peers in the room
    socket.to(getRoomSocketRoom(roomId)).emit('call-ended', {
      byUserId: userId,
      byUsername: username,
    });

    // Clean up mediasoup room peer
    if (currentRoomId) {
      roomManager.removePeerFromRoom(currentRoomId, peerId);
      socket.leave(getRoomSocketRoom(currentRoomId));
      currentRoomId = null;
    }
  });

  // ─────────────────────────────────────────────────────
  //  MEDIASOUP — Room Join & RTP Capabilities
  // ─────────────────────────────────────────────────────

  /**
   * Join a mediasoup room (after call is accepted by both sides).
   * Payload: { roomId }
   * Response: { rtpCapabilities }
   */
  socket.on('join-room', async ({ roomId }, callback) => {
    try {
      logger.info(`[MS] join-room: ${username} → room ${roomId}`);

      const room = await roomManager.getOrCreateRoom(roomId);
      room.addPeer(peerId, { socketId: socket.id, userId, username });

      currentRoomId = roomId;

      // Join Socket.io room (for broadcasting within the call)
      socket.join(getRoomSocketRoom(roomId));

      // Return router RTP capabilities so client can load mediasoup Device
      safeCallback(callback, null, {
        rtpCapabilities: room.getRtpCapabilities(),
      });

      // Tell existing peers about the new joiner
      socket.to(getRoomSocketRoom(roomId)).emit('peer-joined', {
        peerId,
        userId,
        username,
      });

      // Send the new peer the list of existing producers to consume
      const existingProducers = room.getOtherPeersProducers(peerId);
      if (existingProducers.length > 0) {
        socket.emit('existing-producers', { producers: existingProducers });
      }

    } catch (err) {
      logger.error('[MS] join-room error:', err.message);
      safeCallback(callback, err.message);
    }
  });

  // ─────────────────────────────────────────────────────
  //  MEDIASOUP — Transport
  // ─────────────────────────────────────────────────────

  /**
   * Create a WebRTC transport (send or receive).
   * Payload: { roomId, direction: 'send'|'recv' }
   * Response: { id, iceParameters, iceCandidates, dtlsParameters }
   */
  socket.on('create-transport', async ({ roomId, direction }, callback) => {
    try {
      const room = roomManager.getRoom(roomId);
      if (!room) throw new Error(`Room ${roomId} not found`);

      const transportParams = await room.createWebRtcTransport(peerId);

      logger.info(`[MS] create-transport (${direction}): ${username} in ${roomId}`);
      safeCallback(callback, null, { transportParams, direction });

    } catch (err) {
      logger.error('[MS] create-transport error:', err.message);
      safeCallback(callback, err.message);
    }
  });

  /**
   * Connect a transport (provide DTLS parameters from client).
   * Payload: { roomId, transportId, dtlsParameters }
   */
  socket.on('connect-transport', async ({ roomId, transportId, dtlsParameters }, callback) => {
    try {
      const room = roomManager.getRoom(roomId);
      if (!room) throw new Error(`Room ${roomId} not found`);

      await room.connectTransport(peerId, transportId, dtlsParameters);
      logger.info(`[MS] connect-transport: ${username} | transport ${transportId}`);
      safeCallback(callback, null);

    } catch (err) {
      logger.error('[MS] connect-transport error:', err.message);
      safeCallback(callback, err.message);
    }
  });

  // ─────────────────────────────────────────────────────
  //  MEDIASOUP — Produce
  // ─────────────────────────────────────────────────────

  /**
   * Start producing (sending a media track).
   * Payload: { roomId, transportId, kind, rtpParameters, appData }
   * Response: { producerId }
   */
  socket.on('produce', async ({ roomId, transportId, kind, rtpParameters, appData }, callback) => {
    try {
      const room = roomManager.getRoom(roomId);
      if (!room) throw new Error(`Room ${roomId} not found`);

      const producerId = await room.produce(peerId, transportId, {
        kind, rtpParameters, appData,
      });

      logger.info(`[MS] produce: ${username} | ${kind} | producer=${producerId}`);
      safeCallback(callback, null, { producerId });

      // Notify all other peers in room → they should consume this new producer
      socket.to(getRoomSocketRoom(roomId)).emit('new-producer', {
        producerId,
        peerId,
        userId,
        username,
        kind,
      });

    } catch (err) {
      logger.error('[MS] produce error:', err.message);
      safeCallback(callback, err.message);
    }
  });

  /**
   * Toggle producer paused state (mute/unmute mic or cam).
   * Payload: { roomId, producerId, paused }
   */
  socket.on('producer-pause-resume', async ({ roomId, producerId, paused }) => {
    try {
      const room = roomManager.getRoom(roomId);
      if (!room) return;
      await room.setProducerPaused(peerId, producerId, paused);

      // Notify other peers
      socket.to(getRoomSocketRoom(roomId)).emit('producer-paused-resumed', {
        producerId,
        peerId,
        userId,
        paused,
      });
    } catch (err) {
      logger.error('[MS] producer-pause-resume error:', err.message);
    }
  });

  /**
   * Close a producer (stop sending track entirely).
   * Payload: { roomId, producerId }
   */
  socket.on('close-producer', ({ roomId, producerId }) => {
    const room = roomManager.getRoom(roomId);
    if (!room) return;
    room.closeProducer(peerId, producerId);

    socket.to(getRoomSocketRoom(roomId)).emit('producer-closed', {
      producerId,
      peerId,
    });
  });

  // ─────────────────────────────────────────────────────
  //  MEDIASOUP — Consume
  // ─────────────────────────────────────────────────────

  /**
   * Subscribe to another peer's producer.
   * Payload: { roomId, transportId, producerId, rtpCapabilities }
   * Response: consumer params
   */
  socket.on('consume', async ({ roomId, transportId, producerId, rtpCapabilities }, callback) => {
    try {
      const room = roomManager.getRoom(roomId);
      if (!room) throw new Error(`Room ${roomId} not found`);

      const consumerParams = await room.consume(peerId, transportId, {
        producerId,
        rtpCapabilities,
      });

      logger.info(`[MS] consume: ${username} | producer=${producerId} | consumer=${consumerParams.id}`);
      safeCallback(callback, null, { consumerParams });

    } catch (err) {
      logger.error('[MS] consume error:', err.message);
      safeCallback(callback, err.message);
    }
  });

  /**
   * Resume a consumer (called after client has rendered the remote track).
   * Payload: { roomId, consumerId }
   */
  socket.on('resume-consumer', async ({ roomId, consumerId }, callback) => {
    try {
      const room = roomManager.getRoom(roomId);
      if (!room) throw new Error(`Room ${roomId} not found`);

      await room.resumeConsumer(peerId, consumerId);
      safeCallback(callback, null);
    } catch (err) {
      logger.error('[MS] resume-consumer error:', err.message);
      safeCallback(callback, err.message);
    }
  });

  // ─────────────────────────────────────────────────────
  //  Disconnect / Cleanup
  // ─────────────────────────────────────────────────────

  socket.on('disconnect', (reason) => {
    logger.info(`[Socket] ${username} disconnected: ${reason}`);

    if (currentRoomId) {
      // Notify peers
      socket.to(getRoomSocketRoom(currentRoomId)).emit('peer-left', {
        peerId,
        userId,
        username,
      });

      roomManager.removePeerFromRoom(currentRoomId, peerId);
      currentRoomId = null;
    }
  });

  // ─────────────────────────────────────────────────────
  //  Monitoring
  // ─────────────────────────────────────────────────────

  socket.on('get-room-info', ({ roomId }, callback) => {
    const room = roomManager.getRoom(roomId);
    safeCallback(callback, null, room ? room.getInfo() : null);
  });
}

// ── Helpers ────────────────────────────────────────────────────

/** Convert roomId to a Socket.io room name */
function getRoomSocketRoom(roomId) {
  return `mediasoup:room:${roomId}`;
}

/** Find all sockets belonging to a userId */
function findSocketsByUserId(io, targetUserId) {
  const result = [];
  for (const [, socket] of io.sockets.sockets) {
    if (socket.data?.userId === targetUserId) {
      result.push(socket);
    }
  }
  return result;
}

/** Safe callback helper — avoids crashes if client doesn't provide callback */
function safeCallback(cb, error, data) {
  if (typeof cb !== 'function') return;
  cb({ error: error || null, ...(data || {}) });
}

module.exports = { registerHandlers };

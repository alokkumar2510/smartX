'use strict';
const config = require('../config');
const logger = require('../utils/logger');

/**
 * ════════════════════════════════════════════════════════
 *  Room — Manages one call session inside Mediasoup
 *
 *  Each Room has:
 *    - One mediasoup Router (RTP capability negotiation)
 *    - Multiple WebRTC Transports (one send + one recv per peer)
 *    - Producers (audio/video tracks sent by peers)
 *    - Consumers (subscriptions: a peer receiving another's track)
 *
 *  Call flow per peer:
 *    1. join-room          → peer added to room._peers
 *    2. create-transport   → send-transport created → params sent to client
 *    3. connect-transport  → DTLS params from client → transport connected
 *    4. produce            → peer sends track → Producer created
 *    5. consume            → peer pulls others' tracks → Consumer created
 * ════════════════════════════════════════════════════════
 */
class Room {
  /**
   * @param {string} roomId
   * @param {import('mediasoup').types.Router} router
   */
  constructor(roomId, router) {
    this.id = roomId;
    this._router = router;
    this.createdAt = Date.now();

    /**
     * Map of peerId → { socketId, userId, username, transports, producers, consumers }
     * @type {Map<string, Object>}
     */
    this._peers = new Map();
  }

  // ────────────────────────────────────────────────────────
  //  RTP Capabilities (sent to client so it can load Device)
  // ────────────────────────────────────────────────────────

  getRtpCapabilities() {
    return this._router.rtpCapabilities;
  }

  // ────────────────────────────────────────────────────────
  //  Peer Management
  // ────────────────────────────────────────────────────────

  /**
   * Add a peer to this room.
   */
  addPeer(peerId, { socketId, userId, username }) {
    if (this._peers.has(peerId)) return;
    this._peers.set(peerId, {
      socketId,
      userId,
      username,
      transports: new Map(),   // transportId → WebRtcTransport
      producers: new Map(),    // producerId  → Producer
      consumers: new Map(),    // consumerId  → Consumer
    });
    logger.info(`[Room ${this.id}] Peer joined: ${username} (${peerId})`);
  }

  removePeer(peerId) {
    const peer = this._peers.get(peerId);
    if (!peer) return;

    // Close all transports (which closes producers & consumers too)
    peer.transports.forEach((t) => t.close());
    this._peers.delete(peerId);
    logger.info(`[Room ${this.id}] Peer left: ${peer.username} (${peerId})`);
  }

  hasPeer(peerId) {
    return this._peers.has(peerId);
  }

  getPeerIds() {
    return [...this._peers.keys()];
  }

  getPeerCount() {
    return this._peers.size;
  }

  /**
   * Returns all producer IDs from all peers except the given peerId.
   * Used to list what a new joiner should consume.
   */
  getOtherPeersProducers(exceptPeerId) {
    const result = [];
    for (const [peerId, peer] of this._peers) {
      if (peerId === exceptPeerId) continue;
      for (const [producerId, producer] of peer.producers) {
        result.push({
          producerId,
          peerId,
          userId: peer.userId,
          username: peer.username,
          kind: producer.kind,
        });
      }
    }
    return result;
  }

  // ────────────────────────────────────────────────────────
  //  Transport
  // ────────────────────────────────────────────────────────

  /**
   * Create a WebRTC send or receive transport for a peer.
   * Returns transport params to send to the client.
   */
  async createWebRtcTransport(peerId) {
    const peer = this._peers.get(peerId);
    if (!peer) throw new Error(`Peer ${peerId} not in room`);

    const transport = await this._router.createWebRtcTransport(
      config.mediasoup.webRtcTransport
    );

    // Enforce max incoming bitrate
    if (config.mediasoup.webRtcTransport.maxIncomingBitrate) {
      await transport.setMaxIncomingBitrate(
        config.mediasoup.webRtcTransport.maxIncomingBitrate
      );
    }

    transport.on('dtlsstatechange', (dtlsState) => {
      if (dtlsState === 'closed') transport.close();
    });

    transport.on('@close', () => {
      peer.transports.delete(transport.id);
    });

    peer.transports.set(transport.id, transport);

    return {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
      sctpParameters: transport.sctpParameters,
    };
  }

  /**
   * Complete DTLS handshake for a transport.
   */
  async connectTransport(peerId, transportId, dtlsParameters) {
    const peer = this._peers.get(peerId);
    if (!peer) throw new Error(`Peer ${peerId} not found`);
    const transport = peer.transports.get(transportId);
    if (!transport) throw new Error(`Transport ${transportId} not found`);
    await transport.connect({ dtlsParameters });
  }

  // ────────────────────────────────────────────────────────
  //  Producer (client → SFU)
  // ────────────────────────────────────────────────────────

  /**
   * Create a Producer for a peer (they start sending media).
   */
  async produce(peerId, transportId, { kind, rtpParameters, appData = {} }) {
    const peer = this._peers.get(peerId);
    if (!peer) throw new Error(`Peer ${peerId} not found`);
    const transport = peer.transports.get(transportId);
    if (!transport) throw new Error(`Transport ${transportId} not found`);

    const producerOptions = { kind, rtpParameters, appData };

    // Apply audio-specific codec options
    if (kind === 'audio') {
      Object.assign(producerOptions, config.mediasoup.audioProducerOptions);
    }

    const producer = await transport.produce(producerOptions);

    producer.on('transportclose', () => {
      peer.producers.delete(producer.id);
    });

    peer.producers.set(producer.id, producer);
    logger.info(`[Room ${this.id}] Producer created: ${kind} by ${peer.username}`);

    return producer.id;
  }

  /**
   * Pause or resume a producer (mic/cam toggle).
   */
  async setProducerPaused(peerId, producerId, paused) {
    const peer = this._peers.get(peerId);
    if (!peer) return;
    const producer = peer.producers.get(producerId);
    if (!producer) return;
    if (paused) await producer.pause();
    else await producer.resume();
  }

  /**
   * Close a producer (stop sending a track).
   */
  closeProducer(peerId, producerId) {
    const peer = this._peers.get(peerId);
    if (!peer) return;
    const producer = peer.producers.get(producerId);
    if (producer) {
      producer.close();
      peer.producers.delete(producerId);
    }
  }

  // ────────────────────────────────────────────────────────
  //  Consumer (SFU → client)
  // ────────────────────────────────────────────────────────

  /**
   * Create a Consumer so a peer can receive a producer's track.
   */
  async consume(peerId, transportId, { producerId, rtpCapabilities }) {
    const peer = this._peers.get(peerId);
    if (!peer) throw new Error(`Peer ${peerId} not found`);
    const transport = peer.transports.get(transportId);
    if (!transport) throw new Error(`Transport ${transportId} not found`);

    // Verify the router can route this producer to this consumer
    if (!this._router.canConsume({ producerId, rtpCapabilities })) {
      throw new Error(`Cannot consume producer ${producerId} — incompatible capabilities`);
    }

    const consumer = await transport.consume({
      producerId,
      rtpCapabilities,
      paused: true, // Start paused; client resumes after setting up track
    });

    consumer.on('transportclose', () => {
      peer.consumers.delete(consumer.id);
    });

    consumer.on('producerclose', () => {
      peer.consumers.delete(consumer.id);
      // Notify the consumer-side client that the producer is gone
      return { event: 'producer-closed', consumerId: consumer.id };
    });

    peer.consumers.set(consumer.id, consumer);

    return {
      id: consumer.id,
      producerId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
      type: consumer.type,
      producerPaused: consumer.producerPaused,
    };
  }

  /**
   * Resume a consumer (called by client after it has rendered the track).
   */
  async resumeConsumer(peerId, consumerId) {
    const peer = this._peers.get(peerId);
    if (!peer) return;
    const consumer = peer.consumers.get(consumerId);
    if (consumer) await consumer.resume();
  }

  // ────────────────────────────────────────────────────────
  //  Room Lifecycle
  // ────────────────────────────────────────────────────────

  isEmpty() {
    return this._peers.size === 0;
  }

  close() {
    this._router.close();
    logger.info(`[Room ${this.id}] Closed`);
  }

  getInfo() {
    return {
      id: this.id,
      peerCount: this._peers.size,
      peers: [...this._peers.values()].map((p) => ({
        userId: p.userId,
        username: p.username,
        producers: p.producers.size,
        consumers: p.consumers.size,
      })),
      createdAt: this.createdAt,
    };
  }
}

module.exports = Room;

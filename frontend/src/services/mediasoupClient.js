/**
 * ════════════════════════════════════════════════════════
 *  mediasoupClient.js — Low-level Mediasoup client wrapper
 *
 *  Wraps mediasoup-client Device, transports, producers,
 *  and consumers into a clean async API that the
 *  useMediasoup hook calls.
 *
 *  Architecture:
 *    Socket.io (signaling) ──→ this module ──→ mediasoup Device
 *    Device ──→ SendTransport ──→ Producers (your mic/cam)
 *    Device ──→ RecvTransport ──→ Consumers (others' tracks)
 * ════════════════════════════════════════════════════════
 */
import { Device } from 'mediasoup-client';

export class MediasoupClient {
  constructor(socket) {
    this._socket = socket;
    this._device = null;
    this._sendTransport = null;
    this._recvTransport = null;

    /** @type {Map<string, import('mediasoup-client').types.Producer>} */
    this._producers = new Map(); // kind → Producer

    /** @type {Map<string, import('mediasoup-client').types.Consumer>} */
    this._consumers = new Map(); // consumerId → Consumer

    this._roomId = null;
  }

  // ────────────────────────────────────────────────────────
  //  Device Initialization
  // ────────────────────────────────────────────────────────

  /**
   * Join a Mediasoup room and load the Device with router capabilities.
   * Must be called before creating transports or producing.
   */
  async joinRoom(roomId) {
    this._roomId = roomId;

    // 1. Ask server for RTP capabilities
    const { error, rtpCapabilities } = await this._emit('join-room', { roomId });
    if (error) throw new Error(`join-room failed: ${error}`);

    // 2. Create and load the mediasoup Device
    this._device = new Device();
    await this._device.load({ routerRtpCapabilities: rtpCapabilities });

    console.log('[MS] Device loaded for room:', roomId);
    return rtpCapabilities;
  }

  // ────────────────────────────────────────────────────────
  //  Transport Creation
  // ────────────────────────────────────────────────────────

  /**
   * Create the send transport (for producing your own tracks).
   * @param {Function} onConnect - called when DTLS is ready
   */
  async createSendTransport(onConnect) {
    const { error, transportParams } = await this._emit('create-transport', {
      roomId: this._roomId,
      direction: 'send',
    });
    if (error) throw new Error(`create-transport (send) failed: ${error}`);

    this._sendTransport = this._device.createSendTransport(transportParams);

    this._sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        await this._emit('connect-transport', {
          roomId: this._roomId,
          transportId: this._sendTransport.id,
          dtlsParameters,
        });
        callback();
        if (onConnect) onConnect();
      } catch (err) {
        errback(err);
      }
    });

    this._sendTransport.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
      try {
        const { error: e, producerId } = await this._emit('produce', {
          roomId: this._roomId,
          transportId: this._sendTransport.id,
          kind,
          rtpParameters,
          appData,
        });
        if (e) throw new Error(e);
        callback({ id: producerId });
      } catch (err) {
        errback(err);
      }
    });

    this._sendTransport.on('connectionstatechange', (state) => {
      console.log(`[MS] SendTransport state: ${state}`);
    });

    return this._sendTransport;
  }

  /**
   * Create the receive transport (for consuming others' tracks).
   */
  async createRecvTransport() {
    const { error, transportParams } = await this._emit('create-transport', {
      roomId: this._roomId,
      direction: 'recv',
    });
    if (error) throw new Error(`create-transport (recv) failed: ${error}`);

    this._recvTransport = this._device.createRecvTransport(transportParams);

    this._recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        await this._emit('connect-transport', {
          roomId: this._roomId,
          transportId: this._recvTransport.id,
          dtlsParameters,
        });
        callback();
      } catch (err) {
        errback(err);
      }
    });

    this._recvTransport.on('connectionstatechange', (state) => {
      console.log(`[MS] RecvTransport state: ${state}`);
    });

    return this._recvTransport;
  }

  // ────────────────────────────────────────────────────────
  //  Producing (sending your audio/video)
  // ────────────────────────────────────────────────────────

  /**
   * Produce audio from a MediaStreamTrack.
   */
  async produceAudio(track) {
    if (!this._sendTransport) throw new Error('Send transport not created');

    const producer = await this._sendTransport.produce({
      track,
      codecOptions: {
        opusStereo: false,
        opusDtx: true,
        opusFec: true,
        opusMaxPlaybackRate: 48000,
      },
      appData: { kind: 'audio' },
    });

    this._producers.set('audio', producer);
    console.log('[MS] Audio producer created:', producer.id);
    return producer;
  }

  /**
   * Produce video from a MediaStreamTrack with simulcast.
   */
  async produceVideo(track) {
    if (!this._sendTransport) throw new Error('Send transport not created');

    const producer = await this._sendTransport.produce({
      track,
      // Simulcast: 3 spatial layers (quarter, half, full resolution)
      encodings: [
        { maxBitrate: 100_000, scaleResolutionDownBy: 4 },
        { maxBitrate: 300_000, scaleResolutionDownBy: 2 },
        { maxBitrate: 900_000, scaleResolutionDownBy: 1 },
      ],
      codecOptions: {
        videoGoogleStartBitrate: 1000,
      },
      appData: { kind: 'video' },
    });

    this._producers.set('video', producer);
    console.log('[MS] Video producer created:', producer.id);
    return producer;
  }

  /**
   * Pause or resume a producer (mic/camera toggle).
   * @param {'audio'|'video'} kind
   * @param {boolean} paused
   */
  async setProducerPaused(kind, paused) {
    const producer = this._producers.get(kind);
    if (!producer) return;

    if (paused) producer.pause();
    else producer.resume();

    // Notify server so it can pause the server-side producer
    // (so paused state is signaled to consumers)
    this._socket.emit('producer-pause-resume', {
      roomId: this._roomId,
      producerId: producer.id,
      paused,
    });
  }

  /**
   * Replace the video track (e.g., switching to screen share).
   */
  async replaceVideoTrack(newTrack) {
    const producer = this._producers.get('video');
    if (!producer) return;
    await producer.replaceTrack({ track: newTrack });
    console.log('[MS] Video track replaced (screen share)');
  }

  // ────────────────────────────────────────────────────────
  //  Consuming (receiving others' audio/video)
  // ────────────────────────────────────────────────────────

  /**
   * Consume a remote producer's track.
   * @param {string} producerId - the remote producer to consume
   * @returns {MediaStreamTrack}
   */
  async consume(producerId) {
    if (!this._recvTransport) throw new Error('Recv transport not created');

    const { error, consumerParams } = await this._emit('consume', {
      roomId: this._roomId,
      transportId: this._recvTransport.id,
      producerId,
      rtpCapabilities: this._device.rtpCapabilities,
    });
    if (error) throw new Error(`consume failed: ${error}`);

    const consumer = await this._recvTransport.consume(consumerParams);

    this._consumers.set(consumer.id, consumer);

    // Resume the consumer on the server (it starts paused)
    await this._emit('resume-consumer', {
      roomId: this._roomId,
      consumerId: consumer.id,
    });

    console.log(`[MS] Consumer created: ${consumer.kind} | producer=${producerId}`);
    return { consumer, track: consumer.track };
  }

  // ────────────────────────────────────────────────────────
  //  Cleanup
  // ────────────────────────────────────────────────────────

  /**
   * Leave the room and close all transports.
   */
  async leaveRoom() {
    if (this._roomId) {
      this._socket.emit('end-call', { roomId: this._roomId });
    }

    this._producers.forEach((p) => p.close());
    this._producers.clear();

    this._consumers.forEach((c) => c.close());
    this._consumers.clear();

    if (this._sendTransport) {
      this._sendTransport.close();
      this._sendTransport = null;
    }
    if (this._recvTransport) {
      this._recvTransport.close();
      this._recvTransport = null;
    }

    this._device = null;
    this._roomId = null;
    console.log('[MS] Left room, all transports closed');
  }

  // ────────────────────────────────────────────────────────
  //  Helpers
  // ────────────────────────────────────────────────────────

  /**
   * Promisified socket.io emit with acknowledgement.
   */
  _emit(event, data = {}) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Socket timeout waiting for ${event}`));
      }, 10000);

      this._socket.emit(event, data, (response) => {
        clearTimeout(timeout);
        resolve(response || {});
      });
    });
  }

  get roomId() { return this._roomId; }
  get device() { return this._device; }
  get producers() { return this._producers; }
  get consumers() { return this._consumers; }
}

'use strict';
const Room = require('./Room');
const workerPool = require('./WorkerPool');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * ════════════════════════════════════════════════════════
 *  RoomManager — Registry of active call rooms
 *
 *  - Creates rooms lazily (on first join)
 *  - Destroys rooms when the last peer leaves
 *  - Each room gets its own mediasoup Router on a balanced worker
 * ════════════════════════════════════════════════════════
 */
class RoomManager {
  constructor() {
    /** @type {Map<string, Room>} */
    this._rooms = new Map();
  }

  /**
   * Get an existing room or create a new one.
   * @param {string} roomId
   * @returns {Promise<Room>}
   */
  async getOrCreateRoom(roomId) {
    if (this._rooms.has(roomId)) {
      return this._rooms.get(roomId);
    }

    logger.info(`[RoomManager] Creating room: ${roomId}`);

    // Pick a worker via round-robin
    const worker = workerPool.getNextWorker();

    // Create a mediasoup Router on that worker
    const router = await worker.createRouter({
      mediaCodecs: config.mediasoup.router.mediaCodecs,
    });

    const room = new Room(roomId, router);
    this._rooms.set(roomId, room);

    logger.info(`[RoomManager] Room ${roomId} created (worker pid=${worker.pid})`);
    return room;
  }

  /**
   * Get an existing room (returns null if not found).
   * @param {string} roomId
   * @returns {Room|null}
   */
  getRoom(roomId) {
    return this._rooms.get(roomId) || null;
  }

  /**
   * Remove a peer from their room. If room is empty, destroy it.
   * @param {string} roomId
   * @param {string} peerId
   */
  removePeerFromRoom(roomId, peerId) {
    const room = this._rooms.get(roomId);
    if (!room) return;

    room.removePeer(peerId);

    if (room.isEmpty()) {
      room.close();
      this._rooms.delete(roomId);
      logger.info(`[RoomManager] Room ${roomId} destroyed (empty)`);
    }
  }

  /**
   * Get all rooms info (for monitoring/admin).
   */
  getRoomsInfo() {
    const info = [];
    for (const [id, room] of this._rooms) {
      info.push(room.getInfo());
    }
    return info;
  }

  get roomCount() {
    return this._rooms.size;
  }
}

// Singleton
const roomManager = new RoomManager();
module.exports = roomManager;

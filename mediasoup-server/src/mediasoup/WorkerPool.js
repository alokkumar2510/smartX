'use strict';
const mediasoup = require('mediasoup');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * ════════════════════════════════════════════════════════
 *  WorkerPool — Manages mediasoup Worker instances
 *
 *  Spawns one worker per CPU core. Each worker runs in its
 *  own process and handles media codecs independently.
 *  Uses round-robin to assign routers to workers evenly.
 * ════════════════════════════════════════════════════════
 */
class WorkerPool {
  constructor() {
    /** @type {mediasoup.types.Worker[]} */
    this._workers = [];
    this._nextWorkerIdx = 0;
  }

  /**
   * Spawn all workers. Call once on server startup.
   */
  async init() {
    const { numWorkers, worker: workerSettings } = config.mediasoup;
    logger.info(`[WorkerPool] Spawning ${numWorkers} mediasoup worker(s)...`);

    const spawnPromises = Array.from({ length: numWorkers }, () =>
      this._spawnWorker(workerSettings)
    );

    this._workers = await Promise.all(spawnPromises);
    logger.info(`[WorkerPool] ✅ ${this._workers.length} worker(s) ready`);
  }

  /**
   * Get the next worker in round-robin order.
   * @returns {mediasoup.types.Worker}
   */
  getNextWorker() {
    const worker = this._workers[this._nextWorkerIdx];
    this._nextWorkerIdx = (this._nextWorkerIdx + 1) % this._workers.length;
    return worker;
  }

  /**
   * Get aggregate usage stats across all workers.
   */
  async getStats() {
    const stats = await Promise.all(
      this._workers.map(async (w) => ({
        pid: w.pid,
        ...(await w.getResourceUsage()),
      }))
    );
    return stats;
  }

  /**
   * Close all workers gracefully.
   */
  async close() {
    await Promise.all(this._workers.map((w) => w.close()));
    this._workers = [];
  }

  // ── Private ────────────────────────────────────────────────

  async _spawnWorker(workerSettings) {
    const worker = await mediasoup.createWorker({
      logLevel: workerSettings.logLevel,
      logTags: workerSettings.logTags,
      rtcMinPort: workerSettings.rtcMinPort,
      rtcMaxPort: workerSettings.rtcMaxPort,
    });

    worker.on('died', (error) => {
      logger.error(`[WorkerPool] ❌ Worker pid=${worker.pid} died:`, error);
      // In production you'd want to spawn a replacement worker here
      setTimeout(() => process.exit(1), 2000);
    });

    logger.debug(`[WorkerPool] Worker pid=${worker.pid} spawned`);
    return worker;
  }
}

// Singleton
const workerPool = new WorkerPool();
module.exports = workerPool;

'use strict';
require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const config = require('./config');
const workerPool = require('./mediasoup/WorkerPool');
const roomManager = require('./mediasoup/RoomManager');
const { registerHandlers } = require('./socket/handlers');
const logger = require('./utils/logger');

// ─────────────────────────────────────────────────────────────
//  Express + HTTP Server
// ─────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

// Health check (used by Nginx + Docker health checks)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'SmartChatX Mediasoup Server',
    rooms: roomManager.roomCount,
    uptime: Math.floor(process.uptime()),
  });
});

// Admin stats endpoint (protect in production with middleware)
app.get('/admin/rooms', (req, res) => {
  res.json({ rooms: roomManager.getRoomsInfo() });
});

app.get('/admin/workers', async (req, res) => {
  const stats = await workerPool.getStats();
  res.json({ workers: stats });
});

const httpServer = http.createServer(app);

// ─────────────────────────────────────────────────────────────
//  Socket.io Server
// ─────────────────────────────────────────────────────────────

const io = new Server(httpServer, {
  cors: {
    origin: config.http.corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // Use websocket transport only for lower latency
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ── JWT Authentication Middleware ──────────────────────────────
io.use(async (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.query?.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    // Verify the JWT (same secret as FastAPI backend)
    const payload = jwt.verify(token, config.auth.jwtSecret);

    // Attach user data to socket
    socket.data.userId = payload.user_id || payload.sub || payload.id;
    socket.data.username = payload.username;

    if (!socket.data.userId) {
      return next(new Error('Invalid token: missing user_id'));
    }

    logger.info(`[Auth] Authenticated: ${socket.data.username} (${socket.data.userId})`);
    next();
  } catch (err) {
    logger.warn(`[Auth] Token verification failed: ${err.message}`);
    next(new Error(`Authentication failed: ${err.message}`));
  }
});

// ── Connection Handler ─────────────────────────────────────────
io.on('connection', (socket) => {
  logger.info(`[Socket] Connected: ${socket.data.username} | socket=${socket.id}`);

  // Register all mediasoup + call signaling handlers
  registerHandlers(socket, io);

  socket.on('error', (err) => {
    logger.error(`[Socket] Error for ${socket.data.username}:`, err.message);
  });
});

// ─────────────────────────────────────────────────────────────
//  Startup Sequence
// ─────────────────────────────────────────────────────────────

async function main() {
  logger.info('════════════════════════════════════════════');
  logger.info('  SmartChat X — Mediasoup SFU Server');
  logger.info('════════════════════════════════════════════');

  // 1. Initialize mediasoup worker pool
  await workerPool.init();

  // 2. Start HTTP/WebSocket server
  const { port } = config.http;
  httpServer.listen(port, () => {
    logger.info(`✅ Server listening on port ${port}`);
    logger.info(`   Announced IP: ${process.env.MEDIASOUP_ANNOUNCED_IP || '127.0.0.1'}`);
    logger.info(`   RTC ports: ${config.mediasoup.worker.rtcMinPort}-${config.mediasoup.worker.rtcMaxPort}`);
    logger.info(`   CORS origin: ${config.http.corsOrigin}`);
  });

  // 3. Graceful shutdown
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

async function shutdown() {
  logger.info('[Server] Shutting down gracefully...');
  httpServer.close();
  await workerPool.close();
  process.exit(0);
}

main().catch((err) => {
  logger.error('Fatal startup error:', err);
  process.exit(1);
});

/**
 * useOfflineQueue — Offline message queue + local message cache
 * Phase 2: Full offline-first messaging
 *
 * Stores:
 *   - 'queue'  : outgoing messages pending when offline
 *   - 'cache'  : last 200 received messages for offline reading
 *
 * Returns:
 *   send(payload)            → sends or queues; returns { sent, queued }
 *   flush(ws)                → replays queue when ws reconnects
 *   queueCount               → number of queued outgoing messages
 *   loadCachedMessages()     → returns cached messages for offline reading
 *   cacheMessage(msg)        → persist a received message to IndexedDB
 */
import { useState, useRef, useCallback, useEffect } from 'react';

const DB_NAME  = 'smartchatx-offline';
const DB_VER   = 2;
const QUEUE_S  = 'queue';
const CACHE_S  = 'messages_cache';
const MAX_CACHE = 200;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(QUEUE_S)) {
        db.createObjectStore(QUEUE_S, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(CACHE_S)) {
        const cs = db.createObjectStore(CACHE_S, { keyPath: 'id' });
        cs.createIndex('ts', 'created_at', { unique: false });
      }
    };
    req.onsuccess  = (e) => resolve(e.target.result);
    req.onerror    = (e) => reject(e.target.error);
  });
}

// ── Queue helpers ────────────────────────────────────────────
async function dbEnqueue(payload) {
  const db   = await openDB();
  const tx   = db.transaction(QUEUE_S, 'readwrite');
  tx.objectStore(QUEUE_S).add({ payload, ts: Date.now() });
  return new Promise(r => tx.oncomplete = r);
}

async function dbDequeueAll() {
  const db    = await openDB();
  const tx    = db.transaction(QUEUE_S, 'readwrite');
  const store = tx.objectStore(QUEUE_S);
  const items = await new Promise((res, rej) => {
    const req = store.getAll();
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  });
  store.clear();
  await new Promise(r => tx.oncomplete = r);
  return items;
}

async function dbQueueCount() {
  try {
    const db    = await openDB();
    const tx    = db.transaction(QUEUE_S, 'readonly');
    return await new Promise((res, rej) => {
      const req = tx.objectStore(QUEUE_S).count();
      req.onsuccess = () => res(req.result);
      req.onerror   = () => rej(0);
    });
  } catch { return 0; }
}

// ── Cache helpers ────────────────────────────────────────────
async function dbCacheMessage(msg) {
  try {
    const db = await openDB();
    const tx = db.transaction(CACHE_S, 'readwrite');
    const st = tx.objectStore(CACHE_S);
    st.put({ ...msg, _cached_at: Date.now() });

    // Trim to MAX_CACHE — remove oldest
    const count = await new Promise(r => {
      const c = st.count(); c.onsuccess = () => r(c.result);
    });
    if (count > MAX_CACHE) {
      const cursor = st.index('ts').openCursor();
      let toDelete = count - MAX_CACHE;
      cursor.onsuccess = (e) => {
        if (!e.target.result || toDelete <= 0) return;
        e.target.result.delete();
        toDelete--;
        e.target.result.continue();
      };
    }
    await new Promise(r => tx.oncomplete = r);
  } catch {}
}

async function dbLoadCachedMessages() {
  try {
    const db    = await openDB();
    const tx    = db.transaction(CACHE_S, 'readonly');
    return await new Promise((res, rej) => {
      const req = tx.objectStore(CACHE_S).index('ts').getAll();
      req.onsuccess = () => res(req.result || []);
      req.onerror   = () => rej([]);
    });
  } catch { return []; }
}

// ══════════════════════════════════════════════════════════════
export function useOfflineQueue(ws) {
  const [queueCount, setQueueCount]  = useState(0);
  const flushingRef  = useRef(false);
  const memBuffer    = useRef([]); // last-resort if IndexedDB unavailable

  // Refresh count badge
  const refreshCount = useCallback(async () => {
    setQueueCount(await dbQueueCount() + memBuffer.current.length);
  }, []);

  useEffect(() => { refreshCount(); }, [refreshCount]);

  // ── Flush queue → WS ────────────────────────────────────────
  const flush = useCallback(async (wsInstance) => {
    if (flushingRef.current) return;
    if (!wsInstance || wsInstance.readyState !== WebSocket.OPEN) return;
    flushingRef.current = true;
    try {
      const dbItems = await dbDequeueAll();
      const memItems = memBuffer.current.map(p => ({ payload: p }));
      memBuffer.current = [];
      const all = [...memItems, ...dbItems];
      for (const item of all) {
        const str = typeof item.payload === 'string'
          ? item.payload
          : JSON.stringify(item.payload);
        wsInstance.send(str);
        await new Promise(r => setTimeout(r, 80)); // flood protection
      }
    } finally {
      flushingRef.current = false;
      refreshCount();
    }
  }, [refreshCount]);

  // Auto-flush on WS open
  useEffect(() => {
    if (!ws) return;
    const onOpen = () => flush(ws);
    ws.addEventListener('open', onOpen);
    return () => ws.removeEventListener('open', onOpen);
  }, [ws, flush]);

  // ── send — live or queue ─────────────────────────────────────
  const send = useCallback(async (payload) => {
    const str = typeof payload === 'string' ? payload : JSON.stringify(payload);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(str);
      return { sent: true, queued: false };
    }
    // Queue for later
    try {
      await dbEnqueue(payload);
    } catch {
      memBuffer.current.push(payload);
    }
    await refreshCount();
    return { sent: false, queued: true };
  }, [ws, refreshCount]);

  // ── persist received messages ───────────────────────────────
  const cacheMessage = useCallback((msg) => {
    if (msg?.id) dbCacheMessage(msg);
  }, []);

  // ── read local cache (for offline view) ─────────────────────
  const loadCachedMessages = useCallback(async () => {
    return dbLoadCachedMessages();
  }, []);

  return { send, flush, queueCount, cacheMessage, loadCachedMessages };
}

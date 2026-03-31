/**
 * SmartChat X — Service Worker
 * Phase 4: Offline-first asset caching + background sync
 *
 * Strategy:
 *  - Static assets (JS/CSS/fonts) → Cache-first
 *  - API requests → Network-first, cache fallback
 *  - Images → Stale-while-revalidate
 */

const CACHE_NAME    = 'smartchatx-v1';
const API_CACHE     = 'smartchatx-api-v1';
const IMAGE_CACHE   = 'smartchatx-img-v1';

// Assets to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
];

// ── Install: pre-cache shell ─────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ───────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => ![CACHE_NAME, API_CACHE, IMAGE_CACHE].includes(k))
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: routing strategy ──────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip: non-GET, WebSocket, chrome-extension
  if (request.method !== 'GET') return;
  if (url.protocol === 'ws:' || url.protocol === 'wss:') return;
  if (url.protocol === 'chrome-extension:') return;

  // Images → stale-while-revalidate
  if (request.destination === 'image') {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE));
    return;
  }

  // API requests → network-first, fallback to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithCache(request, API_CACHE));
    return;
  }

  // Static assets (JS/CSS/fonts/app shell) → cache-first
  event.respondWith(cacheFirst(request, CACHE_NAME));
});

// ── Strategy helpers ─────────────────────────────────────────
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirstWithCache(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response(JSON.stringify({ error: 'Offline', cached: true }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then(res => { if (res.ok) cache.put(request, res.clone()); return res; })
    .catch(() => null);
  return cached || (await fetchPromise) || new Response('', { status: 503 });
}

// ── Background Sync (queue flush notification) ────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'smartchatx-message-sync') {
    // Notify all clients to flush their queue
    event.waitUntil(
      self.clients.matchAll().then(clients =>
        clients.forEach(c => c.postMessage({ type: 'SYNC_FLUSH' }))
      )
    );
  }
});

// ── Push Notifications ────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data;
  try { data = event.data.json(); } catch { data = { title: 'SmartChat X', body: event.data.text() }; }

  event.waitUntil(
    self.registration.showNotification(data.title || 'SmartChat X', {
      body:  data.body  || 'New message',
      icon:  '/icon-192.png',
      badge: '/icon-72.png',
      tag:   data.tag   || 'smartchatx',
      data:  { url: '/' },
      actions: [{ action: 'open', title: 'Open' }],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      const existing = clients.find(c => c.url.includes(self.location.origin));
      if (existing) return existing.focus();
      return self.clients.openWindow('/');
    })
  );
});

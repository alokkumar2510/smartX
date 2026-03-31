/**
 * serviceWorkerRegistration.js
 * Registers the SmartChat X service worker (Phase 4)
 * + registers Background Sync for offline message flush (Phase 2)
 */

export async function registerSW() {
  if (!('serviceWorker' in navigator)) return;

  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    console.log('[SW] Registered:', reg.scope);

    // Listen for SYNC_FLUSH from SW background sync
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'SYNC_FLUSH') {
        window.dispatchEvent(new CustomEvent('smartchatx:sync-flush'));
      }
    });

    return reg;
  } catch (err) {
    console.warn('[SW] Registration failed:', err);
  }
}

/**
 * Request background sync — called when WS goes offline
 * The SW will fire a 'sync' event once the device regains connectivity
 */
export async function requestBackgroundSync() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    if ('sync' in reg) {
      await reg.sync.register('smartchatx-message-sync');
    }
  } catch {}
}

/**
 * Check if the app is running in standalone/PWA mode
 */
export function isPWA() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

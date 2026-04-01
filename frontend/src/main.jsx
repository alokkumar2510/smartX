import { StrictMode, Component } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { registerSW } from './lib/serviceWorkerRegistration';

/**
 * Error Boundary — catches React render crashes and shows recovery UI
 * instead of a blank/black screen.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] React crashed:', error, info.componentStack);
  }
  handleClearAndReload = async () => {
    // Unregister all service workers
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const reg of regs) await reg.unregister();
    }
    // Clear all caches
    if ('caches' in window) {
      const keys = await caches.keys();
      for (const key of keys) await caches.delete(key);
    }
    // Clear local/session storage
    try { localStorage.clear(); } catch {}
    try { sessionStorage.clear(); } catch {}
    // Hard reload
    window.location.reload(true);
  };
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#0a0a0f', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif',
          flexDirection: 'column', gap: '20px', padding: '40px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '48px' }}>⚡</div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#6366f1' }}>SmartChat X — Something went wrong</h1>
          <p style={{ color: '#888', maxWidth: '500px', lineHeight: 1.6 }}>
            The app encountered an unexpected error. This is often caused by a stale cache. 
            Click below to clear all cached data and reload.
          </p>
          <button onClick={this.handleClearAndReload} style={{
            padding: '12px 32px', borderRadius: '12px', border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff',
            fontWeight: 600, fontSize: '16px', transition: 'transform 0.2s',
          }}>
            🔄 Clear Cache & Reload
          </button>
          <details style={{ color: '#666', maxWidth: '600px', fontSize: '12px', marginTop: '12px' }}>
            <summary style={{ cursor: 'pointer' }}>Error details</summary>
            <pre style={{ textAlign: 'left', overflow: 'auto', padding: '12px', background: '#111', borderRadius: '8px', marginTop: '8px' }}>
              {this.state.error?.toString()}
            </pre>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * On boot: clear old v1 caches that may contain stale JS bundles
 * with outdated API keys baked in.
 */
async function clearStaleCaches() {
  if (!('caches' in window)) return;
  const keys = await caches.keys();
  const stale = keys.filter(k => k.includes('-v1'));
  for (const key of stale) {
    await caches.delete(key);
    console.log('[Cache] Cleared stale cache:', key);
  }
}

clearStaleCaches();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);

// Phase 4: Register service worker for offline-first caching
registerSW();


/**
 * NetworkBanner — Unified connection + network mode status bar
 * Handles: connected, connecting, reconnecting, server_offline, auth_failed, disconnected
 * Used in: App.jsx (top of ChatDashboard)
 */
import { useNetwork } from '../context/NetworkContext';

const ICONS = { high: '📶', medium: '📉', low: '🔴' };

const NetworkBanner = ({ connectionStatus, reconnectIn, onRetry }) => {
  const { mode, isOnline, forceMode } = useNetwork();

  const showLowData    = mode !== 'high';
  const showConnection = connectionStatus !== 'connected';

  // Nothing to show
  if (!showLowData && !showConnection) return null;

  // ── Connection status messages ─────────────
  const getConnectionBanner = () => {
    switch (connectionStatus) {
      case 'connecting':
        return {
          text: '🔄 Connecting to server...',
          bg: 'rgba(99,102,241,0.1)',
          border: 'rgba(99,102,241,0.2)',
          color: '#818cf8',
        };

      case 'reconnecting':
        return {
          text: `⏳ Reconnecting in ${reconnectIn}s...`,
          bg: 'rgba(255,170,0,0.1)',
          border: 'rgba(255,170,0,0.2)',
          color: '#ffaa00',
        };

      case 'server_offline':
        return {
          text: reconnectIn > 0
            ? `🔴 Server offline — retrying in ${reconnectIn}s...`
            : '🔴 Server is offline. Click to retry.',
          bg: 'rgba(255,45,120,0.1)',
          border: 'rgba(255,45,120,0.2)',
          color: '#ff2d78',
          showRetry: reconnectIn <= 0,
        };

      case 'auth_failed':
        return {
          text: '🔐 Authentication failed — please log in again',
          bg: 'rgba(239,68,68,0.1)',
          border: 'rgba(239,68,68,0.2)',
          color: '#ef4444',
        };

      case 'disconnected':
        return {
          text: '⚠ Disconnected from server',
          bg: 'rgba(255,45,120,0.1)',
          border: 'rgba(255,45,120,0.2)',
          color: '#ff2d78',
        };

      default:
        return null;
    }
  };

  const connectionBanner = showConnection ? getConnectionBanner() : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', zIndex: 300 }}>

      {/* ── Connection status ───────────────── */}
      {connectionBanner && (
        <div
          onClick={connectionBanner.showRetry ? onRetry : undefined}
          style={{
            padding: '6px 16px', textAlign: 'center', fontSize: '12px', fontFamily: 'monospace',
            fontWeight: '600', letterSpacing: '0.02em',
            background: connectionBanner.bg,
            borderBottom: `1px solid ${connectionBanner.border}`,
            color: connectionBanner.color,
            cursor: connectionBanner.showRetry ? 'pointer' : 'default',
            transition: 'background 0.2s ease',
          }}
        >
          {connectionBanner.text}
          {connectionBanner.showRetry && (
            <span style={{ marginLeft: '8px', textDecoration: 'underline', opacity: 0.8 }}>⟳ Retry</span>
          )}
        </div>
      )}

      {/* ── Low / Medium Data Mode indicator ─────────── */}
      {showLowData && (
        <div style={{
          padding: '5px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: mode === 'low' ? 'rgba(255,69,58,0.08)' : 'rgba(255,159,10,0.08)',
          borderBottom: `1px solid ${mode === 'low' ? 'rgba(255,69,58,0.2)' : 'rgba(255,159,10,0.15)'}`,
        }}>
          <span style={{
            fontSize: '12px', fontWeight: '600', fontFamily: 'monospace',
            color: mode === 'low' ? '#ff453a' : '#ff9f0a',
            letterSpacing: '0.02em',
          }}>
            {ICONS[mode]}&nbsp;
            {mode === 'low'    ? 'Low Data Mode Active — Text only' : 'Medium Network — Reduced quality'}
          </span>

          {/* Manual override: restore full mode */}
          <button
            onClick={() => forceMode(null)}
            title="Re-detect network"
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: '11px', color: 'rgba(255,255,255,0.4)',
              padding: '2px 6px', borderRadius: '4px',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
          >
            ↺
          </button>
        </div>
      )}
    </div>
  );
};

export default NetworkBanner;

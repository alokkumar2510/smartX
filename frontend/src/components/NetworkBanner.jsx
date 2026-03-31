/**
 * NetworkBanner — Unified connection + network mode status bar
 * Replaces old ConnectionBanner.jsx
 * Used in: App.jsx (top of ChatDashboard)
 */
import { useNetwork } from '../context/NetworkContext';

const ICONS = { high: '📶', medium: '📉', low: '🔴' };

const NetworkBanner = ({ connectionStatus, reconnectIn, onForceMode }) => {
  const { mode, isOnline, forceMode } = useNetwork();

  const showLowData    = mode !== 'high';
  const showDisconnect = connectionStatus !== 'connected';

  // Nothing to show
  if (!showLowData && !showDisconnect) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', zIndex: 300 }}>

      {/* ── Connection status (existing) ───────────────── */}
      {showDisconnect && (
        <div style={{
          padding: '6px 16px', textAlign: 'center', fontSize: '12px', fontFamily: 'monospace',
          fontWeight: '600', letterSpacing: '0.02em',
          background: connectionStatus === 'reconnecting' ? 'rgba(255,170,0,0.1)' : 'rgba(255,45,120,0.1)',
          borderBottom: `1px solid ${connectionStatus === 'reconnecting' ? 'rgba(255,170,0,0.2)' : 'rgba(255,45,120,0.2)'}`,
          color: connectionStatus === 'reconnecting' ? '#ffaa00' : '#ff2d78',
        }}>
          {connectionStatus === 'reconnecting'
            ? `⏳ Reconnecting in ${reconnectIn}s...`
            : '⚠ Disconnected from server'}
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

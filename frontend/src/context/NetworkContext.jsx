/**
 * NetworkContext — Global network mode state
 * Provides: mode, isOnline, isLow, isMedium, isHigh, forceMode
 *
 * Also applies CSS class to <html> so CSS can react:
 *   html.net-low  → disable animations, reduce quality
 *   html.net-med  → partial quality reduction
 *   html.net-high → full features
 */
import { createContext, useContext } from 'react';
import { useNetworkMode } from '../hooks/useNetworkMode';

const NetworkContext = createContext(null);

export function NetworkProvider({ children }) {
  const { mode, isOnline, forceMode } = useNetworkMode();

  // Apply CSS class to <html> root
  const html = document.documentElement;
  html.classList.remove('net-low', 'net-med', 'net-high');
  html.classList.add(`net-${mode === 'medium' ? 'med' : mode}`);

  return (
    <NetworkContext.Provider value={{
      mode,
      isOnline,
      forceMode,
      isLow:    mode === 'low',
      isMedium: mode === 'medium',
      isHigh:   mode === 'high',
    }}>
      {children}
    </NetworkContext.Provider>
  );
}

export const useNetwork = () => {
  const ctx = useContext(NetworkContext);
  if (!ctx) throw new Error('useNetwork must be used within NetworkProvider');
  return ctx;
};

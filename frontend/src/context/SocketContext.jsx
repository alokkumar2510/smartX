/**
 * ─── SocketContext.jsx ─────────────────────────────────
 * Provides WebSocket connection and methods to all children.
 */
import { createContext, useContext } from 'react';
import useWebSocket from '@/hooks/useWebSocket';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const ws = useWebSocket();

  return (
    <SocketContext.Provider value={ws}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within SocketProvider');
  return context;
};

export default SocketContext;

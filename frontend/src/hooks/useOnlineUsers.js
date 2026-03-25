/**
 * ─── useOnlineUsers.js ─────────────────────────────────
 * Hook for tracking online users via WebSocket presence events.
 */
import { useState, useEffect, useCallback } from 'react';

const useOnlineUsers = (lastMessage) => {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === 'user_joined') {
      setUsers((prev) => [...prev.filter((u) => u.id !== lastMessage.user.id), { ...lastMessage.user, status: 'online' }]);
    }

    if (lastMessage.type === 'user_left') {
      setUsers((prev) => prev.filter((u) => u.id !== lastMessage.userId));
    }

    if (lastMessage.type === 'user_list') {
      setUsers(lastMessage.users.map((u) => ({ ...u, status: 'online' })));
    }
  }, [lastMessage]);

  const getUser = useCallback((id) => users.find((u) => u.id === id), [users]);

  return { users, onlineCount: users.length, getUser };
};

export default useOnlineUsers;

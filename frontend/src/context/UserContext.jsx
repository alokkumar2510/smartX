/**
 * ─── UserContext.jsx ───────────────────────────────────
 * Provides user state (username, preferences) to all children.
 */
import { createContext, useContext, useState, useCallback } from 'react';
import useLocalStorage from '@/hooks/useLocalStorage';

const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const [username, setUsername] = useLocalStorage('smartchat_username', '');
  const [isLoggedIn, setIsLoggedIn] = useState(!!username);

  const login = useCallback((name) => {
    setUsername(name);
    setIsLoggedIn(true);
  }, [setUsername]);

  const logout = useCallback(() => {
    setUsername('');
    setIsLoggedIn(false);
  }, [setUsername]);

  return (
    <UserContext.Provider value={{ username, isLoggedIn, login, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within UserProvider');
  return context;
};

export default UserContext;

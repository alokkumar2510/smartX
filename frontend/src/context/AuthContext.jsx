import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Profile sync — upsert into our `users` table ──────────────────
  const syncProfile = useCallback(async (supabaseUser) => {
    if (!supabaseUser) return null;
    try {
      const meta     = supabaseUser.user_metadata || {};
      const username = meta.username || meta.display_name
                     || supabaseUser.email?.split('@')[0]
                     || 'user';
      const avatar   = meta.avatar || '👤';

      const { data: existing } = await supabase
        .from('users')
        .select('id, username, avatar, supabase_id')
        .eq('username', username)
        .maybeSingle();

      if (existing) {
        // Backfill supabase_id if it's missing
        if (!existing.supabase_id) {
          await supabase.from('users').update({ supabase_id: supabaseUser.id }).eq('id', existing.id);
        }
        return { id: existing.id, username: existing.username,
                 avatar: existing.avatar, email: supabaseUser.email,
                 supabase_id: supabaseUser.id };
      }

      const { data: created } = await supabase
        .from('users')
        .insert({ username, password_hash: 'supabase_auth', avatar, supabase_id: supabaseUser.id })
        .select('id, username, avatar')
        .single();

      if (created) {
        return { id: created.id, username: created.username,
                 avatar: created.avatar, email: supabaseUser.email,
                 supabase_id: supabaseUser.id };
      }
    } catch (e) {
      console.warn('[AuthContext] Profile sync:', e.message);
    }
    // Fallback — use Supabase auth data directly
    return {
      id:          supabaseUser.id,
      username:    supabaseUser.user_metadata?.username
                 || supabaseUser.email?.split('@')[0]
                 || 'user',
      avatar:      supabaseUser.user_metadata?.avatar || '👤',
      email:       supabaseUser.email,
      supabase_id: supabaseUser.id,
    };
  }, []);

  // ── Session bootstrap on mount ─────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (s) {
        setSession(s);
        setToken(s.access_token);
        setUser(await syncProfile(s.user));
      }
      setLoading(false);
    };
    init();

    // Real-time auth state listener — handles token refresh, login, logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (s) {
        setSession(s);
        setToken(s.access_token);
        // Refresh profile on relevant events
        if (['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED'].includes(event)) {
          setUser(await syncProfile(s.user));
        }
      } else {
        setSession(null);
        setToken(null);
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [syncProfile]);

  // ── Auth actions ───────────────────────────────────────────────────

  /** Sign up with email + password. Sets user metadata for username/avatar. */
  const signUp = async (email, password, username, avatar = '👤') => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, avatar, display_name: username },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
    return data;
  };

  /** Sign in with email + password. */
  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  /** Backward-compat shim for legacy custom-JWT login (keeps existing code working). */
  const legacyLogin = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    sessionStorage.setItem('smartchat_auth', JSON.stringify({ user: userData, token: authToken }));
  };

  /** Sign out — clears Supabase session and all local storage. */
  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setToken(null);
    setSession(null);
    sessionStorage.removeItem('smartchat_auth');
  };

  /**
   * Trigger a password reset email.
   * The link lands on /auth/reset-password with `type=recovery` in the URL hash.
   */
  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) throw error;
  };

  /** Update password — called after the user clicks the recovery link. */
  const updatePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  };

  /** Resend the signup verification email. */
  const resendVerification = async (email) => {
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) throw error;
  };

  /**
   * Get a fresh access token for backend API calls.
   * Falls back to the stored token if refresh hasn't materialised yet.
   */
  const getToken = async () => {
    const { data: { session: s } } = await supabase.auth.getSession();
    return s?.access_token ?? token;
  };

  return (
    <AuthContext.Provider value={{
      user, token, session, loading,
      login, legacyLogin, signUp, logout,
      resetPassword, updatePassword, resendVerification,
      getToken,
      isLoggedIn:       !!token,
      isEmailVerified:  session?.user?.email_confirmed_at != null,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

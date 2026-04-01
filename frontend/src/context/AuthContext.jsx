import { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const mountedRef            = useRef(true);

  // ── Profile sync — upsert into `users` table ──────────────────────
  const syncProfile = useCallback(async (supabaseUser) => {
    if (!supabaseUser) return null;
    try {
      const meta     = supabaseUser.user_metadata || {};
      const username = meta.username || meta.display_name
                     || supabaseUser.email?.split('@')[0]
                     || 'user';
      const avatar   = meta.avatar || '👤';

      const { data: existing } = await supabase
        .from('users').select('id, username, avatar, supabase_id')
        .eq('supabase_id', supabaseUser.id).maybeSingle();

      if (existing) {
        return { id: existing.id, username: existing.username,
                 avatar: existing.avatar, email: supabaseUser.email,
                 supabase_id: supabaseUser.id };
      }

      // Try by username collision
      const { data: byUsername } = await supabase
        .from('users').select('id, username, avatar, supabase_id')
        .eq('username', username).maybeSingle();

      if (byUsername) {
        if (!byUsername.supabase_id) {
          await supabase.from('users').update({ supabase_id: supabaseUser.id }).eq('id', byUsername.id);
        }
        return { id: byUsername.id, username: byUsername.username,
                 avatar: byUsername.avatar, email: supabaseUser.email,
                 supabase_id: supabaseUser.id };
      }

      const { data: created } = await supabase
        .from('users')
        .insert({ username, password_hash: 'supabase_managed', avatar, supabase_id: supabaseUser.id })
        .select('id, username, avatar').single();

      if (created) {
        return { id: created.id, username: created.username,
                 avatar: created.avatar, email: supabaseUser.email,
                 supabase_id: supabaseUser.id };
      }
    } catch (e) {
      console.warn('[AuthContext] syncProfile:', e.message);
    }
    return {
      id:          supabaseUser.id,
      username:    supabaseUser.user_metadata?.username || supabaseUser.email?.split('@')[0] || 'user',
      avatar:      supabaseUser.user_metadata?.avatar || '👤',
      email:       supabaseUser.email,
      supabase_id: supabaseUser.id,
    };
  }, []);

  // ── Session bootstrap ──────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;

    const isExpired = (s) => s?.expires_at && s.expires_at * 1000 < Date.now();

    const init = async () => {
      try {
        const { data: { session: s } } = await Promise.race([
          supabase.auth.getSession(),
          new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 5000)),
        ]);
        if (mountedRef.current && s) {
          if (isExpired(s)) {
            console.warn('[Auth] Session expired — clearing');
            await supabase.auth.signOut().catch(() => {});
          } else {
            setSession(s);
            setToken(s.access_token);
            setUser(await syncProfile(s.user));
          }
        }
      } catch (e) {
        console.warn('[Auth] Bootstrap:', e.message);
        if (e.message === 'timeout') {
          try { window.localStorage.removeItem('smartchat_supabase_auth'); } catch {}
          supabase.auth.signOut().catch(() => {});
        }
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };
    init();

    // Safety: never stay loading > 6s
    const safetyTimer = setTimeout(() => {
      if (mountedRef.current) setLoading(false);
    }, 6000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (!mountedRef.current) return;
      if (s && !isExpired(s)) {
        setSession(s);
        setToken(s.access_token);
        if (['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED'].includes(event)) {
          setUser(await syncProfile(s.user));
        }
      } else {
        setSession(null); setToken(null); setUser(null);
        if (s && isExpired(s)) {
          supabase.auth.signOut().catch(() => {});
        }
      }
      if (mountedRef.current) setLoading(false);
    });

    return () => {
      mountedRef.current = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, [syncProfile]);

  // ══════════════════════════════════════════════════════════════════
  //  AUTH ACTIONS
  // ══════════════════════════════════════════════════════════════════

  /**
   * LOGIN — email + password, no OTP needed.
   */
  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) {
      if (error.message?.toLowerCase().includes('invalid login')) {
        throw new Error('Incorrect email or password.');
      }
      if (error.message?.toLowerCase().includes('email not confirmed')) {
        throw new Error('Please verify your email before logging in.');
      }
      throw new Error(error.message || 'Login failed. Please try again.');
    }
    return data;
  };

  /**
   * SIGNUP STEP 1 — creates account and sends 6-digit OTP to email.
   * username is stored in user_metadata.
   */
  const signUp = async (email, password, username) => {
    const cleaned = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email: cleaned,
      password,
      options: {
        data: { username, avatar: '👤' },
        // No emailRedirectTo → Supabase sends 6-digit OTP token
      },
    });
    if (error) {
      if (error.message?.includes('already registered') || error.message?.includes('already exists')) {
        throw new Error('An account with this email already exists. Please log in instead.');
      }
      if (error.message?.includes('rate limit') || error.status === 429) {
        throw new Error('Too many requests. Please wait a minute and try again.');
      }
      throw new Error(error.message || 'Signup failed. Please try again.');
    }
    // If user already exists Supabase may return a user with identities = []
    if (data.user && data.user.identities?.length === 0) {
      throw new Error('An account with this email already exists. Please log in instead.');
    }
    return data;
  };

  /**
   * SIGNUP STEP 2 — verify the 6-digit OTP sent to email during signup.
   */
  const verifyEmailOtp = async (email, token) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: String(token).trim(),
      type: 'signup',
    });
    if (error) throw new Error(error.message || 'Invalid or expired code. Please try again.');
    if (!data.session) throw new Error('Verification failed — no session returned.');
    return data;
  };

  /**
   * LOGOUT
   */
  const logout = async () => {
    try { await supabase.auth.signOut(); } catch {}
    setUser(null); setToken(null); setSession(null);
  };

  const getToken = async () => {
    const { data: { session: s } } = await supabase.auth.getSession();
    return s?.access_token ?? token;
  };

  // Legacy compat
  const legacyLogin = (userData, authToken) => {
    setUser(userData); setToken(authToken);
  };

  return (
    <AuthContext.Provider value={{
      user, token, session, loading,
      login, signUp, verifyEmailOtp,
      legacyLogin, logout, getToken,
      isLoggedIn:      !!token,
      isEmailVerified: !!token,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

import { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

// Edge Function URLs (same project as the frontend Supabase instance)
const FN_BASE = 'https://taoxhelakyimveurqvbn.functions.supabase.co';

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const otpCooldownRef        = useRef(0);

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
        .insert({ username, password_hash: 'supabase_otp', avatar, supabase_id: supabaseUser.id })
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
    const init = async () => {
      try {
        const { data: { session: s } } = await Promise.race([
          supabase.auth.getSession(),
          new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 8000)),
        ]);
        if (s) {
          setSession(s); setToken(s.access_token);
          setUser(await syncProfile(s.user));
        }
      } catch (e) {
        console.warn('[Auth] Session bootstrap:', e.message);
      }
      setLoading(false);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (s) {
        setSession(s); setToken(s.access_token);
        if (['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED'].includes(event)) {
          setUser(await syncProfile(s.user));
        }
      } else {
        setSession(null); setToken(null); setUser(null);
      }
    });
    return () => subscription.unsubscribe();
  }, [syncProfile]);

  // ── OTP Actions ────────────────────────────────────────────────────

  const sendOtp = async (email) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true
      }
    });
    
    if (error) {
      throw new Error(error.message || 'Failed to send code');
    }
    
    const cooldownUntil = Date.now() + 60_000;
    otpCooldownRef.current = cooldownUntil;
    return { cooldownUntil };
  };

  const verifyOtp = async (email, code) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: String(code).trim(),
      type: 'email'
    });
    
    if (error) throw new Error(error.message || 'Invalid code. Please try again.');
    if (!data.session) throw new Error('Failed to retrieve session.');

    return data;
  };

  /** Resend — enforces 60-second cooldown client-side as well as server-side */
  const resendOtp = async (email) => {
    const remaining = otpCooldownRef.current - Date.now();
    if (remaining > 0) {
      throw new Error(`Please wait ${Math.ceil(remaining / 1000)}s before requesting another code.`);
    }
    return sendOtp(email);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null); setToken(null); setSession(null);
  };

  const getToken = async () => {
    const { data: { session: s } } = await supabase.auth.getSession();
    return s?.access_token ?? token;
  };

  const legacyLogin = (userData, authToken) => {
    setUser(userData); setToken(authToken);
  };

  return (
    <AuthContext.Provider value={{
      user, token, session, loading,
      sendOtp, verifyOtp, resendOtp,
      legacyLogin, logout, getToken,
      isLoggedIn:      !!token,
      isEmailVerified: !!token,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

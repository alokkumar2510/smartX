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
    let mounted = true;
    let sessionClearedDueToTimeout = false;

    /** Check if a Supabase session JWT has expired */
    const isSessionExpired = (s) => {
      if (!s?.expires_at) return false;
      // expires_at is in seconds since epoch
      return s.expires_at * 1000 < Date.now();
    };

    const init = async () => {
      try {
        const { data: { session: s } } = await Promise.race([
          supabase.auth.getSession(),
          new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 5000)),
        ]);
        if (mounted && s) {
          // Reject expired sessions — force re-login
          if (isSessionExpired(s)) {
            console.warn('[Auth] Session expired, clearing…');
            await supabase.auth.signOut().catch(() => {});
            try { window.localStorage.removeItem('smartchat_supabase_auth'); } catch {}
          } else {
            setSession(s); setToken(s.access_token);
            setUser(await syncProfile(s.user));
          }
        }
      } catch (e) {
        console.warn('[Auth] Session bootstrap:', e.message);
        // Clear any stale session data on timeout
        if (e.message === 'timeout') {
          sessionClearedDueToTimeout = true;
          try { window.localStorage.removeItem('smartchat_supabase_auth'); } catch {}
          // Also try a proper sign-out to clear Supabase internal state
          supabase.auth.signOut().catch(() => {});
        }
      }
      if (mounted) setLoading(false);
    };
    init();

    // Safety fallback — never stay loading for more than 6 seconds
    const safetyTimer = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 6000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      // If we cleared session due to timeout, ignore stale SIGNED_IN events
      // (they may fire from a cached session we just invalidated)
      if (sessionClearedDueToTimeout && event === 'SIGNED_IN') {
        console.warn('[Auth] Ignoring stale SIGNED_IN after timeout cleanup');
        return;
      }
      if (s) {
        // Always validate session isn't expired
        if (isSessionExpired(s)) {
          setSession(null); setToken(null); setUser(null);
          await supabase.auth.signOut().catch(() => {});
        } else {
          setSession(s); setToken(s.access_token);
          if (['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED'].includes(event)) {
            setUser(await syncProfile(s.user));
          }
        }
      } else {
        setSession(null); setToken(null); setUser(null);
      }
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, [syncProfile]);

  // ── OTP Actions ────────────────────────────────────────────────────

  const sendOtp = async (email) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        // Do NOT set emailRedirectTo — this forces Supabase to send
        // a 6-digit OTP code instead of a magic link URL
      }
    });
    
    if (error) {
      // Provide user-friendly messages for common errors
      if (error.message?.includes('rate limit') || error.status === 429) {
        throw new Error('Too many requests. Please wait a few minutes before trying again.');
      }
      if (error.message?.includes('invalid')) {
        throw new Error('Please enter a valid email address.');
      }
      throw new Error(error.message || 'Failed to send code. Please try again.');
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

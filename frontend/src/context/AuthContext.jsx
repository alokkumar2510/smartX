/**
 * SmartChatX — AuthContext
 *
 * SIGNUP: email + password → 6-digit OTP verification → mark is_verified = true
 * LOGIN:  email + password → check is_verified → allow or redirect to OTP screen
 * NO magic links. NO OTP during login.
 */
import { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null);
  const [token, setToken]             = useState(null);
  const [session, setSession]         = useState(null);
  const [loading, setLoading]         = useState(true);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  // When login detects an unverified user, store their email here so the
  // OTP screen knows where to send/verify codes.
  const [pendingVerifyEmail, setPendingVerifyEmail] = useState(null);

  const mountedRef = useRef(true);

  // ── helpers ────────────────────────────────────────────────────────────────

  const isExpired = (s) => s?.expires_at && s.expires_at * 1000 < Date.now();

  /**
   * Fetch the profiles.is_verified flag for a given auth user id.
   * Returns true  if the row exists & is_verified = true.
   * Returns false otherwise (including network errors — safe default).
   */
  const fetchIsVerified = useCallback(async (supabaseUserId) => {
    if (!supabaseUserId) return false;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_verified')
        .eq('id', supabaseUserId)
        .maybeSingle();
      if (error) {
        console.warn('[AuthContext] fetchIsVerified error:', error.message);
        return false;
      }
      return data?.is_verified === true;
    } catch (e) {
      console.warn('[AuthContext] fetchIsVerified exception:', e.message);
      return false;
    }
  }, []);

  // ── Profile sync — upsert into `users` table ───────────────────────────────
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

  // ── Full session setup — called whenever we have a live session ────────────
  const applySession = useCallback(async (s) => {
    if (!s || !mountedRef.current) return;
    setSession(s);
    setToken(s.access_token);

    // Check verified status from DB (source of truth)
    const verified = await fetchIsVerified(s.user.id);
    if (!mountedRef.current) return;
    setIsEmailVerified(verified);

    if (verified) {
      const profile = await syncProfile(s.user);
      if (mountedRef.current) setUser(profile);
    }
    // If NOT verified, keep user=null so they can't access the dashboard
  }, [fetchIsVerified, syncProfile]);

  // ── Session bootstrap ──────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;

    const init = async () => {
      try {
        const { data: { session: s } } = await Promise.race([
          supabase.auth.getSession(),
          new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 5000)),
        ]);
        if (mountedRef.current && s && !isExpired(s)) {
          await applySession(s);
        } else if (s && isExpired(s)) {
          console.warn('[Auth] Expired session — clearing');
          await supabase.auth.signOut().catch(() => {});
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

    // Safety: never stay loading > 7s
    const safetyTimer = setTimeout(() => {
      if (mountedRef.current) setLoading(false);
    }, 7000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (!mountedRef.current) return;
      console.log('[Auth] Event:', event);

      if (event === 'SIGNED_OUT') {
        setSession(null); setToken(null); setUser(null);
        setIsEmailVerified(false); setPendingVerifyEmail(null);
        if (mountedRef.current) setLoading(false);
        return;
      }

      if (s && !isExpired(s)) {
        if (['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED'].includes(event)) {
          await applySession(s);
        }
      } else if (s && isExpired(s)) {
        setSession(null); setToken(null); setUser(null);
        setIsEmailVerified(false);
        supabase.auth.signOut().catch(() => {});
      }

      if (mountedRef.current) setLoading(false);
    });

    return () => {
      mountedRef.current = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, [applySession]);

  // ════════════════════════════════════════════════════════════════════════════
  //  AUTH ACTIONS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * SIGNUP STEP 1 — create account, Supabase sends 6-digit email OTP.
   * Returns the email used (for step 2).
   */
  const signUp = async (email, password, username) => {
    const cleaned = email.trim().toLowerCase();
    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleaned,
        password,
        options: {
          data: { username, avatar: '👤' },
          // No emailRedirectTo → Supabase sends 6-digit OTP (not magic link)
        },
      });
      if (error) {
        if (error.message?.includes('already registered') || error.message?.includes('already exists')) {
          throw new Error('An account with this email already exists. Please log in instead.');
        }
        if (error.status === 429 || error.message?.includes('rate limit')) {
          throw new Error('Too many requests. Please wait a minute and try again.');
        }
        throw new Error(error.message || 'Signup failed. Please try again.');
      }
      // Supabase returns user with empty identities if email already registered
      if (data.user?.identities?.length === 0) {
        throw new Error('An account with this email already exists. Please log in instead.');
      }
      return cleaned;
    } catch (e) {
      // If it's already a properly formatted Error, re-throw as-is
      if (e instanceof Error) throw e;
      throw new Error(String(e) || 'Signup failed. Please try again.');
    }
  };

  /**
   * SIGNUP STEP 2 — verify the 6-digit OTP sent during signup.
   * On success: sets is_verified=true in profiles, then loads the user into state.
   */
  const verifyEmailOtp = async (email, otpToken) => {
    const cleaned = email.trim().toLowerCase();
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: cleaned,
        token: String(otpToken).trim(),
        type: 'signup',
      });
      if (error) {
        if (error.message?.includes('expired') || error.message?.includes('invalid')) {
          throw new Error('Code expired or invalid. Request a new one and try again.');
        }
        throw new Error(error.message || 'Invalid or expired code. Please try again.');
      }
      if (!data.session) throw new Error('Verification failed — no session returned. Please try again.');

      // DB trigger already sets is_verified=true when email_confirmed_at is set.
      // But we also do an explicit upsert as a safety net.
      await supabase
        .from('profiles')
        .upsert({ id: data.session.user.id, email: cleaned, is_verified: true },
                 { onConflict: 'id' });

      // Clear the pending verification state
      setPendingVerifyEmail(null);
      // applySession will be called by onAuthStateChange (SIGNED_IN event)
      return data;
    } catch (e) {
      if (e instanceof Error) throw e;
      throw new Error(e.message || 'Verification failed. Please try again.');
    }
  };

  /**
   * RESEND OTP — sends a new OTP to the email (signup type).
   */
  const resendOtp = async (email) => {
    const cleaned = email.trim().toLowerCase();
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: cleaned,
      });
      if (error) {
        if (error.status === 429 || error.message?.includes('rate limit')) {
          throw new Error('Too many requests. Please wait a minute before resending.');
        }
        throw new Error(error.message || 'Failed to resend code. Please try again.');
      }
    } catch (e) {
      if (e instanceof Error) throw e;
      throw new Error(e.message || 'Failed to resend. Please try again.');
    }
  };

  /**
   * LOGIN — email + password only. No OTP during login.
   * If user is not verified → sets pendingVerifyEmail and throws a special error
   * so the UI can show the OTP screen.
   */
  const login = async (email, password) => {
    const cleaned = email.trim().toLowerCase();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleaned,
        password,
      });
      if (error) {
        if (error.message?.toLowerCase().includes('invalid login') ||
            error.message?.toLowerCase().includes('invalid credentials')) {
          throw new Error('Incorrect email or password.');
        }
        if (error.message?.toLowerCase().includes('email not confirmed')) {
          // Supabase native "not confirmed" error — treat as unverified
          setPendingVerifyEmail(cleaned);
          const err = new Error('Please verify your email first.');
          err.code = 'EMAIL_NOT_VERIFIED';
          throw err;
        }
        if (error.status === 429 || error.message?.includes('rate limit')) {
          throw new Error('Too many login attempts. Please wait a minute.');
        }
        throw new Error(error.message || 'Login failed. Please try again.');
      }

      // Extra check: query profiles.is_verified
      if (data?.user) {
        const verified = await fetchIsVerified(data.user.id);
        if (!verified) {
          // Sign them back out so they can't use the session without verifying
          await supabase.auth.signOut().catch(() => {});
          setPendingVerifyEmail(cleaned);
          const err = new Error('Please verify your email before logging in.');
          err.code = 'EMAIL_NOT_VERIFIED';
          throw err;
        }
      }

      return data;
    } catch (e) {
      if (e instanceof Error) throw e;
      throw new Error(e.message || 'Login failed. Please try again.');
    }
  };

  /**
   * LOGOUT
   */
  const logout = async () => {
    try { await supabase.auth.signOut(); } catch {}
    setUser(null); setToken(null); setSession(null);
    setIsEmailVerified(false); setPendingVerifyEmail(null);
  };

  const getToken = async () => {
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      return s?.access_token ?? token;
    } catch {
      return token;
    }
  };

  // Legacy compat
  const legacyLogin = (userData, authToken) => {
    setUser(userData); setToken(authToken);
  };

  return (
    <AuthContext.Provider value={{
      user, token, session, loading,
      isEmailVerified,
      pendingVerifyEmail,
      setPendingVerifyEmail,
      login, signUp, verifyEmailOtp, resendOtp,
      legacyLogin, logout, getToken,
      isLoggedIn: !!token && isEmailVerified,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

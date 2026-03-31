import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://taoxhelakyimveurqvbn.supabase.co';

// JWT anon key — required by Supabase client
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhb3hoZWxha3lpbXZldXJxdmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3OTk0NDUsImV4cCI6MjA5MDM3NTQ0NX0.XqhbGkXOOLa-YStjx8rMXVa59J6q3-RZCR_qeucE_CU';

/**
 * Safe localStorage accessor — avoids crashes in private-browsing
 * environments where `localStorage` access can throw.
 */
const safeStorage = {
  getItem: (key) => {
    try { return window.localStorage.getItem(key); } catch { return null; }
  },
  setItem: (key, value) => {
    try { window.localStorage.setItem(key, value); } catch {}
  },
  removeItem: (key) => {
    try { window.localStorage.removeItem(key); } catch {}
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,      // Supabase SDK handles refresh token rotation
    persistSession: true,         // Session survives page refresh
    storageKey: 'smartchat_supabase_auth',
    storage: safeStorage,
    detectSessionInUrl: true,     // Handles magic-link / OAuth / recovery callbacks
    flowType: 'pkce',             // PKCE flow — prevents auth code interception attacks
  },
});

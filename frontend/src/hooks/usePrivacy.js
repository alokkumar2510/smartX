/**
 * usePrivacy — Hook for managing privacy settings
 * Loads from & saves to Supabase privacy_settings table.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export const DEFAULT_PRIVACY = {
  last_seen:       'connections',
  profile_vis:     'everyone',
  who_can_message: 'connections',
  who_can_call:    'connections',
  read_receipts:   true,
  do_not_disturb:  false,
  dnd_until:       null,
  theme:           'dark',
};

export function usePrivacy(userId) {
  const [privacy, setPrivacy] = useState(DEFAULT_PRIVACY);
  const [loaded, setLoaded]   = useState(false);

  // Load from DB
  useEffect(() => {
    if (!userId) return;
    supabase
      .from('privacy_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.warn('[usePrivacy] Load error:', error.message);
        if (data) setPrivacy({ ...DEFAULT_PRIVACY, ...data });
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [userId]);

  const savePrivacy = useCallback(async (updates) => {
    const merged = { ...privacy, ...updates };
    setPrivacy(merged);
    await supabase
      .from('privacy_settings')
      .upsert({ user_id: userId, ...merged, updated_at: new Date().toISOString() }, 
               { onConflict: 'user_id' });
  }, [userId, privacy]);

  // Helpers
  const canMessageUser = useCallback((theirUserId, theirConnections) => {
    if (privacy.do_not_disturb) return false;
    if (privacy.who_can_message === 'everyone') return true;
    return theirConnections?.includes(theirUserId) ?? false;
  }, [privacy]);

  const canCallUser = useCallback((theirUserId, theirConnections) => {
    if (privacy.do_not_disturb) return false;
    if (privacy.who_can_call === 'everyone') return true;
    return theirConnections?.includes(theirUserId) ?? false;
  }, [privacy]);

  const isDND = privacy.do_not_disturb && 
    (!privacy.dnd_until || new Date(privacy.dnd_until) > new Date());

  return { privacy, savePrivacy, loaded, isDND, canMessageUser, canCallUser };
}

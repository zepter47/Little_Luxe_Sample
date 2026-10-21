import { useSyncExternalStore } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';

let state: { user: User | null; loading: boolean; error: string | null } = { user: null, loading: true, error: null };
const listeners = new Set<() => void>();
let revision = 0;
function publish(user: User | null, error: string | null = null) {
  state = { user: user?.is_anonymous ? null : user, loading: false, error };
  listeners.forEach(listener => listener());
}
supabase.auth.onAuthStateChange((_event, session) => {
  revision++;
  publish(session?.user ?? null);
});
const initialRevision = revision;
void supabase.auth.getSession().then(({ data, error }) => {
  if (revision === initialRevision) publish(data.session?.user ?? null, error?.message ?? null);
}).catch(() => { if (revision === initialRevision) publish(null, 'Unable to restore your session. Please log in again.'); });
export function useAuth() {
  return useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => state);
}
export function requireUser() {
  if (!state.user || state.loading) throw new Error('Please log in to manage your cart.');
  return state.user.id;
}

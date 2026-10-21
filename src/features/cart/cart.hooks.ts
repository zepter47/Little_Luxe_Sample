import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../services/db/database';
import { useAuth } from '../auth/auth';
export function useCart() {
  const { user } = useAuth();
  const result = useLiveQuery(async () => {
    if (!user) return { userId: null, items: [], error: null };
    try {
      return { userId: user.id, items: await db.cartItems.where('userId').equals(user.id).toArray(), error: null };
    } catch { return { userId: user.id, items: [], error: 'Your cart could not be opened. Please enable browser storage and reload.' }; }
  }, [user?.id]);
  // Never expose the previous account's records while a new query is loading.
  const current = result?.userId === (user?.id ?? null) ? result : undefined;
  return { items: current?.items ?? [], loading: !current, error: current?.error };
}

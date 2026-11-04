import type { Table } from 'dexie';
import type { DraftRepository, FormDraft } from './draft.types';

// Share ordering across mounts: a reopened form must wait for the previous
// instance's closing write before reading its draft.
const queues = new Map<string, Promise<unknown>>();
function ordered<T>(key: string, action: () => Promise<T>): Promise<T> {
  const attempt = (queues.get(key) ?? Promise.resolve()).catch(() => {}).then(action);
  queues.set(key, attempt);
  void attempt.finally(() => {
    if (queues.get(key) === attempt) queues.delete(key);
  }).catch(() => {});
  return attempt;
}

export function createDraftRepository<Values, Extra = undefined>(
  table: Table<FormDraft<Values, Extra>, string>,
  validate: (draft: unknown) => FormDraft<Values, Extra>,
): DraftRepository<Values, Extra> {
  const key = (userId: string) => `${table.db.name}:${table.name}:${userId}`;
  return {
    load: userId => ordered(key(userId), async () => {
      const value = await table.get(userId);
      if (!value) return undefined;
      const draft = validate(value);
      if (draft.userId !== userId) throw new Error('Draft owner does not match.');
      if (draft.status === 'completed') return undefined;
      return draft;
    }),
    save: draft => {
      const snapshot = structuredClone(draft);
      return ordered(key(draft.userId), async () => { await table.put(snapshot); });
    },
    remove: userId => ordered(key(userId), () => table.delete(userId)),
  };
}

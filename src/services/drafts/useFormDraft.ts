import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';
import { DraftAutosaver } from './draftAutosaver';
import type { DraftRepository, FormDraft } from './draft.types';

type Snapshot<V, E> = { values: V; extra: E };
const closingWrites = new WeakMap<object, Map<string, Promise<void>>>();

interface Options<V extends FieldValues, E> {
  userId: string;
  form: UseFormReturn<V>;
  repository: DraftRepository<V, E>;
  extra: E;
  restoreExtra: (extra: E) => void;
  enabled?: boolean;
}

export function useFormDraft<V extends FieldValues, E>({
  userId, form, repository, extra, restoreExtra, enabled = true,
}: Options<V, E>) {
  const { reset, subscribe, getValues } = form;
  const [ready, setReady] = useState(!enabled);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const saver = useRef<DraftAutosaver<Snapshot<V, E>> | null>(null);
  const terminal = useRef(false);
  const currentExtra = useRef(extra);
  const restore = useRef(restoreExtra);
  const mounted = useRef(false);

  useLayoutEffect(() => {
    currentExtra.current = extra;
    restore.current = restoreExtra;
  }, [extra, restoreExtra]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    let instance: DraftAutosaver<Snapshot<V, E>> | undefined;
    mounted.current = true;
    terminal.current = false;

    async function initialize() {
      await closingWrites.get(repository)?.get(userId)?.catch(() => {});
      const draft = await repository.load(userId);
      if (cancelled) return;
      if (draft) {
        reset(draft.values);
        currentExtra.current = draft.extra;
        restore.current(draft.extra);
        setSavedAt(draft.updatedAt);
      }
      instance = new DraftAutosaver(async snapshot => {
        const updatedAt = Date.now();
        await repository.save({ ...snapshot, userId, formatVersion: 1, status: 'editing', updatedAt });
        if (!cancelled) {
          setSavedAt(updatedAt);
          setError(null);
        }
      }, () => {
        if (!cancelled) setError('Could not save your draft on this device. Please retry before closing.');
      });
      saver.current = instance;
      unsubscribe = subscribe({
        formState: { values: true },
        callback: ({ values }) => {
          if (!terminal.current) instance?.changed({ values: values as V, extra: currentExtra.current });
        },
      });
      setReady(true);
    }
    void initialize().catch(() => {
      if (!cancelled) setError('Could not restore this draft. Reload to retry, or discard it to start again.');
    });

    const flush = () => { if (!terminal.current) void instance?.flush().catch(() => {}); };
    const hidden = () => { if (document.visibilityState === 'hidden') flush(); };
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('pagehide', flush);

    return () => {
      cancelled = true;
      mounted.current = false;
      unsubscribe?.();
      document.removeEventListener('visibilitychange', hidden);
      window.removeEventListener('pagehide', flush);
      if (saver.current === instance) saver.current = null;
      if (instance) {
        const closing = instance;
        // flush() queues its repository write before the next mount loads.
        // Browser shutdown can still interrupt asynchronous storage work.
        const write = terminal.current ? Promise.resolve() : closing.flush();
        let owners = closingWrites.get(repository);
        if (!owners) { owners = new Map(); closingWrites.set(repository, owners); }
        owners.set(userId, write);
        void write.finally(() => {
          if (owners.get(userId) === write) owners.delete(userId);
        }).catch(() => {});
        void closing.stop();
        void write.catch(error => console.error('Could not persist closing draft', error));
      }
    };
  }, [enabled, userId, repository, reset, subscribe]);

  // Files and submission retry metadata live outside React Hook Form.
  useEffect(() => {
    if (!terminal.current) saver.current?.changed({ values: getValues(), extra });
  }, [extra, getValues]);

  const saveNow = useCallback(async (snapshot?: Snapshot<V, E>): Promise<boolean> => {
    if (!enabled) return true;
    if (terminal.current) return false;
    const instance = saver.current;
    if (!instance) return false;
    try {
      instance.changed(snapshot ?? { values: getValues(), extra: currentExtra.current });
      await instance.flush();
      return true;
    } catch { return false; }
  }, [enabled, getValues]);

  const discard = useCallback(async (): Promise<boolean> => {
    if (!enabled) return true;
    terminal.current = true;
    setReady(false);
    await saver.current?.stop();
    try {
      await repository.remove(userId);
      return true;
    } catch {
      if (mounted.current) setError('Could not discard the draft. Please retry.');
      return false;
    }
  }, [enabled, repository, userId]);

  const complete = useCallback(async (): Promise<boolean> => {
    if (!enabled) return true;
    terminal.current = true;
    setFinished(true);
    await saver.current?.stop();
    try {
      // A completed marker prevents restoration if deletion alone fails.
      const completed: FormDraft<V, E> = {
        userId, formatVersion: 1, status: 'completed', updatedAt: Date.now(),
        values: getValues(), extra: currentExtra.current,
      };
      await repository.save(completed);
      await repository.remove(userId);
      return true;
    } catch {
      if (mounted.current) setError('Saved successfully, but local draft cleanup failed. Retry cleanup; do not submit again.');
      return false;
    }
  }, [enabled, repository, userId, getValues]);

  return { ready: !enabled || ready, error, savedAt, finished, saveNow, discard, complete };
}

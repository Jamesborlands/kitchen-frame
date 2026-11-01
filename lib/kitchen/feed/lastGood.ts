// A tiny per-isolate cache that never forgets a good value: within ttlMs it
// answers from memory; after that it refetches, and if the refetch fails it
// keeps serving the old value with its ORIGINAL fetchedAt, so the frame can say
// "updated 2h ago" instead of going blank.
export interface LastGood<T> { value: T; fetchedAt: number }

export function lastGood<T>(ttlMs: number) {
  const store = new Map<string, LastGood<T>>();
  return async (key: string, now: number, load: () => Promise<T>): Promise<LastGood<T> | null> => {
    const have = store.get(key);
    if (have && now - have.fetchedAt < ttlMs) return have;
    try {
      const fresh = { value: await load(), fetchedAt: now };
      store.set(key, fresh);
      return fresh;
    } catch {
      return have ?? null;
    }
  };
}

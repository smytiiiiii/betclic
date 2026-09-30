/**
 * Cache mémoire TTL avec déduplication des requêtes concurrentes.
 * Suffisant pour une instance unique ; remplacer par Redis en multi-instance.
 */
interface Entry<T> {
  expires: number;
  value: Promise<T>;
}

const store = new Map<string, Entry<unknown>>();
const MAX_ENTRIES = 5_000;

export function memo<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key) as Entry<T> | undefined;
  if (hit && hit.expires > now) return hit.value;

  if (store.size >= MAX_ENTRIES) {
    for (const [k, v] of store) {
      if (v.expires <= now) store.delete(k);
    }
    if (store.size >= MAX_ENTRIES) store.delete(store.keys().next().value as string);
  }

  const value = fn().catch((err) => {
    store.delete(key);
    throw err;
  });
  store.set(key, { expires: now + ttlMs, value });
  return value;
}

export function invalidate(prefix: string) {
  for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k);
}

/** Exécute `fn` sur chaque élément avec une concurrence limitée. */
export async function mapConcurrent<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
      }
    }),
  );
  return out;
}

/** Empreinte stable d'un objet (pour les clés de cache). */
export function fingerprint(value: unknown): string {
  const json = JSON.stringify(value, (_k, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  );
  let h = 5381;
  for (let i = 0; i < json.length; i++) h = ((h << 5) + h + json.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

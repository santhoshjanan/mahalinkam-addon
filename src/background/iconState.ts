/**
 * Toolbar-icon state helpers for the background worker.
 *
 * The worker shows a FILLED icon when the current page is already bookmarked
 * and an OUTLINE icon when it is not (or when we cannot tell). To avoid hitting
 * the server on every tab switch it wraps `apiClient.lookup` in a tiny in-memory
 * TTL cache keyed by the normalized URL.
 */
import { normalize } from '../lib/urlNormalizer';

const ICON_SIZES = [16, 32, 48, 128] as const;

/**
 * Icon set for `browser.action.setIcon`. `found` → the filled set, otherwise the
 * outline set. Paths are written as they appear in the built extension, matching
 * how `manifest.json` references `src/assets/*`.
 */
export function resolveIcon(found: boolean): { path: Record<number, string> } {
  const stem = found ? 'icon' : 'icon-outline';
  const path: Record<number, string> = {};
  for (const size of ICON_SIZES) {
    path[size] = `src/assets/${stem}-${size}.png`;
  }
  return { path };
}

/**
 * Client-side cache key for a URL: the normalized form when parseable, else the
 * raw string. This value is NEVER compared against server data — it only groups
 * cache entries so `?utm_source=…` variants share one lookup.
 */
export function cacheKey(url: string): string {
  try {
    return normalize(url);
  } catch {
    return url;
  }
}

interface CacheEntry<T> {
  at: number;
  promise: Promise<T>;
}

export interface LookupCache<T> {
  /** Look up `url`, using the cached result when younger than `ttlMs`. */
  (url: string): Promise<T>;
  /** Prime the cache for `url` with a known value (e.g. right after a save). */
  set(url: string, value: T): void;
  /** Drop any cached entry for `url`. */
  invalidate(url: string): void;
}

/**
 * Wrap a lookup function in a `Map`-backed TTL cache.
 *
 * - Keys by {@link cacheKey} so tracking-param variants collapse to one entry.
 * - Returns the cached result while the entry is younger than `ttlMs`.
 * - Stores the in-flight promise, so concurrent calls for the same key share a
 *   single `lookupFn` invocation.
 * - A rejected lookup is evicted immediately (failures are not cached).
 * - `lookupFn` always receives the RAW url (the server does its own normalizing).
 */
export function makeLookupCache<T extends { found: boolean; bookmark?: unknown }>(
  lookupFn: (url: string) => Promise<T>,
  ttlMs: number,
): LookupCache<T> {
  const cache = new Map<string, CacheEntry<T>>();

  const run = async (url: string): Promise<T> => {
    const key = cacheKey(url);
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < ttlMs) {
      return hit.promise;
    }

    const promise = lookupFn(url);
    cache.set(key, { at: Date.now(), promise });

    try {
      return await promise;
    } catch (err) {
      // Only evict if this exact entry is still the current one, so a retry that
      // has already populated a fresh entry is not clobbered.
      if (cache.get(key)?.promise === promise) {
        cache.delete(key);
      }
      throw err;
    }
  };

  const fn = run as LookupCache<T>;
  fn.set = (url: string, value: T): void => {
    cache.set(cacheKey(url), { at: Date.now(), promise: Promise.resolve(value) });
  };
  fn.invalidate = (url: string): void => {
    cache.delete(cacheKey(url));
  };
  return fn;
}

import { it, expect, vi } from 'vitest';
import { resolveIcon, cacheKey, makeLookupCache } from '../iconState';

it('resolveIcon picks filled vs outline sets', () => {
  expect(resolveIcon(true).path[16]).toContain('icon-16');
  expect(resolveIcon(true).path[128]).toContain('icon-128');
  expect(resolveIcon(true).path[16]).not.toContain('outline');
  expect(resolveIcon(false).path[16]).toContain('outline');
  expect(resolveIcon(false).path[128]).toContain('outline');
});

it('cacheKey normalizes and tolerates junk', () => {
  expect(cacheKey('https://a.test/p?utm_source=x')).toBe('https://a.test/p');
  expect(cacheKey('not a url')).toBe('not a url');
});

it('lookup cache dedupes within TTL', async () => {
  const spy = vi.fn(async () => ({ found: true }));
  const cache = makeLookupCache(spy, 1000);
  await cache('https://a.test/p');
  await cache('https://a.test/p?utm_source=x'); // same normalized key
  expect(spy).toHaveBeenCalledTimes(1);
});

it('lookup cache de-dupes concurrent in-flight calls for the same key', async () => {
  let resolveFn: ((v: { found: boolean }) => void) | undefined;
  const spy = vi.fn(
    () =>
      new Promise<{ found: boolean }>((res) => {
        resolveFn = res;
      }),
  );
  const cache = makeLookupCache(spy, 1000);
  const a = cache('https://a.test/p');
  const b = cache('https://a.test/p?utm_source=x');
  resolveFn?.({ found: false });
  expect(await a).toEqual({ found: false });
  expect(await b).toEqual({ found: false });
  expect(spy).toHaveBeenCalledTimes(1);
});

it('lookup cache re-invokes after the TTL elapses', async () => {
  const spy = vi.fn(async () => ({ found: true }));
  const cache = makeLookupCache(spy, 5);
  await cache('https://a.test/p');
  await new Promise((r) => setTimeout(r, 20));
  await cache('https://a.test/p');
  expect(spy).toHaveBeenCalledTimes(2);
});

it('lookup cache .set primes an entry without calling lookupFn', async () => {
  const spy = vi.fn(async () => ({ found: false }));
  const cache = makeLookupCache(spy, 1000);
  expect(await cache('https://a.test/p')).toEqual({ found: false }); // miss
  expect(spy).toHaveBeenCalledTimes(1);
  cache.set('https://a.test/p', { found: true });
  expect(await cache('https://a.test/p?utm_source=x')).toEqual({ found: true });
  expect(spy).toHaveBeenCalledTimes(1); // no further lookup
});

it('lookup cache .invalidate forces the next call to re-fetch', async () => {
  const spy = vi.fn(async () => ({ found: true }));
  const cache = makeLookupCache(spy, 1000);
  await cache('https://a.test/p');
  expect(spy).toHaveBeenCalledTimes(1);
  cache.invalidate('https://a.test/p');
  await cache('https://a.test/p');
  expect(spy).toHaveBeenCalledTimes(2);
});

it('lookup cache does not cache a rejected lookup', async () => {
  const spy = vi
    .fn<() => Promise<{ found: boolean }>>()
    .mockRejectedValueOnce(new Error('boom'))
    .mockResolvedValueOnce({ found: true });
  const cache = makeLookupCache(spy, 1000);
  await expect(cache('https://a.test/p')).rejects.toThrow('boom');
  await expect(cache('https://a.test/p')).resolves.toEqual({ found: true });
  expect(spy).toHaveBeenCalledTimes(2);
});

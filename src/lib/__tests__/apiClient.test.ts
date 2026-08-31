import { it, expect, beforeEach, vi } from 'vitest';
import { browserMock } from '../../test/mockBrowser';
import { apiClient } from '../apiClient';
import { AuthError, ValidationError, NetworkError, NotConfiguredError } from '../errors';

beforeEach(async () => {
  browserMock.__reset();
  await browserMock.storage.local.set({ serverUrl: 'https://mhl.test', token: 'tok' });
  vi.restoreAllMocks();
});

type FetchMock = ReturnType<typeof vi.fn<(input: string, init: RequestInit) => Promise<Response>>>;

function mockFetch(status: number, body: unknown): FetchMock {
  const fn: FetchMock = vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
  );
  globalThis.fetch = fn as unknown as typeof fetch;
  return fn;
}

function headersOf(init: RequestInit): Record<string, string> {
  return (init.headers ?? {}) as Record<string, string>;
}

it('throws NotConfiguredError with no settings', async () => {
  browserMock.__reset();
  await expect(apiClient.ping()).rejects.toBeInstanceOf(NotConfiguredError);
});

it('sends the bearer token and parses ping', async () => {
  const fn = mockFetch(200, {
    ok: true,
    user: { id: 1, name: 'A', email: 'a@b.c' },
    server: { version: '0.1.0' },
  });
  const res = await apiClient.ping();
  expect(res.user.id).toBe(1);
  expect(res.server.version).toBe('0.1.0');

  const [url, init] = fn.mock.calls[0];
  expect(url).toBe('https://mhl.test/api/ping');
  expect(headersOf(init).Authorization).toBe('Bearer tok');
  expect(headersOf(init).Accept).toBe('application/json');
});

it('maps 401 to AuthError', async () => {
  mockFetch(401, { message: 'Unauthenticated.' });
  await expect(apiClient.listFolders()).rejects.toBeInstanceOf(AuthError);
});

it('maps 422 to ValidationError with fields', async () => {
  mockFetch(422, { message: 'invalid', errors: { url: ['The url field is required.'] } });
  const err = await apiClient.createBookmark({ url: '' }).catch((e: unknown) => e);
  expect(err).toBeInstanceOf(ValidationError);
  expect((err as ValidationError).fields).toEqual({ url: ['The url field is required.'] });
  expect((err as ValidationError).message).toBe('invalid');
});

it('maps a fetch rejection to NetworkError', async () => {
  globalThis.fetch = vi.fn(async () => {
    throw new TypeError('failed');
  }) as unknown as typeof fetch;
  await expect(apiClient.ping()).rejects.toBeInstanceOf(NetworkError);
});

it('createBookmark surfaces already_saved and returns the bookmark from data', async () => {
  mockFetch(200, {
    data: { id: 5, url: 'u', normalized_url: 'u', tags: [] },
    already_saved: true,
  });
  const r = await apiClient.createBookmark({ url: 'https://a.test/' });
  expect(r.alreadySaved).toBe(true);
  expect(r.bookmark.id).toBe(5);
});

it('createBookmark sends the url byte-identical to the input (no normalization)', async () => {
  const fn = mockFetch(201, {
    data: { id: 9, url: 'x', normalized_url: 'x', tags: [] },
    already_saved: false,
  });
  const rawUrl = 'https://Example.com/Path/?utm_source=news&ref=abc&b=2&a=1#frag';
  await apiClient.createBookmark({ url: rawUrl });

  const [, init] = fn.mock.calls[0];
  const sent = JSON.parse(String(init.body)) as { url: string };
  expect(sent.url).toBe(rawUrl);
  expect(init.method).toBe('POST');
});

it('lookup passes the url raw and normalizes the found flag', async () => {
  const fn = mockFetch(200, {
    found: true,
    bookmark: { id: 3, url: 'u', normalized_url: 'u', tags: [] },
  });
  const rawUrl = 'https://Example.com/?utm_medium=x&z=1';
  const r = await apiClient.lookup(rawUrl);

  const [url] = fn.mock.calls[0];
  expect(url).toBe(`https://mhl.test/api/bookmarks/lookup?url=${encodeURIComponent(rawUrl)}`);
  expect(r.found).toBe(true);
  expect(r.bookmark?.id).toBe(3);
});

it('deleteBookmark tolerates an empty response body', async () => {
  // jsdom's Response constructor rejects the 204 null-body status, so use 200
  // with an empty string to exercise the "no body to parse" path.
  globalThis.fetch = vi.fn(
    async () => new Response('', { status: 200 }),
  ) as unknown as typeof fetch;
  await expect(apiClient.deleteBookmark(7)).resolves.toBeUndefined();
});

it('listBookmarks builds the query string with repeated tag[] params', async () => {
  const fn = mockFetch(200, {
    data: [],
    meta: { current_page: 1, last_page: 1, total: 0, per_page: 20 },
  });
  await apiClient.listBookmarks({ q: 'cats', folderId: '4', tags: ['a', 'b'], page: 2 });

  const [url] = fn.mock.calls[0];
  expect(url).toBe(
    'https://mhl.test/api/bookmarks?q=cats&folder_id=4&tag%5B%5D=a&tag%5B%5D=b&page=2',
  );
});

it('maps 500 to ServerError carrying the status', async () => {
  mockFetch(500, { message: 'boom' });
  const err = await apiClient.listTags().catch((e: unknown) => e);
  expect(err).toMatchObject({ name: 'ServerError', status: 500, message: 'boom' });
});

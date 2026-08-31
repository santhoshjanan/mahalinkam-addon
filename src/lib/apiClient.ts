/**
 * The extension's entire interface to the mahalinkam Laravel server API.
 *
 * A thin `fetch` wrapper: reads settings on every call, attaches the bearer
 * token, and maps non-2xx responses to the typed errors in `./errors`. There
 * is deliberately NO retry logic — callers decide whether to retry.
 *
 * URL normalization is the server's job. `createBookmark` and `lookup` send
 * whatever URL they are handed, byte-for-byte.
 */
import { getSettings } from './storage';
import {
  AuthError,
  NetworkError,
  NotConfiguredError,
  ServerError,
  ValidationError,
} from './errors';

export interface Bookmark {
  id: number;
  url: string;
  normalized_url: string;
  title: string | null;
  description: string | null;
  favicon_url: string | null;
  folder_id: number | null;
  tags: { id: number; name: string }[];
  metadata_status: string;
  created_at?: string;
  updated_at?: string;
}

export interface Folder {
  id: number;
  parent_id: number | null;
  name: string;
  position: number;
}

export interface Tag {
  id: number;
  name: string;
  bookmarks_count?: number;
}

/**
 * Body accepted by `PATCH /api/bookmarks/{id}`. Distinct from {@link Bookmark}:
 * `tags` here is a flat list of names (the endpoint resolves/creates them),
 * whereas `Bookmark.tags` is the hydrated `{ id, name }[]`.
 */
export interface BookmarkUpdate {
  url?: string;
  title?: string | null;
  description?: string | null;
  folder_id?: number | null;
  tags?: string[];
}

export interface Paginated<T> {
  data: T[];
  meta: { current_page: number; last_page: number; total: number; per_page: number };
}

interface PingResponse {
  ok: true;
  user: { id: number; name: string; email: string };
  server: { version: string };
}

interface LaravelError {
  message?: string;
  errors?: Record<string, string[]>;
}

/**
 * Perform one API request. Reads settings fresh every call (never cached), so a
 * token change between calls takes effect immediately.
 */
async function req(
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; body: unknown }> {
  const settings = await getSettings();
  if (!settings) throw new NotConfiguredError();

  let resp: Response;
  try {
    resp = await fetch(`${settings.serverUrl}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.token}`,
        ...init.headers,
      },
    });
  } catch (e) {
    throw new NetworkError((e as Error).message);
  }

  const text = await resp.text();
  const body: unknown = text ? JSON.parse(text) : null;

  if (resp.ok) return { status: resp.status, body };

  const err = (body ?? {}) as LaravelError;
  if (resp.status === 401) throw new AuthError(err.message ?? 'Unauthenticated');
  if (resp.status === 422) throw new ValidationError(err.message ?? 'Invalid', err.errors ?? {});
  throw new ServerError(err.message ?? `HTTP ${resp.status}`, resp.status);
}

/**
 * Build a query string from a flat object. Skips `undefined` / `null` / `''`.
 * Array values become repeated `key[]=v` params. Returns `?...` or `''`.
 */
function qs(obj: Record<string, unknown>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v)) {
      for (const x of v) p.append(`${k}[]`, String(x));
    } else {
      p.set(k, String(v));
    }
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

export const apiClient = {
  async ping(): Promise<PingResponse> {
    return (await req('/api/ping')).body as PingResponse;
  },

  async listBookmarks(params: {
    q?: string;
    folderId?: string;
    tags?: string[];
    sort?: string;
    page?: number;
  }): Promise<Paginated<Bookmark>> {
    const query = qs({
      q: params.q,
      folder_id: params.folderId,
      tag: params.tags,
      sort: params.sort,
      page: params.page,
    });
    return (await req(`/api/bookmarks${query}`)).body as Paginated<Bookmark>;
  },

  async createBookmark(body: {
    url: string;
    title?: string;
    description?: string;
    folder_id?: number | null;
    tags?: string[];
  }): Promise<{ bookmark: Bookmark; alreadySaved: boolean }> {
    const { body: b } = await req('/api/bookmarks', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const payload = b as { data: Bookmark; already_saved?: boolean };
    return { bookmark: payload.data, alreadySaved: Boolean(payload.already_saved) };
  },

  async lookup(url: string): Promise<{ found: boolean; bookmark?: Bookmark }> {
    const { body } = await req(`/api/bookmarks/lookup${qs({ url })}`);
    const payload = (body ?? {}) as { found?: boolean; bookmark?: Bookmark | null };
    return { found: Boolean(payload.found), bookmark: payload.bookmark ?? undefined };
  },

  async updateBookmark(id: number, body: BookmarkUpdate): Promise<Bookmark> {
    const { body: b } = await req(`/api/bookmarks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    return (b as { data: Bookmark }).data;
  },

  async deleteBookmark(id: number): Promise<void> {
    await req(`/api/bookmarks/${id}`, { method: 'DELETE' });
  },

  async listFolders(): Promise<Folder[]> {
    return (await req('/api/folders')).body as Folder[];
  },

  async listTags(q?: string): Promise<Tag[]> {
    return (await req(`/api/tags${qs({ q })}`)).body as Tag[];
  },
};

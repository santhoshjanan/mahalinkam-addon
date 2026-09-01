/**
 * Intercepts `fetch` to `https://preview.mahalinkam.test/*` and answers with
 * fixture data, so the REAL `apiClient` runs unmodified in the preview harness.
 * Dev-only; not bundled into the shipped extension.
 */
import { allBookmarks, bookmarksByFolder, folders, PER_PAGE, tags } from './fixtures';
import type { Bookmark } from '../lib/apiClient';

const BASE = 'https://preview.mahalinkam.test';
const LATENCY_MS = 220;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function paginate(rows: Bookmark[], page: number) {
  const last = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const current = Math.min(Math.max(1, page), last);
  const start = (current - 1) * PER_PAGE;
  return {
    data: rows.slice(start, start + PER_PAGE),
    meta: { current_page: current, last_page: last, total: rows.length, per_page: PER_PAGE },
  };
}

function handle(url: URL): Response {
  const path = url.pathname;
  const p = url.searchParams;

  if (path === '/api/ping') {
    return json({
      ok: true,
      user: { id: 1, name: 'Preview', email: 'preview@local' },
      server: { version: '0.1.0-preview' },
    });
  }

  if (path === '/api/folders') return json(folders);
  if (path === '/api/tags') {
    const q = (p.get('q') ?? '').toLowerCase();
    return json(q ? tags.filter((t) => t.name.includes(q)) : tags);
  }

  if (path === '/api/bookmarks/lookup') {
    return json({ found: false });
  }

  if (path === '/api/bookmarks') {
    const page = Number(p.get('page') ?? '1') || 1;
    const q = (p.get('q') ?? '').trim().toLowerCase();
    const folderId = p.get('folder_id');

    if (q) {
      const hits = allBookmarks.filter(
        (b) => b.title?.toLowerCase().includes(q) || b.url.toLowerCase().includes(q),
      );
      return json(paginate(hits, page));
    }
    if (folderId) {
      return json(paginate(bookmarksByFolder[folderId] ?? [], page));
    }
    return json(paginate(allBookmarks, page));
  }

  return json({ message: `preview mock: unhandled ${path}` }, 404);
}

const realFetch = globalThis.fetch.bind(globalThis);

globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (!href.startsWith(BASE)) return realFetch(input as RequestInfo, init);

  await new Promise((r) => setTimeout(r, LATENCY_MS));
  const url = new URL(href);
  const method = (init?.method ?? 'GET').toUpperCase();

  // Write paths: acknowledge so the Save/Edit form doesn't error if poked.
  if (method === 'POST' && url.pathname === '/api/bookmarks') {
    return json({ data: { ...allBookmarks[0], id: 999999 }, already_saved: false }, 201);
  }
  if (method === 'PATCH' && url.pathname.startsWith('/api/bookmarks/')) {
    return json({ data: { ...allBookmarks[0] } });
  }
  if (method === 'DELETE' && url.pathname.startsWith('/api/bookmarks/')) {
    return new Response(null, { status: 204 });
  }

  return handle(url);
};

console.info('[preview] fetch mock installed for', BASE);

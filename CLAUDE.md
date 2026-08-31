# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm test` — run the Vitest suite once.
- `npm test -- <file>` — run one test file (e.g. `npm test -- urlNormalizer`).
- `npm run test:watch` — Vitest in watch mode.
- `npm run dev` — Vite watch build.
- `npm run build` — production build; emits `dist/chrome` **and** `dist/firefox`
  (runs the Vite build twice with `TARGET_BROWSER=chrome` then `=firefox`).
- `npm run package` — `build` + zip each target to `artifacts/mahalinkam-<version>-<target>.zip`.
- `npm run lint` — ESLint over `src/**/*.{ts,vue}` then `prettier --check`.

Node runs on the host. No Docker is needed for tests, lint, or build — Docker is
only used for the end-to-end smoke against a real server.

## Architecture

### `src/lib/` — the logic layer (all unit-tested, framework-free)

- **`urlNormalizer.ts`** — a byte-for-byte port of the server's
  `App\Services\UrlNormalizer`. `src/lib/__fixtures__/url-normalizer.json` is the
  shared cross-client contract and must stay identical in meaning to the server's
  `app/Support/url-normalizer-fixtures.php`. A divergence is **release-blocking**;
  change both fixtures and re-run both test suites together. The extension only
  uses this for local echo/consistency — the server is the source of truth and
  re-normalizes every URL it receives.
- **`apiClient.ts`** — the *entire* interface to the server. A thin `fetch`
  wrapper that reads settings fresh on every call, attaches the bearer token, and
  maps non-2xx responses to typed errors from `errors.ts`:
  `NotConfiguredError`, `NetworkError`, `AuthError` (401), `ValidationError`
  (422, carries `errors` map), `ServerError` (other). **No retries. No offline
  queue.** Sends **raw** URLs — the server normalizes.
- **`storage.ts`** — the only configuration: `{ serverUrl, token }` in
  `browser.storage.local`. `getSettings()` returns `null` when unconfigured.
- **`folderTree.ts`** — turns the server's flat `Folder[]` (`{ id, parent_id,
  name, position }`) into a depth-annotated tree for the folder picker.
- **`permissions.ts`** — requests the runtime host permission for the configured
  server origin (`optional_host_permissions: ["*://*/*"]` in the manifest).

### `src/background/` — MV3 service worker

- `index.ts` — registers context menus (save page / save link), the
  `save_current_page` keyboard command, and drives the toolbar icon:
  filled icon when the active tab's URL is bookmarked, outline when not.
- `iconState.ts` — `makeLookupCache()` wraps `apiClient.lookup` with a **60s TTL**
  cache keyed by normalized URL; exposes `.set(url, result)` and
  `.invalidate(url)`. `resolveIcon()` maps a lookup result to the icon path set.

### `src/popup/` — Vue 3, two modes

Mode is decided by `apiClient.lookup` on the active tab:

- **Save / Edit** (`components/BookmarkForm.vue`) — prefilled title/description,
  folder dropdown (`folderTree`), tag input with autocomplete
  (`components/TagInput.vue`). On a saved page it becomes Edit + Delete.
- **Quick search** (`components/QuickSearch.vue`) — `apiClient.listBookmarks({ q })`,
  opens a result in a new tab.
- `components/ErrorNotice.vue` — renders a typed `apiClient` error with a Retry
  button; `NetworkError` → "Can't reach the server".
- `useActiveTab.ts` — composable for the current tab's URL/title.

### `src/options/` — Vue 3

One form: server URL + token → `saveSettings` (saved **before** the verify ping,
because `apiClient` reads storage on every call) → `apiClient.ping()` →
`requestOriginPermission()`.

## Cross-browser build

One `src/manifest.json` (Chrome MV3 shape). `vite.config.ts`'s
`transformManifest` rewrites `background.service_worker` → `background.scripts`
for the Firefox target. `webextension-polyfill` provides the `browser.*` API on
both. A `copy-manifest-assets` Vite plugin copies static files the manifest
references (icons, HTML) into `dist/<target>`.

## Server dependency

The extension fetches to an origin the user has **granted host permission** for,
which bypasses CORS — the server needs **no** CORS configuration. If the host
permission is not granted, every API call fails at the network layer.

## Known follow-up

A popup save or delete does **not** bust the background worker's `lookup` cache,
so the toolbar icon can lag up to 60s after a change made from the popup. Fix:
`runtime.sendMessage` from the popup to the background worker calling
`lookupCached.set(url, result)` (or `.invalidate(url)`) right after the mutation.

## Spec and plan

- Spec: `../docs/superpowers/specs/2026-08-31-mahalinkam-design.md` — §5.1
  (URL normalization), §7 (extension), §8 (API contract).
- Plan: `../docs/superpowers/plans/2026-08-31-mahalinkam-extension.md`.

(These live in the sibling root repo, alongside `mahalinkam-chromium` and
`mahalinkam-srv`.)

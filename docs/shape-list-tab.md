# Shape brief — popup List tab, shortcut fix, sidebar deferred

Status: confirmed 2026-09-01. Design brief only — no code written by shape.

> **Revised in build (2026-09-01):** the "root shows folders only, no bookmarks;
> click 'Unfiled' to see loose bookmarks" model tested badly — a fresh user with
> unfiled bookmarks and one empty folder saw "Nothing in this folder yet." and
> assumed the addon was broken. Root now shows **top-level folders, then every
> bookmark not in a folder**, inline; the "Unfiled" pseudo-folder is gone. The
> bookmark fetch is lazy (first time the tab is shown). Everything below stands
> except that root-scope rule.

## Target

`mahalinkam-chromium` — `src/popup/App.vue` plus a new `src/popup/components/` view.
Refinement inside the existing popup world (Vue 3 + Tailwind, dark-mode-aware, top
tab control). No visual-world change.

## Job & mode — Operate

A homelab user, mid-browse, wants to find a bookmark they saved earlier and open
it, without leaving the page or opening the full web UI. The popup is ~360 px
wide; every pixel and every round-trip counts. Success = the right bookmark in
two or three taps.

## Structural thesis — a breadcrumb-anchored folder drill-down

The List tab is a mini file browser, not a flat dump.

- **Root ("All"):** the user's top-level folders as rows (folder glyph, name,
  child count, chevron), plus an **"Unfiled"** pseudo-folder. No bookmarks shown
  at root — you descend to see them.
- **Any folder:** its subfolders first (same row style), then its bookmarks,
  reusing the Search tab's exact row rendering (favicon, title-or-host,
  host line). Non-recursive — a folder shows only its direct contents.
- **Breadcrumb bar** pinned at top: `All ▸ Reading ▸ Tech`. Tap any crumb to
  jump up. This is the only up-navigation — no separate back button.
- Tap a folder row → descend (content slides in from the right, ~150 ms,
  `prefers-reduced-motion` respected). Tap a crumb → slide back right.
- Tap a bookmark row → open in a new tab (identical to Search). A small edit
  affordance on the row opens the existing `BookmarkForm` in edit mode; delete
  lives behind that, not on the row surface.

## Tab bar

`Save · List · Search` (List inserted between). `view` union gains `'list'`.
Default view unchanged (Save/Edit for the current page).

## Focal moment

The first descent — tapping a folder and its contents sliding in instantly.
Folder metadata is fetched once per popup open and cached, so drilling three
levels deep never feels like waiting on the server.

## Data & states

- `apiClient.listFolders()` once per popup open (cache in a ref;
  `folderTree.buildTree` for the hierarchy). `apiClient.listBookmarks({ folderId })`
  per level.
- Ranges: 0 folders (everything unfiled → root shows only "Unfiled"), typical
  5–30 folders / 10–200 bookmarks, folder with >50 bookmarks → paginated
  ("Load more" row; `listBookmarks` is 50/page).
- Loading: 3–4 skeleton rows. Empty folder: "Nothing in this folder yet."
  Server unreachable: the shared `<ErrorNotice>` + Retry (same as Search).
  No offline queue.

## Keyboard shortcut fix

`Ctrl+Shift+D` is Chrome's built-in "bookmark this page" — it never reaches the
extension. Change `commands.save_current_page.suggested_key` in
`src/manifest.json` to **`Alt+Shift+D`** (valid in Chrome + Firefox MV3, no
collision; user can rebind at `chrome://extensions/shortcuts`). Update the
README "Use" line and `CLAUDE.md`.

## Scope & anti-goals

- Untouched: Save/Edit view, Search view, options page, background worker,
  `apiClient`, manifest permissions (none needed — `listFolders` / `listBookmarks`
  already work with the existing token).
- Not in this pass: folder create/rename/delete from the popup (web-UI only),
  tag filtering in List, drag-reorder, recursive "all descendants" flattening.
- **Sidebar — deferred.** Follow-up: a Chrome `sidePanel` / Firefox
  `sidebar_action` surface that is the "mini web UI" (folder tree + tag filter +
  full list + inline edit), with the popup staying lightweight for quick save.
  Its own `shape` pass later — a new surface with real IA decisions, not a popup
  tweak.

## Constraints a builder must not invent

- Row-open behavior and error handling must match the Search tab exactly.
- Breadcrumb is the only up-navigation.
- List must not fetch the whole bookmark set — always folder-scoped, always
  paginated.

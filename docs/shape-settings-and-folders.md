# Shape brief — in-popup Settings view + inline folder creation

Status: confirmed 2026-09-01. Design brief only — shape writes no code.
Refinement inside the committed popup world (`mahalinkam-chromium`, DESIGN.md).
Two features; the second has a server prerequisite.

## Job & audience

- **Settings view** — a connected user who needs to see which server the addon
  talks to, rotate the token, or fully disconnect. Rare visit (set up once;
  return on token rotation / server move / handing off a machine). Operate.
  Success: "check my endpoint, swap the token, or disconnect — from the popup,
  without going near `chrome://extensions`."
- **Inline folder creation** — while saving or editing a bookmark, file it in a
  folder that doesn't exist yet. Operate. Success: "type a name, hit ✓, the
  folder exists and is selected — no trip to the web UI."

## Selected direction

**Settings is a mode, not a fourth tab.** A **gear button** joins the identity
band at the right (after the status dot: `[mark] mahalinkam · · · [dot] [⚙]`,
16px line icon, `muted` → `ink` on hover). Tapping it replaces the tab bar +
active section with a `SettingsPanel`; the brandbar stays, the gear shows an
active state. Panel header: "Settings" + a `← Back` tertiary button.

Panel contents, top to bottom:

1. **Endpoint** — server URL, read-only in mono, with an **Edit** tertiary
   button that turns it into an input.
2. **API token** — redacted to the **last 4** (`••••••••••3f9a`), mono. A
   **Replace token** tertiary button reveals an empty password field.
3. **Save & verify** — primary button, enabled only when endpoint or token is
   dirty; re-runs `saveSettings → requestOriginPermission → apiClient.ping`,
   showing "Connected as <name> — server <version>" on success and the options
   page's typed error messages on failure.
4. **Connected as** — name / email / server version line, from a `ping` **on
   panel open** (confirmed: rare surface, worth confirming the connection is
   live).
5. **Disconnect** — a **two-stage `danger` button** ("Disconnect" → "Confirm?").
   Clears stored credentials (`clearSettings()`) and drops the popup to its
   existing setup screen. Copy beneath: *"Removes this addon's saved
   credentials. The token stays valid on your server until you delete it
   there."*

**Inline folder creation** lives in `BookmarkForm`'s Folder field. The `<select>`
gains a trailing option **"＋ New folder…"**. Choosing it swaps the `<select>`
for an inline editor: a text input with **✓ / ✗ buttons inside the field's
trailing edge**, autofocused; Enter = confirm, Esc = cancel. A small context
label shows the parent — *"New folder under Reading"* / *"…at the top level"* —
where the parent is **whatever folder is selected in the picker at that moment**
(`null` → top level). On confirm → `apiClient.createFolder({ name, parent_id })`;
on success the new folder is appended to the shared folder list, auto-selected,
and the field reverts to the `<select>`. On cancel → revert to the prior
selection.

## Scope & boundaries

- **Untouched:** the Save/List/Search tab bar and its three views; the List
  tab's folder browser; the background worker; manifest permissions.
- The **standalone options page** shrinks to first-run only (what
  `openOptionsPage` and the setup screen point at). Light restyle to DESIGN.md's
  language (mono wordmark, `#1d4ed8`, field styling) for consistency — no new
  controls there.
- The **AuthError "Settings" button** in `ErrorNotice` switches to
  `SettingsPanel` in-place instead of opening a new tab.
- **Anti-goals:** no theme / preference toggles (there are none); no folder
  rename / move / delete from the popup; no multi-level folder creation in one
  action; no separate parent picker — parent is always the current selection;
  the token is never re-revealed after first entry.

## States & ranges

- **Settings:** read-only → dirty (Edit / Replace token) → verifying →
  connected / typed error (bad URL, permission denied, token rejected,
  unreachable, HTTP 5xx). Disconnect: confirm → cleared → setup screen.
- **Folder editor:** idle `<select>` → creating (input + ✓/✗, ✓ disabled while
  empty) → submitting (disabled) → error (inline `field-error`, editor stays
  open) → success (`<select>` back, new folder selected). Error cases: duplicate
  name under the same parent, parent at `MAX_DEPTH` ("Reading is nested too deep
  for a subfolder."), name too long.
- Folder name 1–~255 chars; picker holds 0–~200 folders.

## Interaction & layout

- Settings panel: single scrollable column at 340px, same field rhythm as
  `BookmarkForm`. Fields stacked; tertiary buttons right-aligned to their field;
  primary + danger in an actions row. Verify results reuse the `aria-live` /
  flash patterns; no new motion.
- Folder editor: ✓/✗ flush inside the input's right padding; input grows to
  fill. Keyboard-complete (Esc / Tab exit; no focus trap).
- New-folder success updates `App.vue`'s `rawFolders` + `folderOptions` so the
  List tab tree and the picker stay in sync within the popup session.

## Constraints a builder must not invent

- **Server prerequisite (`mahalinkam-srv`):** add `POST /api/folders` →
  `FolderController::store` → a `StoreFolderRequest` (`name` required/string/max;
  `parent_id` nullable, exists, owned by the user) → **delegate to the existing
  `FolderService::create`** (depth cap, auto-position, per-user scoping) →
  return `FolderResource`. Mirror the web controller's rules; don't reimplement
  them. Covered by the existing `auth:sanctum` + `throttle:120,1`.
- **`apiClient.ts`:** add `createFolder({ name, parent_id? }): Promise<Folder>`.
- Redaction: last 4 chars only, ever.
- Disconnect is local only — the extension has no token-revocation endpoint; the
  copy must say so.
- The gear/settings mode is **not** a 4th tab; the Save/List/Search tab bar is
  not touched.
- New Settings view + folder editor reuse DESIGN.md components: identity band,
  mono labels, tertiary text buttons, two-stage `danger`, `field-error` /
  `field--bad`, the typed-error copy from the options page.

## Build split

1. **Settings view** — no backend dependency; can ship first. New
   `src/popup/components/SettingsPanel.vue`, a `settings` mode + gear in
   `App.vue`, a `redactToken()` helper, options-page restyle.
2. **Server:** `POST /api/folders` in `mahalinkam-srv`.
3. **Inline folder creation** — depends on (2). `apiClient.createFolder`,
   `BookmarkForm` inline editor, `App.vue` folder-list refresh.

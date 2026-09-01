# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Decided by the user (greenfield, not yet scaffolded):

- **Server:** Laravel monolith, one deployable unit.
- **Web UI:** Inertia.js + Vue 3, Vite build, Tailwind (as shipped with Breeze). No SSR.
- **Auth:** Laravel Breeze (email + password, optional email verification). No social login. Extension uses Laravel Sanctum personal access tokens.
- **Database:** DB-agnostic via Eloquent — MySQL, Postgres, or SQLite. Portable migrations, no raw SQL.
- **Queue:** Laravel `database` driver by default (no Redis dependency for self-hosters).
- **Browser extension:** WebExtension, Manifest V3, kept portable across Chromium (Chrome, Edge, Brave, Arc) and Firefox.
- **Distribution:** single Docker image + compose file for the server; extension zipped for the Chrome Web Store and AMO.

Full technical shape is captured in `docs/brainstorming.md`.

## Users

Primary user: a technically comfortable person who works across multiple machines and browsers and does not want their bookmarks tied to one browser's sync. Comfortable with Docker, self-hosting, API tokens, and the concepts of folders, tags, and a JSON API. The homelab / self-hoster crowd.

The product is multi-user: one deployment serves many such people, each with a private bookmark set. Public sign-up is allowed or disallowed by a deployment config flag (`SIGNUPS_ENABLED`).

Not a target for v1: non-technical users who need hand-holding to sign up and organise bookmarks. The web UI may assume familiarity with self-hosting concepts.

## Product Purpose

mahalinkam is a self-hosted bookmark manager with a companion browser extension. Bookmarks live on the user's own server, so they roam across every machine and browser the user touches without relying on a browser vendor's sync. It replaces the ad-hoc "shared text file of URLs" with real structure: a nested folder tree plus cross-cutting tags, search, and import/export.

Success: a self-hoster deploys it once, connects the extension on each machine, imports their existing pile of URLs, and from then on saves and finds bookmarks from anywhere without thinking about which browser they are in.

## Positioning

- **Server-owned, browser-independent.** The source of truth is the user's server, not a browser profile or a third-party cloud account.
- **Separate store, not a native-bookmark sync.** The extension never touches the browser's native bookmark tree — no two-way sync, no conflict resolution, no dedup against browser state. This is a deliberate simplicity choice competitors that mirror native bookmarks cannot claim.
- **Self-hostable multi-tenant.** One deployment can host many private accounts, with sign-up gated by config — not a single-user appliance, not a hosted SaaS.
- **Folders and tags, not one or the other.** Primary hierarchy plus cross-cutting labels.

## Operating Context

- Users move between several computers (home, work, laptop) and more than one browser family.
- The server is deployed by the user, typically via Docker / docker-compose, alongside their other self-hosted services.
- Each machine runs the browser extension, configured once with the server URL and a personal access token generated in the web UI.
- Day-to-day use is split: the **web UI** is the primary place to browse, organise, import, and export; the **extension** is a thin companion for "save this page" and "quick search / open" while browsing.
- Existing bookmarks arrive as a bulk import — often a plain list of bare URLs with no titles or tags — which the server enriches by fetching page metadata in the background.

## Capabilities and Constraints

Confirmed for v1:

- Per-user bookmarks, fully private; no sharing between users.
- Nested folder tree (one per user); a bookmark belongs to exactly one folder or none ("Unfiled").
- Tags: many-to-many, unique per user.
- Bookmark fields: url, title, description, favicon, plus a metadata-fetch status.
- Duplicate handling: saving an already-saved URL (after normalisation) returns the existing bookmark flagged as such; the extension switches to "edit".
- Search: portable `LIKE` over title / url / description plus tag-name match, with folder and tag filters. No page-content full-text in v1.
- Import / export formats: Netscape bookmark HTML, CSV, JSON, and bare-URL text. Import runs as a queued batch with progress and per-row errors.
- Background jobs: `FetchBookmarkMetadata` (title, `og:description`, favicon; retries; SSRF guard against private/loopback IPs) and `ImportBookmarks`.
- JSON API for the extension: ping, list/search bookmarks, create (idempotent per normalised URL), lookup-by-url, patch, delete, list folders, list tags. Rate-limited; same validation and authorization as the web side.
- Extension surfaces: options page (server URL + token + test connection), toolbar popup (save / edit form + quick search), context-menu save, toolbar icon state showing whether the current page is saved, configurable keyboard command.

Deployment config flags (safe defaults):

- `SIGNUPS_ENABLED` (default true) — gates the registration route and its UI.
- `METADATA_FETCH_ENABLED` (default true) — allows outbound HTTP to fetch page metadata; some self-hosters lock this down.
- `METADATA_FETCH_TIMEOUT`, `METADATA_FETCH_MAX_BYTES` — fetcher guard rails.

Explicitly undecided (open items for the spec, per `docs/brainstorming.md`): exact URL-normalisation rules, folder-tree depth limit, import file size cap, whether the web UI needs "open all in folder", extension offline behaviour, API pagination style.

## Brand Commitments

- **Name:** mahalinkam. Binding. It is a wordplay on the Tamil name *Mahalingam*, bending it to contain "link". It reads as **"the great link."** Voice can lean lightly playful and confident about that pun without being jokey; the product itself is a straightforward, no-nonsense tool.
- No existing logo, palette, typography, or other identity assets. None are binding yet.

## Evidence on Hand

- `docs/brainstorming.md` — full product and technical brief from the design session.
- No real users, testimonials, screenshots, benchmarks, or press yet. Future work must not fabricate any. There is no existing deployment to reference.

## Product Principles

1. **The server is the source of truth.** Every client is a view onto it; no client-side state is authoritative, and the browser's own bookmarks are out of scope.
2. **Refuse the sync problem.** A separate store with idempotent saves beats two-way native-bookmark sync. Do not add conflict resolution, merge UI, or dedup-against-browser features.
3. **Portable by default.** No database-specific SQL, no Redis requirement, no Chrome-only extension APIs. A self-hoster picks their stack, not ours.
4. **Bulk import is the first real experience.** The onboarding path assumes a messy list of bare URLs and makes it useful without manual cleanup.
5. **Self-hoster-legible.** Config flags, tokens, and failure modes (metadata fetch off, signups disabled, server unreachable) are surfaced plainly, not hidden.

## Accessibility & Inclusion

No product-specific standard was set. Hold to reasonable modern web defaults: full keyboard operability for the bookmark list, folder tree, and all forms; visible focus; adequate contrast; correct labelling of the icon-only controls in the extension popup.

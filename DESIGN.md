---
name: mahalinkam extension
description: Thin toolbar companion for the self-hosted mahalinkam bookmark server
colors:
  accent: '#1d4ed8'
  accent-dark: '#2563eb'
  link-dark: '#60a5fa'
  accent-tint: '#93c5fd'
  accent-shadow-dark: '#1e3a8a'
  accent-wash: '#eef3fd'
  accent-chip: '#dde7fb'
  accent-chip-fg-dark: '#dbe4fb'
  ink: '#111827'
  ok: '#16a34a'
  status-off: '#9ca3af'
  trough: '#f3f4f6'
  trough-dark: '#0f0f0f'
  hairline-dark: '#2a2a2a'
  skeleton-dark: '#2e2e2e'
  text: '#1a1a1a'
  text-dark: '#e8e8e8'
  muted: '#6b7280'
  surface: '#ffffff'
  surface-dark: '#171717'
  field-dark: '#1e1e1e'
  hairline: '#e5e7eb'
  border-input: '#bbbbbb'
  border-soft: '#d1d5db'
  border-dark: '#555555'
  row-hover: '#f1f5f9'
  row-hover-dark: '#262626'
  danger: '#b91c1c'
  danger-fg-dark: '#fca5a5'
  danger-bg: '#fef2f2'
  danger-bg-dark: '#2a1414'
  danger-border: '#fecaca'
  danger-border-dark: '#7f1d1d'
  chip-blank: '#d1d5db'
  chip-blank-dark: '#4b5563'
typography:
  mono-identity:
    fontFamily: 'ui-monospace, SF Mono, Menlo, Consolas, monospace'
    fontSize: '0.82rem'
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: '0.14em'
  mono-tab:
    fontFamily: 'ui-monospace, SF Mono, Menlo, Consolas, monospace'
    fontSize: '0.72rem'
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: '0.08em'
  h1:
    fontFamily: 'system-ui, sans-serif'
    fontSize: '1.05rem'
    fontWeight: 600
    lineHeight: 1.3
  control:
    fontFamily: 'system-ui, sans-serif'
    fontSize: '0.9rem'
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: 'system-ui, sans-serif'
    fontSize: '0.85rem'
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: 'system-ui, sans-serif'
    fontSize: '0.78rem'
    fontWeight: 600
    lineHeight: 1.3
  meta:
    fontFamily: 'system-ui, sans-serif'
    fontSize: '0.72rem'
    fontWeight: 400
    lineHeight: 1.3
rounded:
  mark: '2px'
  xs: '3px'
  sm: '4px'
  segment: '5px'
  control: '7px'
  frame: '12px'
spacing:
  hairline: '4px'
  xs: '4px'
  sm: '8px'
  row-y: '6px'
  card: '13.6px'
components:
  button-primary:
    backgroundColor: '{colors.accent}'
    textColor: '{colors.surface}'
    rounded: '{rounded.sm}'
    padding: '8px 16px'
    typography: '{typography.control}'
  button-danger:
    backgroundColor: 'transparent'
    textColor: '{colors.danger}'
    rounded: '{rounded.sm}'
    padding: '8px 12px'
    typography: '{typography.control}'
  brandbar:
    backgroundColor: 'transparent'
    textColor: '{colors.ink}'
    typography: '{typography.mono-identity}'
    padding: '0 0 8.8px'
  tab-group:
    backgroundColor: '{colors.hairline}'
    rounded: '{rounded.control}'
    padding: '2px'
  tab:
    backgroundColor: 'transparent'
    textColor: '{colors.muted}'
    rounded: '{rounded.segment}'
    padding: '6.4px 5.6px'
    typography: '{typography.mono-tab}'
  tab-active:
    backgroundColor: '{colors.accent}'
    textColor: '{colors.surface}'
    rounded: '{rounded.segment}'
    padding: '6.4px 5.6px'
    typography: '{typography.mono-tab}'
  row:
    backgroundColor: 'transparent'
    textColor: 'inherit'
    rounded: '{rounded.sm}'
    padding: '6.4px 5.6px'
  input:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text}'
    rounded: '{rounded.sm}'
    padding: '6.4px 8.8px'
    typography: '{typography.body}'
---

## Overview

mahalinkam's browser extension is a **thin toolbar companion**, not an app. Its
whole surface is a ~340px popup that opens over whatever page the user is on, does
one job — save this page, or find and open a saved one — and gets out of the way.
Mode is **Operate**: the visitor is completing a task in a hurry. Scanability,
native form affordances, and speed outrank expression.

The character is **a precision instrument for people who live in a terminal** —
not a generic SaaS widget. That reads through three deliberate moves: a
**monospace identity layer** (wordmark, section labels, hosts, breadcrumb), a
**segmented tab control** with a filled active segment instead of the default
underline, and one **committed indigo** (`accent` `#1d4ed8`) doing all the
emphasis. A slim identity band tops every screen: an offset-shadowed square mark,
the lowercase letter-spaced `mahalinkam` wordmark, and a connection status dot.
Still no illustration, no gradients, no marketing voice — the boldness is in
structure, weight, and type, not decoration.

The options page (server URL + token) shares the same language at a slightly
roomier scale.

## Colors

**One indigo, one family.** `accent` `#1d4ed8` carries every affordance — the
filled active tab segment, primary buttons, links, breadcrumb crumbs, the
back-link, the identity mark, focus rings. Its tints stay in the same hue: the
mark's offset shadow is `accent-tint` `#93c5fd`; tag chips fill `accent-chip`
`#dde7fb` with `accent` text; faint hover washes (breadcrumb, autocomplete
option) are `accent-wash` `#eef3fd`. **No second blue** — the tag chips used to
run their own indigo (`#3730a3` / `#e0e7ff`); that was drift and is gone.

Everything else is a neutral grey ramp: near-black `text` / `ink` `#111827` on
white `surface`, `muted` `#6b7280` for every secondary line (hosts, hints, field
descriptions — one grey, not `#666` and `#6b7280` side by side), `hairline`
`#e5e7eb` for the identity-band divider and the tab-group trough, `border-input`
/ `border-soft` for form controls, `status-off` `#9ca3af` for inert glyphs
(breadcrumb separator, row chevron).

`ok` `#16a34a` is the "connected" status dot in the identity band (grey `#9ca3af`
when unconfigured). Like `danger`, it is a status signal, never decoration.

`danger` `#b91c1c` is reserved for destructive and error states only — the Delete
button, the error notice (`danger-bg` fill, `danger-border` stroke), rejected-token
copy. It never appears as decoration.

Dark mode is a full parallel set triggered by `prefers-color-scheme: dark`:
`surface-dark` `#171717`, `text-dark` `#e8e8e8`, `accent-dark` `#2563eb` (the
committed indigo lightens one step for contrast on dark; link/crumb text uses
`link-dark` `#60a5fa`), `field-dark` `#1e1e1e` inputs, `row-hover-dark` `#262626`
(also the breadcrumb/autocomplete hover in dark), `trough-dark` `#0f0f0f` +
`hairline-dark` `#2a2a2a` for the tab group, `skeleton-dark` `#2e2e2e` for
loading rows. Tag chips invert to `accent-shadow-dark` `#1e3a8a` fill with
`accent-chip-fg-dark` `#dbe4fb` text. Every color token has a light definition;
only the dark overrides live inside the media query.

Favicon fallback: a `chip-blank` grey square the same 16px box a real favicon
occupies, so rows never reflow when an icon is missing.

## Typography

Two families, both system: `system-ui, sans-serif` for content, and a
**monospace identity layer** (`ui-monospace, "SF Mono", Menlo, Consolas,
monospace`) for the wordmark and structural chrome. No web fonts — a toolbar
popup must paint instantly and match the host OS.

Monospace, uppercase/lowercase + letter-spaced, is the signature:

- **mono-identity** 0.82rem/700, `0.14em` tracking, lowercase — the `mahalinkam`
  wordmark.
- **mono-tab** 0.72rem/700, `0.08em` tracking, uppercase — the segmented tab
  labels (SAVE / LIST / SEARCH).

The content ramp (sans) is otherwise unchanged:

- **h1** 1.05rem/600 — the setup screen heading, essentially the only true title.
- **control** 0.9rem/600 — primary buttons, text inputs.
- **body** 0.85rem/400 (600 for tabs and row titles) — tab labels, bookmark
  titles, list content.
- **label** 0.78rem/600 — form field labels ("Title", "Folder", "Tags").
- **page-url** 0.76rem — the URL line under the favicon in the save form.
- **meta** 0.72rem — host lines, breadcrumb, "Load more", hints.

Titles and hosts truncate with `text-overflow: ellipsis` on a single line; the row
never grows to two lines.

## Layout

Fixed **340px** popup width, `0.85rem` padding. Single column, vertical stack.

Structure top to bottom: **identity band** (mark + wordmark + status dot, 1px
`hairline` divider below), then the **segmented tab control**, then one active
section. The tab control is a flex row inside a `hairline`-filled, `control` 7px
trough with 2px inset padding; each tab is `flex: 1`; the active one is a filled
`accent` `segment` (5px) with white text and a faint drop shadow, inactive tabs
are transparent with `muted` text.

Lists cap at `max-height: 20rem` and scroll internally — the popup body itself
never scrolls sideways and rarely grows tall. Rows are full-width flex:
16px leading icon/favicon, a `min-width: 0` flex text column (so ellipsis works),
optional trailing control (chevron, Edit). Row vertical padding `6.4px`, hover
fill `row-hover`.

The List tab adds a wrapping breadcrumb bar above the scroll area (`All › Folder ›
Subfolder`); crumbs are `accent` text buttons, the last crumb is plain bold
`text`.

Forms: stacked `label > span + control` blocks, `0.6rem` gap, full-width controls
with `box-sizing: border-box`. Actions row is primary button (`flex: 1`) beside an
optional outline Delete.

The preview harness frames the popup in a `rounded.frame` 12px card with a soft
drop shadow to stand in for the browser toolbar; that frame is harness-only, not
part of the extension.

## Elevation & Depth

Near-flat by design. The popup has no elevation of its own (the browser draws its
frame). Within it:

- Two small, deliberate shadows only: the identity **mark** casts a hard 3px
  `accent-tint` offset block (a printed-label / risograph feel, not a blur), and
  the active tab **segment** has a 1px `rgba(accent, .35)` drop shadow to lift it
  off the trough.
- One floating surface earns real elevation: the tag **autocomplete popover**
  (`0 4px 12px rgba(0,0,0,.12)` — offset + soft blur). It is the only
  blurred shadow in the system; nothing in the normal flow is elevated.
- Depth is otherwise color: the filled active tab segment, `row-hover` /
  `row-hover-dark` fills, the tab trough's recessed `hairline` fill.
- The error notice uses a tinted fill + 1px border, not a shadow.
- **Motion inventory** — this is the whole list; every piece is gated on
  `prefers-reduced-motion`, and there is exactly one perpetual loop:
  - List tab: 150ms `translateX(6px)` + fade "slide-in" on folder-scope change;
    skeleton rows pulse while loading.
  - **Save confirmation:** on success the identity **mark** plays one 220ms
    "stamp" (scale `1 → 0.86 → 1`, offset shadow snapping `3px → 1px → 3px` — a
    rubber-stamp hitting paper); the popup then holds ~400ms (so the live region
    can announce) and dismisses. Under reduced motion the stamp is skipped but
    the ~400ms hold stays.
  - The "connected" **status dot** breathes on a calm 3s `box-shadow` ring
    (`0 0 0 3px → 5px`) — the single deliberate perpetual loop, kept subliminal
    so it reads as "alive" not "nagging". Off entirely under reduced motion.
  - Primary buttons dip `translateY(1px) scale(~0.985)` on `:active`.
  - Nothing else: no entrance animation, no hover transitions beyond color, no
    other loop.

## Shapes

- Corner radius stays small: `4px` on buttons, inputs, `<select>`, rows, and the
  error notice; `3px` on favicons and the Edit chip; `5px` on tab segments inside
  a `7px` tab trough; `2px` on the identity mark (nearly square).
- The status dot is the one intentional circle. Otherwise no pills, no circles
  (favicon fallbacks inherit the 3px square).
- Borders are 1px, hairline-weight throughout — the segmented control replaced
  the old 2px underline, so there are no 2px strokes left.
- Icons are 16px line icons drawn with `currentColor` (`stroke-width: 2`,
  round caps/joins) — folder, inbox (Unfiled), chevron. They inherit text color
  and dim to `muted` for the trailing chevron.

## Components

- **Identity band** — flex row: 11px `accent` **mark** with a 3px `accent-tint`
  offset shadow (stamps once on a successful save), `mono-identity` lowercase
  **wordmark**, then a right-aligned 7px **status dot** — `role="img"` with an
  `aria-label` ("Server connected" / "Server not connected"), `ok` green + soft
  ring and a 3s breathing loop when connected, grey and still when not. 1px
  `hairline` divider below. Present on every screen including setup.
- **Live region** — a visually-hidden `role="status"` `aria-live="polite"` line
  that announces "Bookmark saved / updated / deleted" before the popup dismisses
  (the ~400ms close hold gives it time to fire).
- **Segmented tabs** — a `hairline`-filled `7px` trough (2px inset padding)
  holding three `flex: 1` `mono-tab` uppercase buttons. Active = filled `accent`
  `5px` segment, white text, faint accent drop shadow. Inactive = transparent,
  `muted`, → `ink` on hover. Full WAI-ARIA tabs pattern: `role="tablist"` /
  `role="tab"` / `aria-selected` / `aria-controls`, roving `tabindex`,
  arrow-key + Home/End selection with focus follow, and `role="tabpanel"`
  sections labelled by their tab.
- **Back-link** — a borderless `mono-tab`-weight `accent` text button ("← Back to
  list") shown in the form only when it was opened from a List row; underlines on
  hover. The lone in-flow navigation affordance; everything else is the tab bar
  or the breadcrumb.
- **Primary button** — solid `accent`, white text, `4px` radius, `600` weight.
  `flex: 1` in an actions row. `:disabled` drops to `opacity: 0.6`.
- **Danger button** — transparent fill, `danger` text + 1px `danger` border,
  same radius/size. Only for Delete.
- **Row** (bookmark / folder) — full-width flex button, transparent, `4px`
  radius, `row-hover` on hover, `inherit` color. Leading 16px favicon or line
  icon; ellipsized title; `meta` host line; optional trailing chevron or a small
  outline **Edit** chip (0.75rem/600, `border-soft`, `muted` → `accent` on hover).
- **Breadcrumb** — wrapping flex row of `accent` text-button crumbs separated by a
  `muted` `›`; the current (last) crumb is non-interactive bold `text`.
- **Text input / textarea / select** — full-width, 1px `border-input`, `4px`
  radius, `control`/`body` size; dark mode swaps to `field-dark` + `border-dark`.
- **Tag chips** — `accent-chip` fill + `accent` text, `3px` radius, `0.78rem`,
  with an inline `×` remove button (`aria-label="Remove tag"`). Dark:
  `accent-shadow-dark` fill + `accent-chip-fg-dark` text. They read as accent-hued
  objects, never as a second color.
- **Autocomplete popover** — the tag suggestion list: white/`field-dark` surface,
  1px `border-input`, `4px` radius, the one blurred shadow in the system
  (`0 4px 12px rgba(0,0,0,.12)`); options hover `accent-wash` (light) /
  `row-hover-dark` (dark).
- **Error notice** — `role="alert"`, `danger-bg` fill, 1px `danger-border`,
  `danger` text at `meta`+ size. Inline action button: "Retry" for
  Network/Server errors, "Settings" for a rejected token (`AuthError`), none for
  validation.
- **Skeleton row** — 2rem tall `hairline` (light) / `skeleton-dark` (dark) block,
  `4px` radius, gentle opacity pulse; 3 shown during first load of a folder.
- **Empty / hint text** — single `meta`-size `muted` line ("Nothing in this
  folder yet.", "No matches.").

## Do's and Don'ts

- **Do** keep one accent color (`#1d4ed8`). New affordances use `accent`; the
  only other saturated colors are the `ok` / `danger` status signals.
- **Do** use the monospace family for structural chrome (wordmark, tab labels,
  hosts, breadcrumb, "Load more") and the sans family for content (titles,
  descriptions, body copy). Don't blur the two.
- **Do** match native form controls — real `<select>`, real `<input type=search>`,
  full keyboard operability, visible focus, labelled icon-only buttons.
- **Do** hold the type ramp. Reach for an existing step before inventing a size.
- **Do** keep rows single-line with ellipsis; keep lists scrolling internally.
- **Don't** add shadows beyond the three sanctioned ones (mark offset block,
  active tab segment lift, autocomplete popover). No gradients, no illustration,
  no entrance animation, and no perpetual motion except the one status breath.
- **Don't** let the popup exceed ~340px wide or introduce horizontal scroll.
- **Don't** use `danger` red for anything but destructive actions and errors.
- **Don't** add marketing voice — labels are plain and short ("Save", "List",
  "Load more", "This page can't be saved.").
- **Don't** ship web fonts or block first paint on network.

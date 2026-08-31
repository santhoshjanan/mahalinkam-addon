# mahalinkam browser extension

A companion to the self-hosted [mahalinkam](../mahalinkam-srv) bookmark server. It
does two things:

- **Save the current page** (or a right-clicked link) to your mahalinkam server,
  with a folder and tags.
- **Quick search** your bookmarks from the toolbar popup and open a result in a
  new tab.

There is no local bookmark store. Every bookmark lives on *your* server; the
extension is a thin client that talks to its JSON API. It has no retry logic and
no offline queue — if the server is unreachable it tells you and offers Retry.

MV3, built from one source for both Chromium and Firefox.

## Install (unpacked, for development)

```bash
npm install
npm run build      # emits dist/chrome and dist/firefox
```

**Chrome / Edge / Brave:** open `chrome://extensions`, turn on **Developer mode**,
click **Load unpacked**, and pick the `dist/chrome` directory.

**Firefox:** open `about:debugging` → **This Firefox** → **Load Temporary
Add-on…** and pick `dist/firefox/manifest.json`. (A temporary add-on is removed
when Firefox restarts; reload it the same way.)

## First run

1. Open the extension's **Options** page (from `chrome://extensions` or
   `about:addons`, or right-click the toolbar icon → Options).
2. Enter your mahalinkam **server URL** (e.g. `https://links.example.com`) and an
   **API token**. Create a token in the mahalinkam web UI under
   **Settings → API tokens** (`/settings/tokens`).
3. Click **Save & verify**. The extension asks for permission to access your
   server's address — **accept it**. On success the page shows the account you
   are connected as and the server version.

The server URL and token are the only configuration. They are stored in
`browser.storage.local`.

## Use

- **Toolbar icon** is filled when the current page is already bookmarked, and an
  outline when it is not. Click it to open the popup:
  - on an unsaved page → a **Save** form (title/description prefilled, pick a
    folder, add tags);
  - on a saved page → an **Edit** form with a **Delete** button;
  - switch to **Quick search** to find any bookmark and open it in a new tab.
- **Context menu:** right-click a page or a link → **Save page to mahalinkam** /
  **Save link to mahalinkam**. A notification confirms the save.
- **Keyboard:** `Ctrl+Shift+D` (`Cmd+Shift+D` on macOS) opens the popup for the
  current page.

The extension sends the **raw** page URL to the server; the server normalizes it
(strips `utm_*` and other tracking params, drops the fragment, etc.). CORS is not
a concern: the extension fetches to an origin you have granted host permission
for, which bypasses CORS entirely — no server-side CORS config is needed.

## The URL-normalization fixture is a cross-client contract

`src/lib/urlNormalizer.ts` is a byte-for-byte port of the server's normalization
rules. `src/lib/__fixtures__/url-normalizer.json` MUST stay identical in meaning
to the server's `../mahalinkam-srv/app/Support/url-normalizer-fixtures.php`.

If you change normalization on either side, update **both** fixture files and
re-run **both** test suites (`npm test` here, `php artisan test` in the server
repo). A mismatch is release-blocking.

## Development

| Command | What it does |
|---|---|
| `npm run dev` | Vite in watch mode |
| `npm test` | Vitest (run once) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run lint` | ESLint + Prettier check |
| `npm run build` | Production build → `dist/chrome` + `dist/firefox` |
| `npm run package` | Build, then zip each target → `artifacts/*.zip` |

`npm run package` produces the store-submission zips:
`artifacts/mahalinkam-<version>-chrome.zip` for the Chrome Web Store and
`artifacts/mahalinkam-<version>-firefox.zip` for addons.mozilla.org (AMO).

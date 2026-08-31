/**
 * Read the basics of the tab the popup was opened from.
 *
 * The popup normally targets the active tab of the current window. Missing
 * `url` / `title` (e.g. a restricted page) degrade to empty strings so callers
 * never have to null-check.
 *
 * When the popup was opened as a standalone window by the keyboard-command
 * fallback (`browser.windows.create`), `tabs.query({active,currentWindow})`
 * would resolve to the extension page itself. That path passes the real tab's
 * URL as a `?url=` search param, which takes precedence when present.
 */
import browser from 'webextension-polyfill';

export interface ActiveTab {
  url: string;
  title: string;
  favIconUrl?: string;
}

export async function useActiveTab(): Promise<ActiveTab> {
  const fromParam = new URLSearchParams(location.search).get('url');
  if (fromParam) {
    return { url: fromParam, title: '', favIconUrl: undefined };
  }

  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return {
    url: tab?.url ?? '',
    title: tab?.title ?? '',
    favIconUrl: tab?.favIconUrl,
  };
}

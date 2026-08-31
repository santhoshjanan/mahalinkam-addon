/**
 * Read the basics of the tab the popup was opened from.
 *
 * The popup always targets the active tab of the current window. Missing
 * `url` / `title` (e.g. a restricted page) degrade to empty strings so callers
 * never have to null-check.
 */
import browser from 'webextension-polyfill';

export interface ActiveTab {
  url: string;
  title: string;
  favIconUrl?: string;
}

export async function useActiveTab(): Promise<ActiveTab> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return {
    url: tab?.url ?? '',
    title: tab?.title ?? '',
    favIconUrl: tab?.favIconUrl,
  };
}

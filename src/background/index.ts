/**
 * mahalinkam background service worker.
 *
 * Responsibilities:
 *  - Context menus ("Save page" / "Save link") → `apiClient.createBookmark`.
 *  - Toolbar icon state (filled when the current page is bookmarked, outline
 *    otherwise) driven by tab activation / navigation, debounced per tab.
 *  - The `save_current_page` keyboard command → open the popup.
 *
 * Only `iconState` is unit-tested; this wiring is covered by the manual smoke
 * checklist. Every event listener swallows its own errors — a failed lookup or
 * a network blip must never throw out of a listener.
 */
import browser from 'webextension-polyfill';
import { apiClient } from '../lib/apiClient';
import { getSettings } from '../lib/storage';
import { hasOriginPermission } from '../lib/permissions';
import {
  AuthError,
  NetworkError,
  NotConfiguredError,
  ServerError,
  ValidationError,
} from '../lib/errors';
import { resolveIcon, makeLookupCache } from './iconState';

const MENU_SAVE_PAGE = 'save-page';
const MENU_SAVE_LINK = 'save-link';
const NOT_CONFIGURED_MSG = 'Configure mahalinkam first (extension options)';
const ICON_DEBOUNCE_MS = 400;

/** Single shared lookup cache for the worker's lifetime (60s TTL). */
const lookupCached = makeLookupCache((u: string) => apiClient.lookup(u), 60_000);

// ---------------------------------------------------------------------------
// Context menus
// ---------------------------------------------------------------------------

browser.runtime.onInstalled.addListener(() => {
  browser.contextMenus.create({
    id: MENU_SAVE_PAGE,
    title: 'Save page to mahalinkam',
    contexts: ['page'],
  });
  browser.contextMenus.create({
    id: MENU_SAVE_LINK,
    title: 'Save link to mahalinkam',
    contexts: ['link'],
  });
});

function notify(message: string): void {
  void browser.notifications
    .create({
      type: 'basic',
      iconUrl: browser.runtime.getURL('src/assets/icon-128.png'),
      title: 'mahalinkam',
      message,
    })
    .catch(() => {
      /* notifications permission may be absent; nothing else to do */
    });
}

/** Map a thrown value to a user-facing notification string. */
function errorMessage(err: unknown): string {
  if (err instanceof NotConfiguredError) return NOT_CONFIGURED_MSG;
  if (err instanceof AuthError) return 'Authentication failed — re-check your token in options';
  if (err instanceof ValidationError) return err.message || 'The server rejected that URL';
  if (err instanceof ServerError) return `Server error (${err.status})`;
  if (err instanceof NetworkError) return 'Could not reach the mahalinkam server';
  return 'Could not save — something went wrong';
}

async function saveUrl(url: string | undefined): Promise<void> {
  if (!url) {
    notify('Nothing to save here');
    return;
  }
  if (!(await getSettings())) {
    notify(NOT_CONFIGURED_MSG);
    return;
  }
  try {
    const { alreadySaved } = await apiClient.createBookmark({ url });
    notify(alreadySaved ? 'Already saved' : 'Saved');
  } catch (err) {
    notify(errorMessage(err));
  }
}

browser.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === MENU_SAVE_PAGE) {
    void saveUrl(tab?.url);
  } else if (info.menuItemId === MENU_SAVE_LINK) {
    void saveUrl(typeof info.linkUrl === 'string' ? info.linkUrl : undefined);
  }
});

// ---------------------------------------------------------------------------
// Toolbar icon state
// ---------------------------------------------------------------------------

/**
 * Set the toolbar icon for one tab based on whether its URL is bookmarked.
 * Never throws: a lookup failure leaves the icon as-is.
 */
async function updateIconForTab(tabId: number, url: string | undefined): Promise<void> {
  try {
    if (!url || !/^https?:/i.test(url)) return;

    const settings = await getSettings();
    if (!settings || !(await hasOriginPermission(settings.serverUrl))) {
      await browser.action.setBadgeText({ tabId, text: '!' });
      await browser.action.setIcon({ tabId, ...resolveIcon(false) });
      return;
    }

    const { found } = await lookupCached(url);
    await browser.action.setIcon({ tabId, ...resolveIcon(found) });
    await browser.action.setBadgeText({ tabId, text: '' });
  } catch {
    // Swallow — do not let a lookup / API error escape the listener.
  }
}

const iconDebounce = new Map<number, ReturnType<typeof setTimeout>>();

function scheduleIconUpdate(tabId: number, url: string): void {
  const pending = iconDebounce.get(tabId);
  if (pending) clearTimeout(pending);
  iconDebounce.set(
    tabId,
    setTimeout(() => {
      iconDebounce.delete(tabId);
      void updateIconForTab(tabId, url);
    }, ICON_DEBOUNCE_MS),
  );
}

browser.tabs.onActivated.addListener((activeInfo) => {
  void (async () => {
    try {
      const tab = await browser.tabs.get(activeInfo.tabId);
      await updateIconForTab(activeInfo.tabId, tab.url);
    } catch {
      /* tab gone */
    }
  })();
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && typeof tab.url === 'string') {
    scheduleIconUpdate(tabId, tab.url);
  }
});

browser.tabs.onRemoved.addListener((tabId) => {
  const pending = iconDebounce.get(tabId);
  if (pending) {
    clearTimeout(pending);
    iconDebounce.delete(tabId);
  }
});

// ---------------------------------------------------------------------------
// Keyboard command
// ---------------------------------------------------------------------------

browser.commands.onCommand.addListener((command) => {
  if (command !== 'save_current_page') return;
  void (async () => {
    try {
      await browser.action.openPopup();
    } catch {
      try {
        await browser.windows.create({
          url: browser.runtime.getURL('src/popup/index.html?mode=save'),
          type: 'popup',
          width: 400,
          height: 560,
        });
      } catch {
        /* nothing more we can do */
      }
    }
  })();
});

export {};

import browser from 'webextension-polyfill';

export interface Settings {
  serverUrl: string;
  token: string;
}

const KEY_URL = 'serverUrl';
const KEY_TOKEN = 'token';

export async function getSettings(): Promise<Settings | null> {
  const got = await browser.storage.local.get([KEY_URL, KEY_TOKEN]);
  const serverUrl = (got[KEY_URL] as string | undefined)?.trim() ?? '';
  const token = (got[KEY_TOKEN] as string | undefined)?.trim() ?? '';
  if (!serverUrl || !token) return null;
  return { serverUrl, token };
}

export async function saveSettings(s: Settings): Promise<void> {
  await browser.storage.local.set({
    [KEY_URL]: s.serverUrl.trim().replace(/\/+$/, ''),
    [KEY_TOKEN]: s.token.trim(),
  });
}

export async function clearSettings(): Promise<void> {
  await browser.storage.local.remove([KEY_URL, KEY_TOKEN]);
}

export function onSettingsChanged(cb: (s: Settings | null) => void): void {
  browser.storage.onChanged.addListener(() => {
    void getSettings().then(cb);
  });
}

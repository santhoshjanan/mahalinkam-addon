import { it, expect, beforeEach } from 'vitest';
import { browserMock } from '../../test/mockBrowser';
import { getSettings, saveSettings, clearSettings } from '../storage';

beforeEach(() => browserMock.__reset());

it('returns null when unconfigured', async () => {
  expect(await getSettings()).toBeNull();
});

it('round-trips settings and trims the server url', async () => {
  await saveSettings({ serverUrl: 'https://mhl.example.com/', token: 'abc' });
  expect(await getSettings()).toEqual({
    serverUrl: 'https://mhl.example.com',
    token: 'abc',
  });
});

it('returns null after clear', async () => {
  await saveSettings({ serverUrl: 'https://x.test', token: 't' });
  await clearSettings();
  expect(await getSettings()).toBeNull();
});

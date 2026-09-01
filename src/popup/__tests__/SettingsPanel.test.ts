import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { browserMock } from '../../test/mockBrowser';

const api = vi.hoisted(() => ({ ping: vi.fn() }));
vi.mock('../../lib/apiClient', () => ({ apiClient: api }));

import SettingsPanel from '../components/SettingsPanel.vue';

beforeEach(async () => {
  vi.clearAllMocks();
  browserMock.__reset();
  await browserMock.storage.local.set({
    serverUrl: 'https://mhl.example.com',
    token: 'sk_live_abcdefghijkl9f2a',
  });
  api.ping.mockResolvedValue({
    ok: true,
    user: { id: 1, name: 'San', email: 's@x.test' },
    server: { version: '0.1.2' },
  });
  browserMock.permissions.request.mockResolvedValue(true);
});

async function mountPanel() {
  const w = mount(SettingsPanel);
  await flushPromises();
  return w;
}

describe('SettingsPanel', () => {
  it('pings on open and shows the connected account', async () => {
    const w = await mountPanel();
    expect(api.ping).toHaveBeenCalled();
    expect(w.find('.status--ok').text()).toContain('Connected as San');
    expect(w.find('.status--ok').text()).toContain('0.1.2');
  });

  it('shows the endpoint and a redacted token', async () => {
    const w = await mountPanel();
    const values = w.findAll('.value').map((n) => n.text());
    expect(values[0]).toBe('https://mhl.example.com');
    expect(values[1]).toMatch(/^•+9f2a$/); // last 4 kept
  });

  it('Edit reveals the URL input; Replace token reveals a password field', async () => {
    const w = await mountPanel();
    expect(w.find('input[type="url"]').exists()).toBe(false);

    await w
      .findAll('.linkbtn')
      .find((b) => b.text() === 'Edit')!
      .trigger('click');
    expect(w.find('input[type="url"]').exists()).toBe(true);

    await w
      .findAll('.linkbtn')
      .find((b) => b.text() === 'Replace token')!
      .trigger('click');
    expect(w.find('input[type="password"]').exists()).toBe(true);
  });

  it('Save & verify grants permission, persists, and re-pings', async () => {
    const w = await mountPanel();
    await w
      .findAll('.linkbtn')
      .find((b) => b.text() === 'Replace token')!
      .trigger('click');
    await w.find('input[type="password"]').setValue('sk_live_NEWTOKEN2222');
    await w.find('.primary').trigger('click');
    await flushPromises();

    expect(browserMock.permissions.request).toHaveBeenCalled();
    const stored = await browserMock.storage.local.get(['token']);
    expect(stored.token).toBe('sk_live_NEWTOKEN2222');
    expect(api.ping).toHaveBeenCalledTimes(2); // open + verify
    // edit mode closed on success
    expect(w.find('input[type="password"]').exists()).toBe(false);
  });

  it('a failed verify shows a typed error and stays in edit mode', async () => {
    const { AuthError } = await import('../../lib/errors');
    const w = await mountPanel();
    await w
      .findAll('.linkbtn')
      .find((b) => b.text() === 'Replace token')!
      .trigger('click');
    await w.find('input[type="password"]').setValue('bad');
    api.ping.mockRejectedValueOnce(new AuthError('nope'));
    await w.find('.primary').trigger('click');
    await flushPromises();

    expect(w.find('.field-error').text()).toContain('rejected this token');
    expect(w.find('input[type="password"]').exists()).toBe(true);
  });

  it('two-stage Disconnect clears settings and emits disconnected', async () => {
    const w = await mountPanel();
    const btn = w.find('.danger');
    expect(btn.text()).toBe('Disconnect');

    await btn.trigger('click');
    expect(btn.text()).toBe('Confirm?');
    expect(w.emitted('disconnected')).toBeUndefined();

    await btn.trigger('click');
    await flushPromises();
    expect(w.emitted('disconnected')).toHaveLength(1);
    const left = await browserMock.storage.local.get(['serverUrl', 'token']);
    expect(left).toEqual({});
  });

  it('Done emits close', async () => {
    const w = await mountPanel();
    await w.find('.head .linkbtn').trigger('click');
    expect(w.emitted('close')).toHaveLength(1);
  });
});

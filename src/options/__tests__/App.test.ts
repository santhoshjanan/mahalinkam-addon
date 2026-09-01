import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { browserMock } from '../../test/mockBrowser';
import App from '../App.vue';

/**
 * Locks in the Critical-2 fix: `saveAndVerify()` must always leave `status` in a
 * terminal state ('ok' | 'error'), never stuck on 'testing' — so the
 * "Save & verify" button (`:disabled="status === 'testing'"`) can never lock
 * permanently, whether the permission request is DENIED or THROWS.
 */
describe('options App — Save & verify never traps the user', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    browserMock.__reset();
  });

  async function mountAndSubmit() {
    const wrapper = mount(App);
    await flushPromises(); // onMounted getSettings()

    await wrapper.find('input[type="url"]').setValue('https://mhl.example.com');
    await wrapper.find('input[type="password"]').setValue('secret-token');
    await wrapper.find('button.primary').trigger('click');
    await flushPromises();
    await wrapper.vm.$nextTick();
    return wrapper;
  }

  it('permission denied → error shown, button re-enabled (not stuck disabled)', async () => {
    browserMock.permissions.request.mockResolvedValueOnce(false);

    const wrapper = await mountAndSubmit();

    const msg = wrapper.find('.message');
    expect(msg.exists()).toBe(true);
    expect(msg.classes()).toContain('error');
    expect(msg.text().toLowerCase()).toContain('permission denied');

    const button = wrapper.find('button.primary');
    expect(button.attributes('disabled')).toBeUndefined();
    expect(button.text()).not.toContain('Verifying');
  });

  it('permission request throws → error shown, button re-enabled, not stuck on "Verifying…"', async () => {
    browserMock.permissions.request.mockRejectedValueOnce(new Error('request failed'));

    const wrapper = await mountAndSubmit();

    const msg = wrapper.find('.message');
    expect(msg.exists()).toBe(true);
    expect(msg.classes()).toContain('error');
    expect(msg.classes()).not.toContain('testing');
    expect(msg.text()).not.toContain('Verifying');

    const button = wrapper.find('button.primary');
    expect(button.attributes('disabled')).toBeUndefined();
  });
});

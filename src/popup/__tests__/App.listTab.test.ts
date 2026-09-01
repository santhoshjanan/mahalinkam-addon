import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { browserMock } from '../../test/mockBrowser';
import type { Bookmark } from '../../lib/apiClient';

const api = vi.hoisted(() => ({
  lookup: vi.fn(),
  listFolders: vi.fn(),
  listTags: vi.fn(),
  listBookmarks: vi.fn(),
  updateBookmark: vi.fn(),
  deleteBookmark: vi.fn(),
  createBookmark: vi.fn(),
}));
vi.mock('../../lib/apiClient', () => ({ apiClient: api }));

import App from '../App.vue';

function bookmark(over: Partial<Bookmark> = {}): Bookmark {
  return {
    id: 77,
    url: 'https://saved.test/page',
    normalized_url: 'https://saved.test/page',
    title: 'Saved Page',
    description: 'desc',
    favicon_url: null,
    folder_id: 2,
    tags: [{ id: 1, name: 'ref' }],
    metadata_status: 'done',
    ...over,
  };
}

beforeEach(async () => {
  vi.clearAllMocks();
  browserMock.__reset();
  vi.spyOn(window, 'close').mockImplementation(() => {});
  await browserMock.storage.local.set({ serverUrl: 'https://mhl.test', token: 'tok' });
  browserMock.tabs.query.mockResolvedValue([
    { url: 'https://current.test/x', title: 'X', favIconUrl: '' },
  ]);
  api.lookup.mockResolvedValue({ found: false });
  api.listFolders.mockResolvedValue([{ id: 2, parent_id: null, name: 'Refs', position: 1 }]);
  api.listTags.mockResolvedValue([]);
});

describe('popup App — List tab', () => {
  it('has a Save · List · Search tab bar', async () => {
    const wrapper = mount(App);
    await flushPromises();
    expect(wrapper.findAll('.tabs button').map((b) => b.text())).toEqual([
      'Save',
      'List',
      'Search',
    ]);
  });

  it('clicking List shows the folder browser without a bookmark fetch', async () => {
    const wrapper = mount(App);
    await flushPromises();

    await wrapper.findAll('.tabs button')[1].trigger('click');
    expect(wrapper.find('.crumbs').exists()).toBe(true);
    expect(api.listBookmarks).not.toHaveBeenCalled();
  });

  it('row Edit from the List loads that bookmark into the edit form', async () => {
    api.listBookmarks.mockResolvedValueOnce({
      data: [bookmark()],
      meta: { current_page: 1, last_page: 1, total: 1, per_page: 50 },
    });
    const wrapper = mount(App);
    await flushPromises();

    await wrapper.findAll('.tabs button')[1].trigger('click'); // List
    await wrapper.findAll('.row.folder')[0].trigger('click'); // Refs
    await flushPromises();

    await wrapper.find('.bookmark-row .edit').trigger('click');
    await flushPromises();

    // back on the form tab, in edit mode, prefilled from the row
    expect(wrapper.findAll('.tabs button')[0].text()).toBe('Edit');
    expect(wrapper.find<HTMLInputElement>('input[type="text"]').element.value).toBe('Saved Page');
    expect(wrapper.find('.bookmark-form .url').text()).toBe('https://saved.test/page');
    expect(wrapper.find('.bookmark-form .danger').exists()).toBe(true);
  });

  it('tab bar implements the ARIA tab pattern (roving tabindex + arrow keys)', async () => {
    const wrapper = mount(App);
    await flushPromises();

    const tabs = () => wrapper.findAll('.tabs button');
    expect(tabs()[0].attributes('role')).toBe('tab');
    expect(tabs()[0].attributes('aria-controls')).toBe('panel-form');
    expect(tabs()[0].attributes('tabindex')).toBe('0');
    expect(tabs()[1].attributes('tabindex')).toBe('-1');

    await tabs()[0].trigger('keydown', { key: 'ArrowRight' });
    expect(tabs()[1].attributes('aria-selected')).toBe('true');
    expect(tabs()[1].attributes('tabindex')).toBe('0');
    expect(tabs()[0].attributes('tabindex')).toBe('-1');
    expect(wrapper.find('#panel-list').isVisible()).toBe(true);

    await tabs()[1].trigger('keydown', { key: 'Home' });
    expect(tabs()[0].attributes('aria-selected')).toBe('true');
  });

  it('row-edit shows "Back to list" and returns without losing browse position', async () => {
    api.listBookmarks.mockResolvedValue({
      data: [bookmark()],
      meta: { current_page: 1, last_page: 1, total: 1, per_page: 50 },
    });
    const wrapper = mount(App);
    await flushPromises();

    await wrapper.findAll('.tabs button')[1].trigger('click'); // List
    await wrapper.findAll('#panel-list .row.folder')[0].trigger('click'); // into "Refs"
    await flushPromises();
    expect(wrapper.find('#panel-list .crumbs').text()).toContain('Refs');

    await wrapper.find('.bookmark-row .edit').trigger('click');
    await flushPromises();

    const back = wrapper.find('.backlink');
    expect(back.exists()).toBe(true);
    await back.trigger('click');

    expect(wrapper.find('#panel-list').isVisible()).toBe(true);
    expect(wrapper.find('#panel-form').isVisible()).toBe(false);
    // BookmarkBrowser stayed mounted → still inside "Refs", not reset to root
    expect(wrapper.find('#panel-list .crumbs').text()).toContain('Refs');
    expect(wrapper.find('.backlink').exists()).toBe(false);
  });

  it('deleting from a List row keeps the popup open and returns to the folder', async () => {
    api.listBookmarks.mockResolvedValue({
      data: [
        bookmark({ id: 77 }),
        bookmark({ id: 88, url: 'https://saved.test/2', title: 'Second' }),
      ],
      meta: { current_page: 1, last_page: 1, total: 2, per_page: 50 },
    });
    api.deleteBookmark.mockResolvedValue(undefined);
    const wrapper = mount(App);
    await flushPromises();

    await wrapper.findAll('.tabs button')[1].trigger('click');
    await wrapper.findAll('#panel-list .row.folder')[0].trigger('click');
    await flushPromises();
    expect(wrapper.findAll('.bookmark-row')).toHaveLength(2);

    await wrapper.findAll('.bookmark-row .edit')[0].trigger('click');
    await flushPromises();
    const del = wrapper.find('.bookmark-form .danger');
    await del.trigger('click'); // arm
    await del.trigger('click'); // confirm
    await flushPromises();

    expect(api.deleteBookmark).toHaveBeenCalledWith(77);
    expect(window.close).not.toHaveBeenCalled();
    expect(wrapper.find('#panel-list').isVisible()).toBe(true);
    expect(wrapper.find('#panel-form').isVisible()).toBe(false);
    expect(wrapper.findAll('.bookmark-row')).toHaveLength(1);
    expect(wrapper.find('#panel-list .flash').text()).toBe('Bookmark deleted.');
  });

  it('saving an edit from a List row updates the row in place and returns to the folder', async () => {
    api.listBookmarks.mockResolvedValue({
      data: [bookmark({ id: 77, title: 'Old title' })],
      meta: { current_page: 1, last_page: 1, total: 1, per_page: 50 },
    });
    api.updateBookmark.mockResolvedValue(bookmark({ id: 77, title: 'New title', folder_id: 2 }));
    const wrapper = mount(App);
    await flushPromises();

    await wrapper.findAll('.tabs button')[1].trigger('click');
    await wrapper.findAll('#panel-list .row.folder')[0].trigger('click');
    await flushPromises();

    await wrapper.find('.bookmark-row .edit').trigger('click');
    await flushPromises();
    await wrapper.find('.bookmark-form').trigger('submit');
    await flushPromises();

    expect(api.updateBookmark).toHaveBeenCalled();
    expect(window.close).not.toHaveBeenCalled();
    expect(wrapper.find('#panel-list').isVisible()).toBe(true);
    expect(wrapper.find('#panel-list .bookmark-row .title').text()).toBe('New title');
    expect(wrapper.find('#panel-list .flash').text()).toBe('Bookmark updated.');
  });

  it('announces a save through the polite live region and shows a visible Saved state', async () => {
    const wrapper = mount(App);
    await flushPromises();

    await wrapper.find('.bookmark-form').trigger('submit');
    await flushPromises();

    expect(api.createBookmark).toHaveBeenCalled();
    expect(wrapper.find('[role="status"]').text()).toBe('Bookmark saved.');
    const primary = wrapper.find('.bookmark-form .primary');
    expect(primary.text()).toBe('Saved ✓');
    expect(primary.classes()).toContain('saved');
  });

  it('renders a 422 as inline field errors, not a generic notice', async () => {
    const { ValidationError } = await import('../../lib/errors');
    api.createBookmark.mockRejectedValueOnce(
      new ValidationError('Invalid', { title: ['The title field is required.'] }),
    );
    const wrapper = mount(App);
    await flushPromises();

    await wrapper.find('.bookmark-form').trigger('submit');
    await flushPromises();

    expect(wrapper.find('.bookmark-form .field-error').text()).toBe('The title field is required.');
    expect(wrapper.find('.bookmark-form .form-error').exists()).toBe(true);
    // the generic ErrorNotice is suppressed for validation errors
    expect(wrapper.find('.notice').exists()).toBe(false);
    // still on the Save button, not "Saved"
    expect(wrapper.find('.bookmark-form .primary').text()).toBe('Save');
  });

  it('status dot carries an accessible label', async () => {
    const wrapper = mount(App);
    await flushPromises();
    const dot = wrapper.find('.status');
    expect(dot.attributes('role')).toBe('img');
    expect(dot.attributes('aria-label')).toBe('Server connected');
  });
});

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
});

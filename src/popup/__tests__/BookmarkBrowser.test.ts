import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { browserMock } from '../../test/mockBrowser';
import type { Bookmark, Folder, Paginated } from '../../lib/apiClient';
import BookmarkBrowser from '../components/BookmarkBrowser.vue';

const listBookmarks = vi.fn();
vi.mock('../../lib/apiClient', () => ({
  apiClient: {
    listBookmarks: (...args: unknown[]) => listBookmarks(...args),
  },
}));

const folders: Folder[] = [
  { id: 1, parent_id: null, name: 'Reading', position: 1 },
  { id: 2, parent_id: 1, name: 'Tech', position: 1 },
  { id: 3, parent_id: null, name: 'Archive', position: 2 },
];

function bookmark(id: number, over: Partial<Bookmark> = {}): Bookmark {
  return {
    id,
    url: `https://ex.test/${id}`,
    normalized_url: `https://ex.test/${id}`,
    title: `Item ${id}`,
    description: null,
    favicon_url: null,
    folder_id: 1,
    tags: [],
    metadata_status: 'done',
    ...over,
  };
}

function page(
  data: Bookmark[],
  over: Partial<Paginated<Bookmark>['meta']> = {},
): Paginated<Bookmark> {
  return {
    data,
    meta: { current_page: 1, last_page: 1, total: data.length, per_page: 50, ...over },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  browserMock.__reset();
  // jsdom's real window.close() tears down the document, breaking later tests.
  vi.spyOn(window, 'close').mockImplementation(() => {});
});

describe('BookmarkBrowser — List tab', () => {
  it('does not fetch until the tab is shown (active)', async () => {
    const wrapper = mount(BookmarkBrowser, { props: { folders } });
    await flushPromises();

    expect(listBookmarks).not.toHaveBeenCalled();
    expect(wrapper.findAll('.row.folder .title').map((n) => n.text())).toEqual([
      'Reading',
      'Archive',
    ]);
    expect(wrapper.find('.lead').exists()).toBe(true);
  });

  it('when active, root shows folders then loose (unfiled) bookmarks', async () => {
    listBookmarks.mockResolvedValueOnce(
      page([bookmark(20, { folder_id: null }), bookmark(21, { folder_id: null })]),
    );
    const wrapper = mount(BookmarkBrowser, { props: { folders, active: true } });
    await flushPromises();

    expect(listBookmarks).toHaveBeenCalledWith({ folderId: 'unfiled', page: 1 });
    expect(wrapper.findAll('.row.folder .title').map((n) => n.text())).toEqual([
      'Reading',
      'Archive',
    ]);
    expect(wrapper.findAll('.bookmark-row')).toHaveLength(2);
  });

  it('the List/Search orientation line disappears once you descend', async () => {
    listBookmarks.mockResolvedValueOnce(page([bookmark(10)]));
    const wrapper = mount(BookmarkBrowser, { props: { folders } });
    await flushPromises();
    await wrapper.findAll('.row.folder')[0].trigger('click');
    await flushPromises();
    expect(wrapper.find('.lead').exists()).toBe(false);
  });

  it('applyDelete drops the row and flashes a confirmation', async () => {
    listBookmarks.mockResolvedValueOnce(page([bookmark(10), bookmark(11)]));
    const wrapper = mount(BookmarkBrowser, { props: { folders } });
    await flushPromises();
    await wrapper.findAll('.row.folder')[0].trigger('click');
    await flushPromises();
    expect(wrapper.findAll('.bookmark-row')).toHaveLength(2);

    (wrapper.vm as unknown as { applyDelete: (id: number) => void }).applyDelete(10);
    await wrapper.vm.$nextTick();

    expect(wrapper.findAll('.bookmark-row')).toHaveLength(1);
    expect(wrapper.find('.flash').text()).toBe('Bookmark deleted.');
  });

  it('applyUpdate replaces a row in the same folder, drops one moved out', async () => {
    listBookmarks.mockResolvedValueOnce(page([bookmark(10), bookmark(11)]));
    const wrapper = mount(BookmarkBrowser, { props: { folders } });
    await flushPromises();
    await wrapper.findAll('.row.folder')[0].trigger('click'); // "Reading" (id 1)
    await flushPromises();

    const vm = wrapper.vm as unknown as { applyUpdate: (b: Bookmark) => void };

    vm.applyUpdate({ ...bookmark(10), title: 'Renamed', folder_id: 1 });
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.bookmark-row .title').text()).toBe('Renamed');
    expect(wrapper.find('.flash').text()).toBe('Bookmark updated.');

    vm.applyUpdate({ ...bookmark(11), folder_id: 3 });
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll('.bookmark-row')).toHaveLength(1);
    expect(wrapper.find('.flash').text()).toBe('Bookmark moved.');
  });

  it('descending into a folder fetches its bookmarks and shows its subfolders', async () => {
    listBookmarks.mockResolvedValueOnce(page([bookmark(10), bookmark(11)]));
    const wrapper = mount(BookmarkBrowser, { props: { folders } });
    await flushPromises();

    await wrapper.findAll('.row.folder')[0].trigger('click'); // Reading
    await flushPromises();

    expect(listBookmarks).toHaveBeenCalledWith({ folderId: '1', page: 1 });
    // subfolder "Tech" plus the two bookmarks
    expect(wrapper.findAll('.row.folder .title').map((n) => n.text())).toEqual(['Tech']);
    expect(wrapper.findAll('.bookmark-row')).toHaveLength(2);
    // breadcrumb reflects the path
    expect(wrapper.find('.crumbs').text()).toContain('All');
    expect(wrapper.find('.crumbs').text()).toContain('Reading');
  });

  it('breadcrumb navigates back to root and re-lists the loose bookmarks', async () => {
    listBookmarks
      .mockResolvedValueOnce(page([bookmark(10)])) // descend into Reading
      .mockResolvedValueOnce(page([bookmark(20, { folder_id: null })])); // back to root
    const wrapper = mount(BookmarkBrowser, { props: { folders } });
    await flushPromises();
    await wrapper.findAll('.row.folder')[0].trigger('click');
    await flushPromises();

    await wrapper.find('.crumb').trigger('click'); // "All"
    await flushPromises();

    expect(listBookmarks).toHaveBeenLastCalledWith({ folderId: 'unfiled', page: 1 });
    expect(wrapper.findAll('.row.folder .title').map((n) => n.text())).toEqual([
      'Reading',
      'Archive',
    ]);
    expect(wrapper.findAll('.bookmark-row')).toHaveLength(1);
  });

  it('paginates: Load more appends the next page', async () => {
    listBookmarks
      .mockResolvedValueOnce(page([bookmark(1)], { current_page: 1, last_page: 2 }))
      .mockResolvedValueOnce(page([bookmark(2)], { current_page: 2, last_page: 2 }));
    const wrapper = mount(BookmarkBrowser, { props: { folders } });
    await flushPromises();
    await wrapper.findAll('.row.folder')[0].trigger('click');
    await flushPromises();

    expect(wrapper.find('.more').exists()).toBe(true);
    await wrapper.find('.more').trigger('click');
    await flushPromises();

    expect(listBookmarks).toHaveBeenLastCalledWith({ folderId: '1', page: 2 });
    expect(wrapper.findAll('.bookmark-row')).toHaveLength(2);
    expect(wrapper.find('.more').exists()).toBe(false);
  });

  it('row Edit emits the bookmark', async () => {
    const b = bookmark(10);
    listBookmarks.mockResolvedValueOnce(page([b]));
    const wrapper = mount(BookmarkBrowser, { props: { folders } });
    await flushPromises();
    await wrapper.findAll('.row.folder')[0].trigger('click');
    await flushPromises();

    await wrapper.find('.bookmark-row .edit').trigger('click');
    expect(wrapper.emitted('edit')?.[0]?.[0]).toEqual(b);
  });

  it('opening a bookmark creates a tab', async () => {
    listBookmarks.mockResolvedValueOnce(page([bookmark(10)]));
    const wrapper = mount(BookmarkBrowser, { props: { folders } });
    await flushPromises();
    await wrapper.findAll('.row.folder')[0].trigger('click');
    await flushPromises();

    await wrapper.find('.bookmark-row .open').trigger('click');
    expect(browserMock.tabs.create).toHaveBeenCalledWith({ url: 'https://ex.test/10' });
  });

  it('empty folder shows the empty hint', async () => {
    listBookmarks.mockResolvedValueOnce(page([]));
    const wrapper = mount(BookmarkBrowser, { props: { folders } });
    await flushPromises();
    await wrapper.findAll('.row.folder')[1].trigger('click'); // Archive (no subfolders)
    await flushPromises();

    expect(wrapper.text()).toContain('Nothing in this folder yet.');
  });

  it('fetch error renders a retryable notice', async () => {
    const { NetworkError } = await import('../../lib/errors');
    listBookmarks.mockRejectedValueOnce(new NetworkError('down'));
    const wrapper = mount(BookmarkBrowser, { props: { folders } });
    await flushPromises();
    await wrapper.findAll('.row.folder')[0].trigger('click');
    await flushPromises();

    expect(wrapper.find('.notice').text()).toContain("Can't reach the server.");

    listBookmarks.mockResolvedValueOnce(page([bookmark(10)]));
    await wrapper.find('.notice .retry').trigger('click');
    await flushPromises();
    expect(wrapper.findAll('.bookmark-row')).toHaveLength(1);
  });
});

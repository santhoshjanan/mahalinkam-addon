import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const api = vi.hoisted(() => ({ createFolder: vi.fn() }));
vi.mock('../../lib/apiClient', () => ({ apiClient: api }));

import BookmarkForm from '../components/BookmarkForm.vue';
import { ValidationError } from '../../lib/errors';

interface FormProps {
  mode: 'save' | 'edit';
  url: string;
  title: string;
  description: string;
  folderId: number | null;
  tags: string[];
  folderOptions: { value: number | null; label: string }[];
  tagSuggestions: string[];
  saved?: boolean;
  fieldErrors?: Record<string, string[]>;
}

function mountForm(over: Partial<FormProps> = {}) {
  return mount(BookmarkForm, {
    props: {
      mode: 'edit',
      url: 'https://ex.test/1',
      title: 'T',
      description: '',
      folderId: null,
      tags: [],
      folderOptions: [
        { value: 2, label: 'Reading' },
        { value: 3, label: '  Tech' },
      ],
      tagSuggestions: [],
      ...over,
    },
  });
}

beforeEach(() => vi.clearAllMocks());

describe('BookmarkForm — inline two-stage delete', () => {
  it('first click arms, second click deletes (no native confirm)', async () => {
    const wrapper = mountForm();
    const del = () => wrapper.find('.danger');

    expect(del().text()).toBe('Delete');
    await del().trigger('click');
    expect(del().text()).toBe('Confirm?');
    expect(del().classes()).toContain('armed');
    expect(wrapper.emitted('delete')).toBeUndefined();

    await del().trigger('click');
    expect(wrapper.emitted('delete')).toHaveLength(1);
  });

  it('blur disarms without deleting', async () => {
    const wrapper = mountForm();
    await wrapper.find('.danger').trigger('click');
    expect(wrapper.find('.danger').text()).toBe('Confirm?');
    await wrapper.find('.danger').trigger('blur');
    expect(wrapper.find('.danger').text()).toBe('Delete');
    expect(wrapper.emitted('delete')).toBeUndefined();
  });

  it('auto-disarms after the timeout', async () => {
    vi.useFakeTimers();
    const wrapper = mountForm();
    await wrapper.find('.danger').trigger('click');
    expect(wrapper.find('.danger').text()).toBe('Confirm?');
    vi.advanceTimersByTime(3600);
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.danger').text()).toBe('Delete');
    vi.useRealTimers();
  });
});

describe('BookmarkForm — field errors + saved state', () => {
  it('shows a summary line and per-field messages', () => {
    const wrapper = mountForm({
      mode: 'save',
      title: '',
      fieldErrors: { title: ['Required.'], tags: ['Too many tags.'] },
    });
    expect(wrapper.find('.form-error').text()).toContain('highlighted fields');
    const msgs = wrapper.findAll('.field-error').map((n) => n.text());
    expect(msgs).toContain('Required.');
    expect(msgs).toContain('Too many tags.');
    expect(wrapper.find('.field--bad').exists()).toBe(true);
  });

  it('the saved prop switches the primary button to a disabled "Saved" state', () => {
    const wrapper = mountForm({ mode: 'save', saved: true });
    const primary = wrapper.find('.primary');
    expect(primary.text()).toBe('Saved ✓');
    expect(primary.classes()).toContain('saved');
    expect(primary.attributes('disabled')).toBeDefined();
  });
});

describe('BookmarkForm — inline "new folder"', () => {
  const newFolder = { id: 9, parent_id: null, name: 'Recipes', position: 3 };

  function pickNewFolder(wrapper: ReturnType<typeof mountForm>) {
    return wrapper.find('select').setValue('__new__');
  }

  it('choosing "＋ New folder…" reveals the inline editor with parent context', async () => {
    const wrapper = mountForm({ folderId: 2 }); // "Reading" selected → parent
    await pickNewFolder(wrapper);

    expect(wrapper.find('.folder-new').exists()).toBe(true);
    expect(wrapper.find('.folder-new-context').text()).toContain('under "Reading"');
    // did not change the bound folderId yet
    expect(wrapper.emitted('update:folderId')).toBeUndefined();
  });

  it('confirm calls createFolder with the current pick as parent and emits folder-created', async () => {
    api.createFolder.mockResolvedValue(newFolder);
    const wrapper = mountForm({ folderId: 2 });
    await pickNewFolder(wrapper);

    await wrapper.find('.folder-new-input').setValue('Recipes');
    await wrapper.find('.fn-ok').trigger('click');
    await flushPromises();

    expect(api.createFolder).toHaveBeenCalledWith({ name: 'Recipes', parent_id: 2 });
    expect(wrapper.emitted('folder-created')?.[0]?.[0]).toEqual(newFolder);
    // editor closed, select is back
    expect(wrapper.find('.folder-new').exists()).toBe(false);
    expect(wrapper.find('select').exists()).toBe(true);
  });

  it('a top-level new folder sends parent_id null', async () => {
    api.createFolder.mockResolvedValue({ ...newFolder, id: 10 });
    const wrapper = mountForm({ folderId: null });
    await pickNewFolder(wrapper);
    expect(wrapper.find('.folder-new-context').text()).toContain('top level');

    await wrapper.find('.folder-new-input').setValue('Loose');
    await wrapper.find('.fn-ok').trigger('click');
    await flushPromises();

    expect(api.createFolder).toHaveBeenCalledWith({ name: 'Loose', parent_id: null });
  });

  it('cancel (✕) restores the select without creating', async () => {
    const wrapper = mountForm({ folderId: 2 });
    await pickNewFolder(wrapper);
    await wrapper.find('.fn-cancel').trigger('click');

    expect(wrapper.find('.folder-new').exists()).toBe(false);
    expect(api.createFolder).not.toHaveBeenCalled();
  });

  it('a 422 (depth limit) shows inline and keeps the editor open', async () => {
    api.createFolder.mockRejectedValue(
      new ValidationError('Invalid', { parent_id: ['Folder nesting limit reached.'] }),
    );
    const wrapper = mountForm({ folderId: 2 });
    await pickNewFolder(wrapper);
    await wrapper.find('.folder-new-input').setValue('Deep');
    await wrapper.find('.fn-ok').trigger('click');
    await flushPromises();

    expect(wrapper.find('.field-error').text()).toBe('Folder nesting limit reached.');
    expect(wrapper.find('.folder-new').exists()).toBe(true); // still open
    expect(wrapper.emitted('folder-created')).toBeUndefined();
  });

  it('the ✓ button is disabled until a name is typed', async () => {
    const wrapper = mountForm();
    await pickNewFolder(wrapper);
    expect(wrapper.find('.fn-ok').attributes('disabled')).toBeDefined();
    await wrapper.find('.folder-new-input').setValue('x');
    expect(wrapper.find('.fn-ok').attributes('disabled')).toBeUndefined();
  });
});

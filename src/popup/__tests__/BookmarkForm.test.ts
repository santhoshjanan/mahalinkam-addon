import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import BookmarkForm from '../components/BookmarkForm.vue';

function mountForm() {
  return mount(BookmarkForm, {
    props: {
      mode: 'edit' as const,
      url: 'https://ex.test/1',
      title: 'T',
      description: '',
      folderId: null,
      tags: [],
      folderOptions: [],
      tagSuggestions: [],
    },
  });
}

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
    const wrapper = mount(BookmarkForm, {
      props: {
        mode: 'save' as const,
        url: 'https://ex.test/1',
        title: '',
        description: '',
        folderId: null,
        tags: [],
        folderOptions: [],
        tagSuggestions: [],
        fieldErrors: { title: ['Required.'], tags: ['Too many tags.'] },
      },
    });
    expect(wrapper.find('.form-error').text()).toContain('highlighted fields');
    const msgs = wrapper.findAll('.field-error').map((n) => n.text());
    expect(msgs).toContain('Required.');
    expect(msgs).toContain('Too many tags.');
    expect(wrapper.find('.field--bad').exists()).toBe(true);
  });

  it('the saved prop switches the primary button to a disabled "Saved" state', () => {
    const wrapper = mount(BookmarkForm, {
      props: {
        mode: 'save' as const,
        url: 'https://ex.test/1',
        title: 'T',
        description: '',
        folderId: null,
        tags: [],
        folderOptions: [],
        tagSuggestions: [],
        saved: true,
      },
    });
    const primary = wrapper.find('.primary');
    expect(primary.text()).toBe('Saved ✓');
    expect(primary.classes()).toContain('saved');
    expect(primary.attributes('disabled')).toBeDefined();
  });
});

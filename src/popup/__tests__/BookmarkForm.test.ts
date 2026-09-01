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

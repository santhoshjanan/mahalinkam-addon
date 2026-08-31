<script setup lang="ts">
import { computed } from 'vue';
import TagInput from './TagInput.vue';

interface FolderOption {
  value: number | null;
  label: string;
}

const props = defineProps<{
  mode: 'save' | 'edit';
  url: string;
  favicon?: string | null;
  title: string;
  description: string;
  folderId: number | null;
  tags: string[];
  folderOptions: FolderOption[];
  tagSuggestions: string[];
  busy?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:title', v: string): void;
  (e: 'update:description', v: string): void;
  (e: 'update:folderId', v: number | null): void;
  (e: 'update:tags', v: string[]): void;
  (e: 'submit'): void;
  (e: 'delete'): void;
}>();

const submitLabel = computed(() => (props.mode === 'edit' ? 'Save changes' : 'Save'));

function onFolderChange(e: Event): void {
  const raw = (e.target as HTMLSelectElement).value;
  emit('update:folderId', raw === '' ? null : Number(raw));
}
</script>

<template>
  <form class="bookmark-form" @submit.prevent="emit('submit')">
    <div class="page">
      <img v-if="favicon" :src="favicon" alt="" width="16" height="16" class="fav" />
      <span v-else class="fav fav-blank" aria-hidden="true"></span>
      <span class="url" :title="url">{{ url }}</span>
    </div>

    <label class="field">
      <span>Title</span>
      <input
        :value="title"
        type="text"
        autocomplete="off"
        @input="emit('update:title', ($event.target as HTMLInputElement).value)"
      />
    </label>

    <label class="field">
      <span>Description</span>
      <textarea
        :value="description"
        rows="2"
        @input="emit('update:description', ($event.target as HTMLTextAreaElement).value)"
      ></textarea>
    </label>

    <label class="field">
      <span>Folder</span>
      <select :value="folderId === null ? '' : String(folderId)" @change="onFolderChange">
        <option value="">(Unfiled)</option>
        <option v-for="opt in folderOptions" :key="String(opt.value)" :value="String(opt.value)">
          {{ opt.label }}
        </option>
      </select>
    </label>

    <div class="field">
      <span>Tags</span>
      <TagInput
        :model-value="tags"
        :suggestions="tagSuggestions"
        @update:model-value="emit('update:tags', $event)"
      />
    </div>

    <div class="actions">
      <button type="submit" class="primary" :disabled="busy">
        {{ submitLabel }}
      </button>
      <button
        v-if="mode === 'edit'"
        type="button"
        class="danger"
        :disabled="busy"
        @click="emit('delete')"
      >
        Delete
      </button>
    </div>
  </form>
</template>

<style scoped>
.bookmark-form {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.page {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.76rem;
  color: #6b7280;
}

.fav {
  flex: none;
  width: 16px;
  height: 16px;
  border-radius: 3px;
}

.fav-blank {
  background: #d1d5db;
}

.url {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.field {
  display: block;
}

.field > span {
  display: block;
  font-size: 0.78rem;
  font-weight: 600;
  margin-bottom: 0.2rem;
}

.field input,
.field textarea,
.field select {
  width: 100%;
  box-sizing: border-box;
  padding: 0.4rem 0.5rem;
  font-size: 0.85rem;
  border: 1px solid #bbb;
  border-radius: 4px;
  font-family: inherit;
}

.field textarea {
  resize: vertical;
}

.actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.2rem;
}

.primary {
  flex: 1;
  padding: 0.5rem;
  font-size: 0.88rem;
  font-weight: 600;
  color: #fff;
  background: #2563eb;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.danger {
  padding: 0.5rem 0.75rem;
  font-size: 0.88rem;
  font-weight: 600;
  color: #b91c1c;
  background: transparent;
  border: 1px solid #b91c1c;
  border-radius: 4px;
  cursor: pointer;
}

.primary:disabled,
.danger:disabled {
  opacity: 0.6;
  cursor: default;
}

@media (prefers-color-scheme: dark) {
  .field input,
  .field textarea,
  .field select {
    background: #1e1e1e;
    border-color: #555;
    color: #e8e8e8;
  }

  .fav-blank {
    background: #4b5563;
  }
}
</style>

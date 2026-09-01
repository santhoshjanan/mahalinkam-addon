<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import { apiClient, type Folder } from '../../lib/apiClient';
import { ValidationError } from '../../lib/errors';
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
  /** True for a short beat after a successful save — drives the button state. */
  saved?: boolean;
  /** Per-field 422 messages, keyed by server field name (url, title, …). */
  fieldErrors?: Record<string, string[]>;
}>();

/** First message for a server field, or '' when clean. */
function fieldError(name: string): string {
  return props.fieldErrors?.[name]?.[0] ?? '';
}

const hasFieldErrors = computed(() => Object.keys(props.fieldErrors ?? {}).length > 0);

const emit = defineEmits<{
  (e: 'update:title', v: string): void;
  (e: 'update:description', v: string): void;
  (e: 'update:folderId', v: number | null): void;
  (e: 'update:tags', v: string[]): void;
  (e: 'submit'): void;
  (e: 'delete'): void;
  (e: 'folder-created', folder: Folder): void;
}>();

const submitLabel = computed(() => {
  if (props.saved) return 'Saved ✓';
  return props.mode === 'edit' ? 'Save changes' : 'Save';
});

/* --- folder picker + inline "new folder" --------------------------------- */

const NEW_FOLDER = '__new__';

const creating = ref(false);
const newName = ref('');
const creatingBusy = ref(false);
const createError = ref('');
const newFolderInput = ref<HTMLInputElement | null>(null);

/** Human phrase for where the new folder will sit — the currently picked
 *  folder is its parent. */
const parentLabel = computed(() => {
  if (props.folderId === null) return 'at the top level';
  const opt = props.folderOptions.find((o) => o.value === props.folderId);
  return opt ? `under "${opt.label.trim()}"` : 'at the top level';
});

function onFolderChange(e: Event): void {
  const raw = (e.target as HTMLSelectElement).value;
  if (raw === NEW_FOLDER) {
    void startCreate();
    return;
  }
  emit('update:folderId', raw === '' ? null : Number(raw));
}

async function startCreate(): Promise<void> {
  creating.value = true;
  newName.value = '';
  createError.value = '';
  await nextTick();
  newFolderInput.value?.focus();
}

function cancelCreate(): void {
  creating.value = false;
  newName.value = '';
  createError.value = '';
}

async function confirmCreate(): Promise<void> {
  const name = newName.value.trim();
  if (!name || creatingBusy.value) return;
  creatingBusy.value = true;
  createError.value = '';
  try {
    const folder = await apiClient.createFolder({ name, parent_id: props.folderId });
    emit('folder-created', folder); // parent selects it + refreshes the option list
    creating.value = false;
    newName.value = '';
  } catch (err) {
    if (err instanceof ValidationError) {
      createError.value =
        err.fields.parent_id?.[0] ?? err.fields.name?.[0] ?? 'That folder name was rejected.';
    } else {
      createError.value = err instanceof Error ? err.message : 'Could not create the folder.';
    }
  } finally {
    creatingBusy.value = false;
  }
}

/**
 * Inline two-stage delete instead of a native window.confirm (which drops out of
 * the popup's visual world). First click arms; second click within the window
 * commits; it disarms on blur or after a few seconds.
 */
const armed = ref(false);
let disarmTimer: ReturnType<typeof setTimeout> | undefined;

function onDeleteClick(): void {
  if (armed.value) {
    clearTimeout(disarmTimer);
    armed.value = false;
    emit('delete');
    return;
  }
  armed.value = true;
  disarmTimer = setTimeout(() => (armed.value = false), 3500);
}

function disarm(): void {
  clearTimeout(disarmTimer);
  armed.value = false;
}
</script>

<template>
  <form class="bookmark-form" @submit.prevent="emit('submit')">
    <p v-if="hasFieldErrors" class="form-error" role="alert">Please fix the highlighted fields.</p>

    <div class="page">
      <img v-if="favicon" :src="favicon" alt="" width="16" height="16" class="fav" />
      <span v-else class="fav fav-blank" aria-hidden="true"></span>
      <span class="url" :title="url">{{ url }}</span>
    </div>
    <p v-if="fieldError('url')" class="field-error">{{ fieldError('url') }}</p>

    <label class="field" :class="{ 'field--bad': fieldError('title') }">
      <span>Title</span>
      <input
        :value="title"
        type="text"
        autocomplete="off"
        :aria-invalid="!!fieldError('title')"
        @input="emit('update:title', ($event.target as HTMLInputElement).value)"
      />
      <span v-if="fieldError('title')" class="field-error">{{ fieldError('title') }}</span>
    </label>

    <label class="field" :class="{ 'field--bad': fieldError('description') }">
      <span>Description</span>
      <textarea
        :value="description"
        rows="2"
        :aria-invalid="!!fieldError('description')"
        @input="emit('update:description', ($event.target as HTMLTextAreaElement).value)"
      ></textarea>
      <span v-if="fieldError('description')" class="field-error">
        {{ fieldError('description') }}
      </span>
    </label>

    <div class="field" :class="{ 'field--bad': fieldError('folder_id') || createError }">
      <span>Folder</span>

      <select
        v-if="!creating"
        :value="folderId === null ? '' : String(folderId)"
        @change="onFolderChange"
      >
        <option value="">(Unfiled)</option>
        <option v-for="opt in folderOptions" :key="String(opt.value)" :value="String(opt.value)">
          {{ opt.label }}
        </option>
        <option :value="NEW_FOLDER">＋ New folder…</option>
      </select>

      <template v-else>
        <div class="folder-new">
          <input
            ref="newFolderInput"
            v-model="newName"
            type="text"
            class="folder-new-input"
            placeholder="Folder name"
            autocomplete="off"
            :disabled="creatingBusy"
            @keydown.enter.prevent="confirmCreate"
            @keydown.esc.prevent="cancelCreate"
          />
          <button
            type="button"
            class="fn-btn fn-ok"
            :disabled="!newName.trim() || creatingBusy"
            aria-label="Create folder"
            @click="confirmCreate"
          >
            ✓
          </button>
          <button
            type="button"
            class="fn-btn fn-cancel"
            :disabled="creatingBusy"
            aria-label="Cancel new folder"
            @click="cancelCreate"
          >
            ✕
          </button>
        </div>
        <span class="folder-new-context">New folder {{ parentLabel }}</span>
      </template>

      <span v-if="createError" class="field-error">{{ createError }}</span>
      <span v-else-if="fieldError('folder_id')" class="field-error">
        {{ fieldError('folder_id') }}
      </span>
    </div>

    <div class="field" :class="{ 'field--bad': fieldError('tags') }">
      <span>Tags</span>
      <TagInput
        :model-value="tags"
        :suggestions="tagSuggestions"
        @update:model-value="emit('update:tags', $event)"
      />
      <span v-if="fieldError('tags')" class="field-error">{{ fieldError('tags') }}</span>
    </div>

    <div class="actions">
      <button type="submit" class="primary" :class="{ saved }" :disabled="busy || saved">
        {{ submitLabel }}
      </button>
      <button
        v-if="mode === 'edit'"
        type="button"
        class="danger"
        :class="{ armed }"
        :disabled="busy"
        :aria-label="armed ? 'Confirm delete bookmark' : 'Delete bookmark'"
        @click="onDeleteClick"
        @blur="disarm"
      >
        {{ armed ? 'Confirm?' : 'Delete' }}
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

.field--bad input,
.field--bad textarea,
.field--bad select,
.field--bad .folder-new {
  border-color: #b91c1c;
}

/* inline "new folder" editor: one bordered row, input + ✓/✕ */
.folder-new {
  display: flex;
  align-items: stretch;
  border: 1px solid #bbb;
  border-radius: 4px;
  overflow: hidden;
}

.field .folder-new-input {
  flex: 1;
  min-width: 0;
  width: auto;
  padding: 0.4rem 0.5rem;
  border: none;
  border-radius: 0;
  background: transparent;
  color: inherit;
}

.field .folder-new-input:focus {
  outline: none;
}

.fn-btn {
  flex: none;
  width: 2rem;
  padding: 0;
  font-size: 0.9rem;
  line-height: 1;
  background: transparent;
  border: none;
  border-left: 1px solid #e5e7eb;
  cursor: pointer;
}

.fn-ok {
  color: #16a34a;
}

.fn-cancel {
  color: #b91c1c;
}

.fn-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.folder-new-context {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.72rem;
  color: #6b7280;
}

.form-error {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 600;
  color: #b91c1c;
}

.field-error {
  display: block;
  margin-top: 0.2rem;
  font-size: 0.75rem;
  color: #b91c1c;
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
  background: #1d4ed8;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: transform 90ms ease;
}

.primary:active:not(:disabled) {
  transform: translateY(1px) scale(0.99);
}

.primary.saved,
.primary.saved:disabled {
  background: #16a34a;
  opacity: 1;
  cursor: default;
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
  transition:
    background 120ms ease,
    color 120ms ease;
}

.danger.armed {
  color: #fff;
  background: #b91c1c;
}

.primary:disabled,
.danger:disabled {
  opacity: 0.6;
  cursor: default;
}

@media (prefers-color-scheme: dark) {
  .field input,
  .field textarea,
  .field select,
  .folder-new {
    background: #1e1e1e;
    border-color: #555;
    color: #e8e8e8;
  }

  .field--bad input,
  .field--bad textarea,
  .field--bad select,
  .field--bad .folder-new {
    border-color: #fca5a5;
  }

  .fn-btn {
    border-left-color: #2a2a2a;
  }

  .fn-ok {
    color: #4ade80;
  }

  .fn-cancel {
    color: #fca5a5;
  }

  .form-error,
  .field-error {
    color: #fca5a5;
  }

  .fav-blank {
    background: #4b5563;
  }
}
</style>

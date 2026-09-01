<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import browser from 'webextension-polyfill';
import { getSettings } from '../lib/storage';
import { apiClient } from '../lib/apiClient';
import { buildTree, flattenForSelect } from '../lib/folderTree';
import { useActiveTab } from './useActiveTab';
import BookmarkForm from './components/BookmarkForm.vue';
import QuickSearch from './components/QuickSearch.vue';
import ErrorNotice from './components/ErrorNotice.vue';

type Phase = 'loading' | 'setup' | 'ready';
type View = 'form' | 'search';
type Mode = 'save' | 'edit';

interface FolderOption {
  value: number | null;
  label: string;
}

const phase = ref<Phase>('loading');
const view = ref<View>('form');
const mode = ref<Mode>('save');

const error = ref<unknown>(null);
const busy = ref(false);
let lastAction: (() => Promise<void>) | null = null;

const tabUrl = ref('');
const favicon = ref<string | null | undefined>(undefined);
const savable = computed(() => /^https?:/i.test(tabUrl.value));

const existingId = ref<number | null>(null);
const form = ref({
  title: '',
  description: '',
  folderId: null as number | null,
  tags: [] as string[],
});

const folderOptions = ref<FolderOption[]>([]);
const tagSuggestions = ref<string[]>([]);

/** Run an async action, tracking it so <ErrorNotice>'s Retry can re-run it. */
async function run(action: () => Promise<void>): Promise<void> {
  lastAction = action;
  error.value = null;
  busy.value = true;
  try {
    await action();
  } catch (err) {
    error.value = err;
  } finally {
    busy.value = false;
  }
}

function retry(): void {
  if (lastAction) void run(lastAction);
}

function openSettings(): void {
  void browser.runtime.openOptionsPage();
}

async function bootstrap(): Promise<void> {
  const tab = await useActiveTab();
  tabUrl.value = tab.url;

  const [folders, tags] = await Promise.all([apiClient.listFolders(), apiClient.listTags()]);
  folderOptions.value = flattenForSelect(buildTree(folders)).map((o) => {
    const depth = (o.label.length - o.label.trimStart().length) / 2;
    const pad = '\u00a0\u00a0'.repeat(depth);
    return { value: o.id, label: `${pad}${o.label.trimStart()}` };
  });
  tagSuggestions.value = tags.map((t) => t.name);

  if (!savable.value) {
    favicon.value = tab.favIconUrl;
    return;
  }

  const res = await apiClient.lookup(tab.url);
  if (res.found && res.bookmark) {
    const b = res.bookmark;
    mode.value = 'edit';
    existingId.value = b.id;
    favicon.value = b.favicon_url ?? tab.favIconUrl;
    form.value = {
      title: b.title ?? '',
      description: b.description ?? '',
      folderId: b.folder_id,
      tags: b.tags.map((t) => t.name),
    };
  } else {
    mode.value = 'save';
    existingId.value = null;
    favicon.value = tab.favIconUrl;
    form.value = { title: tab.title, description: '', folderId: null, tags: [] };
  }
}

/**
 * Tell the background worker a bookmark for `url` was created/updated (`saved`)
 * or deleted, so it can bust its lookup cache and refresh the toolbar icon
 * instead of waiting out the 60s TTL. Best-effort — never blocks the popup.
 */
function notifyBookmarkChanged(url: string, saved: boolean): void {
  if (!url) return;
  try {
    void browser.runtime.sendMessage({ type: 'bookmark-changed', url, saved }).catch(() => {});
  } catch {
    /* no receiver / messaging unavailable — the TTL will catch up */
  }
}

function submit(): void {
  void run(async () => {
    if (mode.value === 'edit' && existingId.value !== null) {
      await apiClient.updateBookmark(existingId.value, {
        title: form.value.title,
        description: form.value.description,
        folder_id: form.value.folderId,
        tags: form.value.tags,
      });
    } else {
      // Pass tab.url RAW — the server normalizes.
      await apiClient.createBookmark({
        url: tabUrl.value,
        title: form.value.title,
        description: form.value.description,
        folder_id: form.value.folderId,
        tags: form.value.tags,
      });
    }
    notifyBookmarkChanged(tabUrl.value, true);
    window.close();
  });
}

function remove(): void {
  if (existingId.value === null) return;
  if (!window.confirm('Delete this bookmark?')) return;
  const id = existingId.value;
  void run(async () => {
    await apiClient.deleteBookmark(id);
    notifyBookmarkChanged(tabUrl.value, false);
    window.close();
  });
}

onMounted(async () => {
  let settings;
  try {
    settings = await getSettings();
  } catch {
    // storage read failed — fall back to the setup screen rather than
    // stranding the popup on "Loading…".
    phase.value = 'setup';
    return;
  }
  if (!settings) {
    phase.value = 'setup';
    return;
  }
  await run(bootstrap);
  phase.value = 'ready';
});
</script>

<template>
  <main class="popup">
    <template v-if="phase === 'loading'">
      <p class="muted">Loading…</p>
    </template>

    <template v-else-if="phase === 'setup'">
      <h1>Set up mahalinkam</h1>
      <p class="muted">Add your server URL and API token to start saving bookmarks.</p>
      <button type="button" class="primary" @click="openSettings">Open settings</button>
    </template>

    <template v-else>
      <nav class="tabs">
        <button type="button" :class="{ on: view === 'form' }" @click="view = 'form'">
          {{ mode === 'edit' ? 'Edit' : 'Save' }}
        </button>
        <button type="button" :class="{ on: view === 'search' }" @click="view = 'search'">
          Search
        </button>
      </nav>

      <section v-if="view === 'form'">
        <p v-if="!savable" class="muted">This page can't be saved.</p>
        <BookmarkForm
          v-else
          v-model:title="form.title"
          v-model:description="form.description"
          v-model:folder-id="form.folderId"
          v-model:tags="form.tags"
          :mode="mode"
          :url="tabUrl"
          :favicon="favicon"
          :folder-options="folderOptions"
          :tag-suggestions="tagSuggestions"
          :busy="busy"
          @submit="submit"
          @delete="remove"
        />
        <ErrorNotice :error="error" @retry="retry" />
      </section>

      <section v-else>
        <QuickSearch />
      </section>
    </template>
  </main>
</template>

<style scoped>
.popup {
  width: 340px;
  padding: 0.85rem;
  font-family: system-ui, sans-serif;
  color: #1a1a1a;
}

h1 {
  font-size: 1.05rem;
  margin: 0 0 0.5rem;
}

.muted {
  font-size: 0.85rem;
  color: #6b7280;
  margin: 0 0 0.75rem;
}

.tabs {
  display: flex;
  gap: 0.25rem;
  margin-bottom: 0.75rem;
  border-bottom: 1px solid #e5e7eb;
}

.tabs button {
  padding: 0.4rem 0.7rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #6b7280;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
}

.tabs button.on {
  color: #2563eb;
  border-bottom-color: #2563eb;
}

.primary {
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: #fff;
  background: #2563eb;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

@media (prefers-color-scheme: dark) {
  .popup {
    color: #e8e8e8;
    background: #171717;
  }

  .tabs {
    border-bottom-color: #333;
  }

  .tabs button.on {
    color: #60a5fa;
    border-bottom-color: #60a5fa;
  }
}
</style>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import browser from 'webextension-polyfill';
import { getSettings } from '../lib/storage';
import { apiClient, type Bookmark, type Folder } from '../lib/apiClient';
import { ValidationError } from '../lib/errors';
import { buildTree, flattenForSelect } from '../lib/folderTree';
import { useActiveTab } from './useActiveTab';
import BookmarkForm from './components/BookmarkForm.vue';
import BookmarkBrowser from './components/BookmarkBrowser.vue';
import QuickSearch from './components/QuickSearch.vue';
import ErrorNotice from './components/ErrorNotice.vue';

type Phase = 'loading' | 'setup' | 'ready';
type View = 'form' | 'list' | 'search';
type Mode = 'save' | 'edit';

const VIEWS: View[] = ['form', 'list', 'search'];

interface FolderOption {
  value: number | null;
  label: string;
}

const phase = ref<Phase>('loading');
const view = ref<View>('form');
const mode = ref<Mode>('save');
/** Whether the form was opened from its tab or from a List-row "Edit". */
const formOrigin = ref<'tab' | 'list'>('tab');

/** Polite live-region text: announces save / update / delete to screen readers. */
const liveMessage = ref('');

/** Brief visible "Saved" state on the primary button before the popup closes. */
const justSaved = ref(false);

/** Tab-button elements, for roving focus on arrow-key navigation. */
const tabEls: HTMLButtonElement[] = [];
function setTabEl(el: unknown, i: number): void {
  if (el instanceof HTMLButtonElement) tabEls[i] = el;
}

/** Activate a view from the tab bar. Selecting the form tab clears the
 *  "came from List" origin so the back-link only shows on a real List hand-off. */
function selectView(v: View): void {
  if (v === 'form') formOrigin.value = 'tab';
  view.value = v;
}

/** ARIA tabs pattern: arrows move selection + focus, Home/End jump to ends. */
function onTabKeydown(e: KeyboardEvent): void {
  const i = VIEWS.indexOf(view.value);
  let next: number;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % VIEWS.length;
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
    next = (i - 1 + VIEWS.length) % VIEWS.length;
  else if (e.key === 'Home') next = 0;
  else if (e.key === 'End') next = VIEWS.length - 1;
  else return;
  e.preventDefault();
  selectView(VIEWS[next]);
  tabEls[next]?.focus();
}

/**
 * Brief "stamp" flourish on the identity mark when a save lands — a single
 * confirmation beat before the popup dismisses. Purely cosmetic.
 */
const stamping = ref(false);
const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

const error = ref<unknown>(null);
const busy = ref(false);
let lastAction: (() => Promise<void>) | null = null;

/** Per-field messages from a 422, keyed by server field name (url, title, …). */
const fieldErrors = computed<Record<string, string[]>>(() =>
  error.value instanceof ValidationError ? error.value.fields : {},
);

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
/** Raw folder list, fetched once, shared with the List tab's folder browser. */
const rawFolders = ref<Folder[]>([]);
/** The List browser, for reconciling a row after an edit/delete from the form. */
const browserRef = ref<InstanceType<typeof BookmarkBrowser> | null>(null);

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
  rawFolders.value = folders;
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

/**
 * Row-level "Edit" from the List tab: load an arbitrary bookmark into the
 * existing Save/Edit form (edit mode) and switch to it. `submit`/`remove` then
 * operate on `existingId` exactly as they do for the active tab.
 */
function editFromList(b: Bookmark): void {
  mode.value = 'edit';
  existingId.value = b.id;
  tabUrl.value = b.url;
  favicon.value = b.favicon_url ?? undefined;
  form.value = {
    title: b.title ?? '',
    description: b.description ?? '',
    folderId: b.folder_id,
    tags: b.tags.map((t) => t.name),
  };
  error.value = null;
  formOrigin.value = 'list';
  view.value = 'form';
}

/** Return to the List tab from a row-edit, keeping its browse position. */
function backToList(): void {
  formOrigin.value = 'tab';
  view.value = 'list';
}

/**
 * After a save/delete: when the form was opened from a List row, reconcile that
 * row in place and return to the folder (popup stays open, so several can be
 * worked in a row). Otherwise it acted on the current page's bookmark — stamp
 * (on save) and dismiss.
 */
function finishOrReturn(reconcile: (b: typeof browserRef.value) => void, stamp: boolean): void {
  if (formOrigin.value === 'list') {
    reconcile(browserRef.value);
    backToList();
    return;
  }
  if (stamp) {
    justSaved.value = true;
    if (!reducedMotion) stamping.value = true;
  }
  window.setTimeout(() => window.close(), 400);
}

function submit(): void {
  void run(async () => {
    let updated: Bookmark | undefined;
    if (mode.value === 'edit' && existingId.value !== null) {
      updated = await apiClient.updateBookmark(existingId.value, {
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
    liveMessage.value = mode.value === 'edit' ? 'Bookmark updated.' : 'Bookmark saved.';
    finishOrReturn((b) => {
      if (updated) b?.applyUpdate(updated);
    }, true);
  });
}

function remove(): void {
  if (existingId.value === null) return;
  // Confirmation is handled inline by the form's two-stage Delete button.
  const id = existingId.value;
  void run(async () => {
    await apiClient.deleteBookmark(id);
    notifyBookmarkChanged(tabUrl.value, false);
    liveMessage.value = 'Bookmark deleted.';
    finishOrReturn((b) => b?.applyDelete(id), false);
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
      <header class="brandbar">
        <span class="mark" aria-hidden="true"></span>
        <span class="wordmark">Mahalinkam</span>
        <span
          class="status status--off"
          role="img"
          aria-label="Server not connected"
          title="Not connected"
        ></span>
      </header>
      <h1>Connect your server</h1>
      <p class="muted">
        Add your server's URL and an API token — create the token in the mahalinkam web UI under
        Settings → API tokens.
      </p>
      <button type="button" class="primary" @click="openSettings">Open settings</button>
    </template>

    <template v-else>
      <header class="brandbar">
        <span class="mark" :class="{ stamping }" aria-hidden="true"></span>
        <span class="wordmark">Mahalinkam</span>
        <span
          class="status status--on"
          role="img"
          aria-label="Server connected"
          title="Connected"
        ></span>
      </header>

      <nav class="tabs" role="tablist" aria-label="Views">
        <button
          v-for="(v, i) in VIEWS"
          :id="`tab-${v}`"
          :key="v"
          :ref="(el) => setTabEl(el, i)"
          type="button"
          role="tab"
          :aria-controls="`panel-${v}`"
          :aria-selected="view === v"
          :tabindex="view === v ? 0 : -1"
          :class="{ on: view === v }"
          @click="selectView(v)"
          @keydown="onTabKeydown"
        >
          {{
            v === 'form' ? (mode === 'edit' ? 'Edit' : 'Save') : v === 'list' ? 'List' : 'Search'
          }}
        </button>
      </nav>

      <section v-show="view === 'form'" id="panel-form" role="tabpanel" aria-labelledby="tab-form">
        <button v-if="formOrigin === 'list'" type="button" class="backlink" @click="backToList">
          ← Back to list
        </button>
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
          :saved="justSaved"
          :field-errors="fieldErrors"
          @submit="submit"
          @delete="remove"
        />
        <ErrorNotice :error="error" @retry="retry" @settings="openSettings" />
      </section>

      <section v-show="view === 'list'" id="panel-list" role="tabpanel" aria-labelledby="tab-list">
        <BookmarkBrowser ref="browserRef" :folders="rawFolders" @edit="editFromList" />
      </section>

      <section
        v-show="view === 'search'"
        id="panel-search"
        role="tabpanel"
        aria-labelledby="tab-search"
      >
        <QuickSearch />
      </section>
    </template>

    <p class="sr-only" role="status" aria-live="polite">{{ liveMessage }}</p>
  </main>
</template>

<style scoped>
.popup {
  width: 340px;
  padding: 0.85rem;
  font-family: system-ui, sans-serif;
  color: #1a1a1a;
}

/* --- Identity band -------------------------------------------------------- */
.brandbar {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: -0.1rem 0 0.7rem;
  padding-bottom: 0.55rem;
  border-bottom: 1px solid #e5e7eb;
}

.mark {
  width: 11px;
  height: 11px;
  flex: none;
  background: #1d4ed8;
  border-radius: 2px;
  box-shadow: 3px 3px 0 0 #93c5fd;
}

.mark.stamping {
  animation: mark-stamp 220ms ease-out;
}

@keyframes mark-stamp {
  0% {
    transform: scale(1);
    box-shadow: 3px 3px 0 0 #93c5fd;
  }
  45% {
    transform: scale(0.86);
    box-shadow: 1px 1px 0 0 #93c5fd;
  }
  100% {
    transform: scale(1);
    box-shadow: 3px 3px 0 0 #93c5fd;
  }
}

@keyframes mark-breathe {
  0%,
  100% {
    box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.18);
  }
  50% {
    box-shadow: 0 0 0 5px rgba(22, 163, 74, 0.06);
  }
}

.wordmark {
  font-family:
    ui-monospace, 'SF Mono', 'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', monospace;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: lowercase;
  color: #111827;
}

.status {
  width: 7px;
  height: 7px;
  margin-left: auto;
  border-radius: 50%;
  flex: none;
}

.status--on {
  background: #16a34a;
  box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.18);
}

.status--off {
  background: #9ca3af;
}

@media (prefers-reduced-motion: no-preference) {
  .status--on {
    animation: mark-breathe 3s ease-in-out infinite;
  }
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

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

.backlink {
  display: inline-flex;
  align-items: center;
  margin-bottom: 0.55rem;
  padding: 0.2rem 0.1rem;
  font-family:
    ui-monospace, 'SF Mono', 'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', monospace;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #1d4ed8;
  background: transparent;
  border: none;
  cursor: pointer;
}

.backlink:hover {
  text-decoration: underline;
}

/* --- Segmented tab control --------------------------------------------- */
.tabs {
  display: flex;
  gap: 2px;
  margin-bottom: 0.8rem;
  padding: 2px;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 7px;
}

.tabs button {
  flex: 1;
  padding: 0.4rem 0.35rem;
  font-family:
    ui-monospace, 'SF Mono', 'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', monospace;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #6b7280;
  background: transparent;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.tabs button:hover:not(.on) {
  color: #111827;
}

.tabs button:focus-visible {
  outline: 2px solid #1d4ed8;
  outline-offset: 2px;
}

.tabs button.on {
  color: #fff;
  background: #1d4ed8;
  box-shadow: 0 1px 2px rgba(29, 78, 216, 0.35);
}

.primary {
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: #fff;
  background: #1d4ed8;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: transform 90ms ease;
}

.primary:active {
  transform: translateY(1px) scale(0.985);
}

@media (prefers-color-scheme: dark) {
  .popup {
    color: #e8e8e8;
    background: #171717;
  }

  .brandbar {
    border-bottom-color: #2a2a2a;
  }

  .mark {
    background: #60a5fa;
    box-shadow: 3px 3px 0 0 #1e3a8a;
  }

  @keyframes mark-stamp {
    0% {
      transform: scale(1);
      box-shadow: 3px 3px 0 0 #1e3a8a;
    }
    45% {
      transform: scale(0.86);
      box-shadow: 1px 1px 0 0 #1e3a8a;
    }
    100% {
      transform: scale(1);
      box-shadow: 3px 3px 0 0 #1e3a8a;
    }
  }

  .wordmark {
    color: #f3f4f6;
  }

  .backlink {
    color: #60a5fa;
  }

  .tabs button:focus-visible {
    outline-color: #60a5fa;
  }

  .tabs {
    background: #0f0f0f;
    border-color: #2a2a2a;
  }

  .tabs button:hover:not(.on) {
    color: #f3f4f6;
  }

  .tabs button.on {
    color: #fff;
    background: #2563eb;
    box-shadow: none;
  }
}
</style>

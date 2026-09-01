<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import browser from 'webextension-polyfill';
import { apiClient, type Bookmark, type Folder } from '../../lib/apiClient';
import { buildTree, type TreeNode } from '../../lib/folderTree';
import { withViewTransition } from '../../lib/viewTransition';
import ErrorNotice from './ErrorNotice.vue';

/**
 * The List tab: a breadcrumb-anchored folder drill-down.
 *
 * - Root ("All") shows top-level folders first, then every bookmark not in a
 *   folder (`apiClient.listBookmarks({ folderId: 'unfiled' })`), so loose
 *   bookmarks are visible without a click.
 * - Inside a folder: its direct subfolders (non-recursive), then that folder's
 *   bookmarks, paged at 50.
 * - The breadcrumb bar is the only way back up.
 *
 * The folder hierarchy comes from the `folders` prop that `App.vue` already
 * fetched once for the Save-form picker — this component never calls
 * `listFolders()` itself. The bookmark fetch is lazy: it fires when the List tab
 * is first shown (`active`), not on mount.
 */
const props = defineProps<{ folders: Folder[]; active?: boolean }>();
const emit = defineEmits<{ (e: 'edit', bookmark: Bookmark): void }>();

type Scope = { kind: 'root' } | { kind: 'folder'; id: number };

interface Crumb {
  label: string;
  scope: Scope;
}

const tree = computed(() => buildTree(props.folders));

const crumbs = ref<Crumb[]>([{ label: 'All', scope: { kind: 'root' } }]);
const currentScope = computed(() => crumbs.value[crumbs.value.length - 1].scope);
/** Re-keys the list on navigation so the CSS slide-in replays. */
const scopeKey = computed(() => crumbs.value.map((c) => c.label).join(' / '));

const bookmarks = ref<Bookmark[]>([]);
const page = ref(1);
const lastPage = ref(1);
const loading = ref(false);
const error = ref<unknown>(null);

function findNode(nodes: TreeNode[], id: number): TreeNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const hit = findNode(n.children, id);
    if (hit) return hit;
  }
  return null;
}

const childFolders = computed<TreeNode[]>(() => {
  const scope = currentScope.value;
  if (scope.kind === 'root') return tree.value;
  return findNode(tree.value, scope.id)?.children ?? [];
});

const hasMore = computed(() => page.value < lastPage.value);
const initialLoading = computed(
  () => loading.value && bookmarks.value.length === 0 && childFolders.value.length === 0,
);
const isEmpty = computed(
  () =>
    !loading.value &&
    !error.value &&
    childFolders.value.length === 0 &&
    bookmarks.value.length === 0,
);

/** The `folder_id` filter for the current scope: a folder id, or `unfiled` at
 *  root (which lists every bookmark not in a folder). */
const scopeFilter = computed(() =>
  currentScope.value.kind === 'root' ? 'unfiled' : String(currentScope.value.id),
);

let reqSeq = 0;
async function loadBookmarks(reset: boolean): Promise<void> {
  const seq = ++reqSeq;
  loading.value = true;
  error.value = null;
  try {
    const res = await apiClient.listBookmarks({
      folderId: scopeFilter.value,
      page: reset ? 1 : page.value,
    });
    if (seq !== reqSeq) return; // a newer navigation superseded this one
    page.value = res.meta.current_page;
    lastPage.value = res.meta.last_page;
    bookmarks.value = reset ? res.data : [...bookmarks.value, ...res.data];
  } catch (err) {
    if (seq !== reqSeq) return;
    error.value = err;
    if (reset) bookmarks.value = [];
  } finally {
    if (seq === reqSeq) loading.value = false;
  }
}

/** Lazy first load: fetch the root's loose bookmarks when the tab first opens. */
let loadedOnce = false;
watch(
  () => props.active,
  (on) => {
    if (on && !loadedOnce) {
      loadedOnce = true;
      void loadBookmarks(true);
    }
  },
  { immediate: true },
);

function enterFolder(node: TreeNode): void {
  void withViewTransition(async () => {
    crumbs.value = [...crumbs.value, { label: node.name, scope: { kind: 'folder', id: node.id } }];
    page.value = 1;
    await nextTick();
  }, 'drill-in');
  void loadBookmarks(true);
}

function goToCrumb(index: number): void {
  if (index >= crumbs.value.length - 1) return;
  void withViewTransition(async () => {
    crumbs.value = crumbs.value.slice(0, index + 1);
    page.value = 1;
    await nextTick();
  }, 'drill-out');
  void loadBookmarks(true);
}

function loadMore(): void {
  page.value += 1;
  void loadBookmarks(false);
}

function host(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function open(url: string): void {
  void browser.tabs.create({ url });
  window.close();
}

/* ---- reconcile after an edit/delete done in the form, without a refetch ---- */

const flash = ref('');
let flashTimer: ReturnType<typeof setTimeout> | undefined;
function showFlash(msg: string): void {
  flash.value = msg;
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => (flash.value = ''), 2200);
}
onBeforeUnmount(() => clearTimeout(flashTimer));

function scopeHolds(bm: Bookmark): boolean {
  const scope = currentScope.value;
  return scope.kind === 'root' ? bm.folder_id === null : bm.folder_id === scope.id;
}

/** Drop a row the form just deleted. */
function applyDelete(id: number): void {
  bookmarks.value = bookmarks.value.filter((b) => b.id !== id);
  showFlash('Bookmark deleted.');
}

/** Replace a row the form just edited — or drop it if the edit moved it out. */
function applyUpdate(bm: Bookmark): void {
  if (scopeHolds(bm)) {
    bookmarks.value = bookmarks.value.map((b) => (b.id === bm.id ? bm : b));
    showFlash('Bookmark updated.');
  } else {
    bookmarks.value = bookmarks.value.filter((b) => b.id !== bm.id);
    showFlash('Bookmark moved.');
  }
}

defineExpose({ applyDelete, applyUpdate });
</script>

<template>
  <div class="browser">
    <nav class="crumbs" aria-label="Folder path">
      <template v-for="(c, i) in crumbs" :key="i">
        <button v-if="i < crumbs.length - 1" type="button" class="crumb" @click="goToCrumb(i)">
          {{ c.label }}
        </button>
        <span v-else class="crumb current" aria-current="page">{{ c.label }}</span>
        <span v-if="i < crumbs.length - 1" class="sep" aria-hidden="true">›</span>
      </template>
    </nav>

    <p v-if="currentScope.kind === 'root'" class="lead">
      Your folders, then bookmarks not in a folder. Use the Search tab to search by text.
    </p>

    <Transition name="flash">
      <p v-if="flash" class="flash" role="status">{{ flash }}</p>
    </Transition>

    <ErrorNotice :error="error" @retry="loadBookmarks(true)" />

    <ul v-if="initialLoading" class="rows" aria-hidden="true">
      <li v-for="n in 3" :key="n" class="skeleton"></li>
    </ul>

    <ul v-else :key="scopeKey" class="rows slide">
      <li v-for="node in childFolders" :key="`f${node.id}`">
        <button type="button" class="row folder" @click="enterFolder(node)">
          <svg
            class="ico"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <span class="meta">
            <span class="title">{{ node.name }}</span>
          </span>
          <svg
            class="chev"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </li>

      <li v-for="b in bookmarks" :key="`b${b.id}`" class="bookmark-row">
        <button type="button" class="row open" @click="open(b.url)">
          <img
            v-if="b.favicon_url"
            :src="b.favicon_url"
            alt=""
            width="16"
            height="16"
            class="fav"
          />
          <span v-else class="fav fav-blank" aria-hidden="true"></span>
          <span class="meta">
            <span class="title">{{ b.title || b.url }}</span>
            <span class="host">{{ host(b.url) }}</span>
          </span>
        </button>
        <button type="button" class="edit" title="Edit bookmark" @click="emit('edit', b)">
          Edit
        </button>
      </li>
    </ul>

    <p v-if="loading && bookmarks.length > 0" class="hint">Loading…</p>
    <button v-else-if="hasMore" type="button" class="more" @click="loadMore">Load more</button>
    <p v-else-if="isEmpty" class="hint">
      {{ currentScope.kind === 'root' ? 'No bookmarks yet.' : 'Nothing in this folder yet.' }}
    </p>
  </div>
</template>

<style scoped>
.crumbs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.15rem 0.25rem;
  font-size: 0.8rem;
  margin-bottom: 0.5rem;
}

.crumb {
  padding: 0.1rem 0.2rem;
  font-size: 0.8rem;
  font-family: inherit;
  color: #1d4ed8;
  background: transparent;
  border: none;
  border-radius: 3px;
  cursor: pointer;
}

.crumb:hover {
  background: #eef3fd;
}

.crumb.current {
  color: inherit;
  font-weight: 600;
  cursor: default;
}

.sep {
  color: #9ca3af;
}

.lead {
  margin: 0 0 0.5rem;
  font-size: 0.75rem;
  line-height: 1.4;
  color: #6b7280;
}

.flash {
  margin: 0 0 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
}

.flash-enter-active,
.flash-leave-active {
  transition:
    opacity 150ms ease,
    transform 150ms ease;
}

.flash-enter-from,
.flash-leave-to {
  opacity: 0;
  transform: translateY(-2px);
}

@media (prefers-reduced-motion: reduce) {
  .flash-enter-active,
  .flash-leave-active {
    transition: none;
  }
}

.rows {
  list-style: none;
  margin: 0.25rem 0 0;
  padding: 0;
  max-height: 20rem;
  overflow-y: auto;
}

.slide {
  animation: slide-in 150ms ease-out;
}

@keyframes slide-in {
  from {
    opacity: 0;
    transform: translateX(6px);
  }
}

.row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  text-align: left;
  padding: 0.4rem 0.35rem;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: inherit;
  font-family: inherit;
}

.row:hover {
  background: #f1f5f9;
}

.bookmark-row {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.bookmark-row .open {
  flex: 1;
  min-width: 0;
}

.edit {
  flex: none;
  padding: 0.25rem 0.4rem;
  font-family:
    ui-monospace, 'SF Mono', 'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', monospace;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #6b7280;
  background: transparent;
  border: none;
  border-radius: 3px;
  cursor: pointer;
}

.edit:hover {
  color: #1d4ed8;
}

.ico,
.chev {
  flex: none;
  width: 16px;
  height: 16px;
}

.chev {
  color: #9ca3af;
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

.meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.title {
  font-size: 0.85rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.host {
  font-size: 0.72rem;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.skeleton {
  height: 2rem;
  margin: 0.25rem 0.35rem;
  border-radius: 4px;
  background: #e5e7eb;
  animation: pulse 1.2s ease-in-out infinite;
}

@keyframes pulse {
  50% {
    opacity: 0.5;
  }
}

.hint {
  margin: 0.6rem 0 0;
  font-size: 0.82rem;
  color: #6b7280;
}

.more {
  margin: 0.5rem 0 0;
  padding: 0.35rem 0.5rem;
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

.more:hover {
  text-decoration: underline;
}

@media (prefers-reduced-motion: reduce) {
  .slide {
    animation: none;
  }

  .skeleton {
    animation: none;
  }
}

@media (prefers-color-scheme: dark) {
  .crumb {
    color: #60a5fa;
  }

  .crumb:hover {
    background: #262626;
  }

  .row:hover {
    background: #262626;
  }

  .edit {
    color: #9ca3af;
  }

  .edit:hover {
    color: #60a5fa;
  }

  .fav-blank {
    background: #4b5563;
  }

  .skeleton {
    background: #2e2e2e;
  }

  .more {
    color: #60a5fa;
  }
}
</style>

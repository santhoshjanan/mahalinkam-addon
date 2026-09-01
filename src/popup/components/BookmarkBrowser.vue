<script setup lang="ts">
import { computed, ref } from 'vue';
import browser from 'webextension-polyfill';
import { apiClient, type Bookmark, type Folder } from '../../lib/apiClient';
import { buildTree, type TreeNode } from '../../lib/folderTree';
import ErrorNotice from './ErrorNotice.vue';

/**
 * The List tab: a breadcrumb-anchored folder drill-down.
 *
 * - Root ("All") shows top-level folders plus an "Unfiled" entry — never any
 *   bookmarks; you descend to see them.
 * - Inside a folder: its direct subfolders first (non-recursive), then that
 *   folder's bookmarks via `apiClient.listBookmarks({ folderId })`, paged at 50.
 * - The breadcrumb bar is the only way back up.
 *
 * The folder hierarchy comes from the `folders` prop that `App.vue` already
 * fetched once for the Save-form picker — this component never calls
 * `listFolders()` itself.
 */
const props = defineProps<{ folders: Folder[] }>();
const emit = defineEmits<{ (e: 'edit', bookmark: Bookmark): void }>();

type Scope = { kind: 'root' } | { kind: 'folder'; id: number } | { kind: 'unfiled' };

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
  if (scope.kind === 'folder') return findNode(tree.value, scope.id)?.children ?? [];
  return [];
});

const showUnfiledEntry = computed(() => currentScope.value.kind === 'root');
const hasMore = computed(() => page.value < lastPage.value);
const initialLoading = computed(() => loading.value && bookmarks.value.length === 0);
const isEmpty = computed(
  () =>
    currentScope.value.kind !== 'root' &&
    !loading.value &&
    !error.value &&
    childFolders.value.length === 0 &&
    bookmarks.value.length === 0,
);

async function loadBookmarks(reset: boolean): Promise<void> {
  const scope = currentScope.value;
  if (scope.kind === 'root') {
    bookmarks.value = [];
    error.value = null;
    return;
  }
  const folderId = scope.kind === 'unfiled' ? 'unfiled' : String(scope.id);
  loading.value = true;
  error.value = null;
  try {
    const res = await apiClient.listBookmarks({ folderId, page: reset ? 1 : page.value });
    page.value = res.meta.current_page;
    lastPage.value = res.meta.last_page;
    bookmarks.value = reset ? res.data : [...bookmarks.value, ...res.data];
  } catch (err) {
    error.value = err;
    if (reset) bookmarks.value = [];
  } finally {
    loading.value = false;
  }
}

function enterFolder(node: TreeNode): void {
  crumbs.value = [...crumbs.value, { label: node.name, scope: { kind: 'folder', id: node.id } }];
  page.value = 1;
  void loadBookmarks(true);
}

function enterUnfiled(): void {
  crumbs.value = [...crumbs.value, { label: 'Unfiled', scope: { kind: 'unfiled' } }];
  page.value = 1;
  void loadBookmarks(true);
}

function goToCrumb(index: number): void {
  if (index >= crumbs.value.length - 1) return;
  crumbs.value = crumbs.value.slice(0, index + 1);
  page.value = 1;
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

      <li v-if="showUnfiledEntry">
        <button type="button" class="row folder" @click="enterUnfiled">
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
            <path d="M22 12h-6l-2 3h-4l-2-3H2" />
            <path
              d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"
            />
          </svg>
          <span class="meta"><span class="title">Unfiled</span></span>
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
    <p v-else-if="isEmpty" class="hint">Nothing in this folder yet.</p>
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
  color: #2563eb;
  background: transparent;
  border: none;
  border-radius: 3px;
  cursor: pointer;
}

.crumb:hover {
  background: #eff6ff;
}

.crumb.current {
  color: inherit;
  font-weight: 600;
  cursor: default;
}

.sep {
  color: #9ca3af;
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
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  font-family: inherit;
  color: #6b7280;
  background: transparent;
  border: 1px solid #d1d5db;
  border-radius: 3px;
  cursor: pointer;
}

.edit:hover {
  color: #2563eb;
  border-color: #2563eb;
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
  color: #666;
}

.more {
  margin: 0.5rem 0 0;
  padding: 0.35rem 0.6rem;
  font-size: 0.8rem;
  font-weight: 600;
  font-family: inherit;
  color: #2563eb;
  background: transparent;
  border: 1px solid #bfdbfe;
  border-radius: 4px;
  cursor: pointer;
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
    background: #1e293b;
  }

  .row:hover {
    background: #262626;
  }

  .edit {
    color: #9ca3af;
    border-color: #444;
  }

  .edit:hover {
    color: #60a5fa;
    border-color: #60a5fa;
  }

  .fav-blank {
    background: #4b5563;
  }

  .skeleton {
    background: #333;
  }

  .more {
    border-color: #1e3a8a;
    color: #60a5fa;
  }
}
</style>

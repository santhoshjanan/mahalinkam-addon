<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import browser from 'webextension-polyfill';
import { apiClient, type Bookmark } from '../../lib/apiClient';
import ErrorNotice from './ErrorNotice.vue';

const query = ref('');
const results = ref<Bookmark[]>([]);
const loading = ref(false);
const error = ref<unknown>(null);

let timer: ReturnType<typeof setTimeout> | undefined;

function host(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

async function runSearch(): Promise<void> {
  const q = query.value.trim();
  if (!q) {
    results.value = [];
    error.value = null;
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    const page = await apiClient.listBookmarks({ q });
    results.value = page.data;
  } catch (err) {
    error.value = err;
    results.value = [];
  } finally {
    loading.value = false;
  }
}

function onInput(): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void runSearch(), 250);
}

function open(url: string): void {
  void browser.tabs.create({ url });
  window.close();
}

function onEnter(): void {
  if (timer) clearTimeout(timer);
  if (results.value.length > 0) {
    open(results.value[0].url);
  } else {
    void runSearch();
  }
}

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer);
});
</script>

<template>
  <div class="quick-search">
    <input
      v-model="query"
      type="search"
      class="search"
      placeholder="Search bookmarks…"
      autocomplete="off"
      autofocus
      @input="onInput"
      @keydown.enter.prevent="onEnter"
    />

    <ErrorNotice :error="error" @retry="runSearch" />

    <p v-if="loading" class="hint">Searching…</p>
    <p v-else-if="query.trim() && results.length === 0 && !error" class="hint">No matches.</p>

    <ul v-else class="rows">
      <li v-for="b in results" :key="b.id">
        <button type="button" class="row" @click="open(b.url)">
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
      </li>
    </ul>
  </div>
</template>

<style scoped>
.search {
  width: 100%;
  box-sizing: border-box;
  padding: 0.45rem 0.55rem;
  font-size: 0.9rem;
  border: 1px solid #bbb;
  border-radius: 4px;
}

.hint {
  margin: 0.6rem 0 0;
  font-size: 0.82rem;
  color: #666;
}

.rows {
  list-style: none;
  margin: 0.5rem 0 0;
  padding: 0;
  max-height: 20rem;
  overflow-y: auto;
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
}

.row:hover {
  background: #f1f5f9;
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

@media (prefers-color-scheme: dark) {
  .search {
    background: #1e1e1e;
    border-color: #555;
    color: #e8e8e8;
  }

  .row:hover {
    background: #262626;
  }

  .fav-blank {
    background: #4b5563;
  }
}
</style>

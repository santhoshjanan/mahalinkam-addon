<script setup lang="ts">
import { computed, ref } from 'vue';

const props = defineProps<{
  modelValue: string[];
  suggestions?: string[];
}>();
const emit = defineEmits<{ (e: 'update:modelValue', value: string[]): void }>();

const draft = ref('');

const matches = computed(() => {
  const q = draft.value.trim().toLowerCase();
  if (!q) return [];
  return (props.suggestions ?? [])
    .filter((s) => s.toLowerCase().includes(q) && !props.modelValue.includes(s))
    .slice(0, 6);
});

function add(name: string): void {
  const clean = name.trim();
  if (!clean || props.modelValue.includes(clean)) {
    draft.value = '';
    return;
  }
  emit('update:modelValue', [...props.modelValue, clean]);
  draft.value = '';
}

function removeAt(i: number): void {
  const next = props.modelValue.slice();
  next.splice(i, 1);
  emit('update:modelValue', next);
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    add(draft.value);
  } else if (e.key === 'Backspace' && draft.value === '' && props.modelValue.length > 0) {
    removeAt(props.modelValue.length - 1);
  }
}
</script>

<template>
  <div class="tag-input">
    <div class="chips">
      <span v-for="(tag, i) in modelValue" :key="tag" class="chip">
        {{ tag }}
        <button type="button" class="x" aria-label="Remove tag" @click="removeAt(i)">×</button>
      </span>
      <input
        v-model="draft"
        type="text"
        class="entry"
        placeholder="Add tag…"
        autocomplete="off"
        @keydown="onKeydown"
        @blur="add(draft)"
      />
    </div>
    <ul v-if="matches.length" class="suggest">
      <li v-for="s in matches" :key="s">
        <button type="button" @mousedown.prevent="add(s)">
          {{ s }}
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.tag-input {
  position: relative;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  padding: 0.3rem;
  border: 1px solid #bbb;
  border-radius: 4px;
  background: #fff;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.1rem 0.35rem;
  font-size: 0.78rem;
  background: #e0e7ff;
  color: #3730a3;
  border-radius: 3px;
}

.chip .x {
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 0.9rem;
  line-height: 1;
  padding: 0;
}

.entry {
  flex: 1;
  min-width: 6rem;
  border: none;
  outline: none;
  font-size: 0.85rem;
  background: transparent;
  color: inherit;
}

.suggest {
  position: absolute;
  z-index: 5;
  left: 0;
  right: 0;
  margin: 0.15rem 0 0;
  padding: 0;
  list-style: none;
  background: #fff;
  border: 1px solid #bbb;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  overflow: hidden;
}

.suggest button {
  display: block;
  width: 100%;
  text-align: left;
  padding: 0.35rem 0.5rem;
  border: none;
  background: transparent;
  font-size: 0.83rem;
  cursor: pointer;
  color: inherit;
}

.suggest button:hover {
  background: #eef2ff;
}

@media (prefers-color-scheme: dark) {
  .chips,
  .suggest {
    background: #1e1e1e;
    border-color: #555;
  }

  .chip {
    background: #3730a3;
    color: #e0e7ff;
  }

  .suggest button:hover {
    background: #2a2a3a;
  }
}
</style>

<script setup lang="ts">
import { computed } from 'vue';
import { AuthError, NetworkError } from '../../lib/errors';

const props = defineProps<{ error: unknown }>();
const emit = defineEmits<{ (e: 'retry'): void }>();

const isNetwork = computed(() => props.error instanceof NetworkError);

const text = computed(() => {
  const err = props.error;
  if (err instanceof NetworkError) return "Can't reach the server.";
  if (err instanceof AuthError) return 'Token rejected — check the extension options.';
  if (err instanceof Error) return err.message;
  return String(err);
});
</script>

<template>
  <div v-if="error" class="notice" role="alert">
    <span class="msg">{{ text }}</span>
    <button v-if="isNetwork" type="button" class="retry" @click="emit('retry')">Retry</button>
  </div>
</template>

<style scoped>
.notice {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding: 0.4rem 0.55rem;
  font-size: 0.82rem;
  color: #b91c1c;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 4px;
}

.msg {
  flex: 1;
}

.retry {
  flex: none;
  padding: 0.2rem 0.5rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: #b91c1c;
  background: transparent;
  border: 1px solid #b91c1c;
  border-radius: 3px;
  cursor: pointer;
}

@media (prefers-color-scheme: dark) {
  .notice {
    color: #fca5a5;
    background: #2a1414;
    border-color: #7f1d1d;
  }

  .retry {
    color: #fca5a5;
    border-color: #fca5a5;
  }
}
</style>

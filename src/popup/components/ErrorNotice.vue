<script setup lang="ts">
import { computed } from 'vue';
import { AuthError, NetworkError, ServerError } from '../../lib/errors';

const props = defineProps<{ error: unknown }>();
const emit = defineEmits<{ (e: 'retry'): void; (e: 'settings'): void }>();

// Retryable: a network blip, or a transient 5xx from a self-hoster's proxy.
// Not retryable: AuthError / ValidationError (retrying changes nothing).
const canRetry = computed(
  () => props.error instanceof NetworkError || props.error instanceof ServerError,
);

// A rejected token is fixed in the options page, not by retrying — offer a jump.
const isAuth = computed(() => props.error instanceof AuthError);

const text = computed(() => {
  const err = props.error;
  if (err instanceof NetworkError) return "Can't reach the server.";
  if (err instanceof ServerError) return `Server error (HTTP ${err.status}).`;
  if (err instanceof AuthError) return 'Token rejected — check the extension options.';
  if (err instanceof Error) return err.message;
  return String(err);
});
</script>

<template>
  <div v-if="error" class="notice" role="alert">
    <span class="msg">{{ text }}</span>
    <button v-if="canRetry" type="button" class="retry" @click="emit('retry')">Retry</button>
    <button v-else-if="isAuth" type="button" class="retry" @click="emit('settings')">
      Settings
    </button>
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

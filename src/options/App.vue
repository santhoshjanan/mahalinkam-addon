<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { getSettings, saveSettings } from '../lib/storage';
import { requestOriginPermission } from '../lib/permissions';
import { apiClient } from '../lib/apiClient';
import { AuthError, NetworkError, NotConfiguredError, ServerError } from '../lib/errors';

type Status = 'idle' | 'testing' | 'ok' | 'error';

const serverUrl = ref('');
const token = ref('');
const status = ref<Status>('idle');
const message = ref('');

onMounted(async () => {
  const existing = await getSettings();
  if (existing) {
    serverUrl.value = existing.serverUrl;
    token.value = existing.token;
  }
});

function pingErrorMessage(err: unknown): string {
  if (err instanceof NotConfiguredError) return 'Fill in both fields.';
  if (err instanceof AuthError) return 'The server rejected this token.';
  if (err instanceof NetworkError)
    return "Couldn't reach the server (is the URL right? is it running?).";
  if (err instanceof ServerError) return `Server error (HTTP ${err.status}).`;
  return err instanceof Error ? err.message : String(err);
}

async function saveAndVerify(): Promise<void> {
  const url = serverUrl.value.trim();
  const tok = token.value.trim();

  if (!url || !tok) {
    status.value = 'error';
    message.value = 'Fill in both fields.';
    return;
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    status.value = 'error';
    message.value = 'Enter a valid server URL.';
    return;
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    status.value = 'error';
    message.value = 'Enter an http(s) server URL.';
    return;
  }

  status.value = 'testing';
  message.value = 'Verifying…';

  // Save BEFORE pinging: apiClient reads settings from storage on every call,
  // so the new values must be persisted first.
  await saveSettings({ serverUrl: url, token: tok });

  const granted = await requestOriginPermission(url);
  if (!granted) {
    status.value = 'error';
    message.value =
      "Permission denied — the extension can't reach the server until you allow access to its address.";
    return;
  }

  try {
    const res = await apiClient.ping();
    status.value = 'ok';
    message.value = `Connected as ${res.user.name} (${res.user.email}) — server ${res.server.version}`;
  } catch (err) {
    status.value = 'error';
    message.value = pingErrorMessage(err);
  }
}
</script>

<template>
  <main class="options">
    <h1>mahalinkam</h1>

    <label class="field">
      <span>Server URL</span>
      <input
        v-model="serverUrl"
        type="url"
        placeholder="https://mahalinkam.example.com"
        autocomplete="off"
      />
    </label>

    <label class="field">
      <span>API token</span>
      <input v-model="token" type="password" autocomplete="off" />
    </label>

    <p class="hint">
      Create a token in the mahalinkam web UI under Settings → API tokens
      (<code>/settings/tokens</code>).
    </p>

    <button class="primary" type="button" :disabled="status === 'testing'" @click="saveAndVerify">
      Save &amp; verify
    </button>

    <p v-if="message" class="message" :class="status" role="status" aria-live="polite">
      {{ message }}
    </p>
  </main>
</template>

<style scoped>
.options {
  max-width: 32rem;
  margin: 2rem auto;
  padding: 0 1rem;
  font-family: system-ui, sans-serif;
  color: #1a1a1a;
}

h1 {
  font-size: 1.25rem;
  margin-bottom: 1.5rem;
}

.field {
  display: block;
  margin-bottom: 1rem;
}

.field span {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.field input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.5rem;
  font-size: 0.95rem;
  border: 1px solid #bbb;
  border-radius: 4px;
}

.hint {
  font-size: 0.8rem;
  color: #555;
  margin: 0 0 1.25rem;
}

.hint code {
  background: #f0f0f0;
  padding: 0.05rem 0.25rem;
  border-radius: 3px;
}

.primary {
  padding: 0.5rem 1rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: #fff;
  background: #2563eb;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.primary:disabled {
  opacity: 0.6;
  cursor: default;
}

.message {
  margin-top: 1rem;
  font-size: 0.9rem;
}

.message.ok {
  color: #166534;
}

.message.error {
  color: #b91c1c;
}

.message.testing {
  color: #555;
}

@media (prefers-color-scheme: dark) {
  .options {
    color: #e8e8e8;
  }

  .field input {
    background: #1e1e1e;
    border-color: #555;
    color: #e8e8e8;
  }

  .hint {
    color: #aaa;
  }

  .hint code {
    background: #2a2a2a;
  }

  .message.ok {
    color: #4ade80;
  }

  .message.error {
    color: #f87171;
  }
}
</style>

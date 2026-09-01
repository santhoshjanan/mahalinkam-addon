<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { getSettings, saveSettings } from '../lib/storage';
import { requestOriginPermission } from '../lib/permissions';
import { apiClient } from '../lib/apiClient';
import { pingErrorMessage } from '../lib/pingError';

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

  try {
    // Firefox requires permissions.request() to be called SYNCHRONOUSLY from the
    // user-input handler — no `await` may run before it. So request the origin
    // grant FIRST, then await its result.
    const grantPromise = requestOriginPermission(url);
    const granted = await grantPromise;
    if (!granted) {
      status.value = 'error';
      message.value =
        "Permission denied — the extension can't reach the server until you allow access to its address.";
      return;
    }

    // Save BEFORE pinging: apiClient reads settings from storage on every call,
    // so the new values must be persisted first.
    await saveSettings({ serverUrl: url, token: tok });

    const res = await apiClient.ping();
    status.value = 'ok';
    message.value = `Connected as ${res.user.name} (${res.user.email}) — server ${res.server.version}`;
  } catch (err) {
    status.value = 'error';
    message.value = pingErrorMessage(err);
  } finally {
    // status must never be left stuck on 'testing' (the button's :disabled
    // binding keys off it) — force it to a terminal state.
    if (status.value === 'testing') status.value = 'error';
  }
}
</script>

<template>
  <main class="options">
    <header class="brandbar">
      <span class="mark" aria-hidden="true"></span>
      <span class="wordmark">Mahalinkam</span>
    </header>
    <h1>Connect your server</h1>

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
  max-width: 30rem;
  margin: 2.5rem auto;
  padding: 0 1rem;
  font-family: system-ui, sans-serif;
  color: #1a1a1a;
}

.brandbar {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-bottom: 1.5rem;
  padding-bottom: 0.6rem;
  border-bottom: 1px solid #e5e7eb;
}

.mark {
  width: 12px;
  height: 12px;
  flex: none;
  background: #1d4ed8;
  border-radius: 2px;
  box-shadow: 3px 3px 0 0 #93c5fd;
}

.wordmark {
  font-family:
    ui-monospace, 'SF Mono', 'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', monospace;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: lowercase;
  color: #111827;
}

h1 {
  font-size: 1.05rem;
  margin: 0 0 1.25rem;
}

.field {
  display: block;
  margin-bottom: 1rem;
}

.field span {
  display: block;
  font-size: 0.78rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.field input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.45rem 0.55rem;
  font-size: 0.9rem;
  font-family: inherit;
  border: 1px solid #bbb;
  border-radius: 4px;
}

.hint {
  font-size: 0.8rem;
  color: #6b7280;
  margin: 0 0 1.25rem;
}

.hint code {
  background: #f3f4f6;
  padding: 0.05rem 0.25rem;
  border-radius: 3px;
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
}

.primary:disabled {
  opacity: 0.6;
  cursor: default;
}

.message {
  margin-top: 1rem;
  font-size: 0.85rem;
}

.message.ok {
  color: #166534;
}

.message.error {
  color: #b91c1c;
}

.message.testing {
  color: #6b7280;
}

@media (prefers-color-scheme: dark) {
  .options {
    color: #e8e8e8;
  }

  .brandbar {
    border-bottom-color: #2a2a2a;
  }

  .mark {
    background: #60a5fa;
    box-shadow: 3px 3px 0 0 #1e3a8a;
  }

  .wordmark {
    color: #f3f4f6;
  }

  .field input {
    background: #1e1e1e;
    border-color: #555;
    color: #e8e8e8;
  }

  .hint {
    color: #9ca3af;
  }

  .hint code {
    background: #2a2a2a;
  }

  .message.ok {
    color: #4ade80;
  }

  .message.error {
    color: #fca5a5;
  }

  .message.testing {
    color: #9ca3af;
  }
}
</style>

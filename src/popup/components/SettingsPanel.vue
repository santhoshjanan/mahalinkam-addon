<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { getSettings, saveSettings, clearSettings } from '../../lib/storage';
import { requestOriginPermission } from '../../lib/permissions';
import { apiClient } from '../../lib/apiClient';
import { pingErrorMessage } from '../../lib/pingError';
import { redactToken } from '../../lib/redact';

/**
 * In-popup settings for a CONNECTED user: see the endpoint, rotate the token,
 * or disconnect. The standalone options page stays as first-run setup only.
 */
const emit = defineEmits<{ (e: 'close'): void; (e: 'disconnected'): void }>();

const serverUrl = ref('');
const token = ref('');

const account = ref<{ name: string; version: string } | null>(null);
const pinging = ref(true);
const pingError = ref('');

const editUrl = ref(false);
const editToken = ref(false);
const urlDraft = ref('');
const tokenDraft = ref('');
const verifying = ref(false);
const verifyError = ref('');

const dirty = computed(
  () =>
    (editUrl.value && urlDraft.value.trim() !== serverUrl.value) ||
    (editToken.value && tokenDraft.value.trim().length > 0),
);

onMounted(async () => {
  const s = await getSettings();
  if (s) {
    serverUrl.value = s.serverUrl;
    token.value = s.token;
  }
  await checkConnection();
});

async function checkConnection(): Promise<void> {
  pinging.value = true;
  pingError.value = '';
  try {
    const res = await apiClient.ping();
    account.value = { name: res.user.name, version: res.server.version };
  } catch (err) {
    account.value = null;
    pingError.value = pingErrorMessage(err);
  } finally {
    pinging.value = false;
  }
}

function startEditUrl(): void {
  urlDraft.value = serverUrl.value;
  editUrl.value = true;
}
function startEditToken(): void {
  tokenDraft.value = '';
  editToken.value = true;
}
function cancelEdits(): void {
  editUrl.value = false;
  editToken.value = false;
  urlDraft.value = '';
  tokenDraft.value = '';
  verifyError.value = '';
}

function saveAndVerify(): void {
  const newUrl = editUrl.value ? urlDraft.value.trim() : serverUrl.value;
  const newToken = editToken.value ? tokenDraft.value.trim() : token.value;

  let parsed: URL;
  try {
    parsed = new URL(newUrl);
  } catch {
    verifyError.value = 'Enter a valid server URL.';
    return;
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    verifyError.value = 'Enter an http(s) server URL.';
    return;
  }

  verifying.value = true;
  verifyError.value = '';
  void (async () => {
    try {
      // Firefox requires permissions.request() synchronously from the click —
      // no await before it. Request first, then await the result.
      const granted = await requestOriginPermission(newUrl);
      if (!granted) {
        verifyError.value =
          "Permission denied — the extension can't reach the server until you allow its address.";
        return;
      }
      await saveSettings({ serverUrl: newUrl, token: newToken });
      const res = await apiClient.ping();
      serverUrl.value = newUrl;
      token.value = newToken;
      account.value = { name: res.user.name, version: res.server.version };
      cancelEdits();
    } catch (err) {
      verifyError.value = pingErrorMessage(err);
    } finally {
      verifying.value = false;
    }
  })();
}

/* Two-stage Disconnect (same pattern as the bookmark Delete). */
const armed = ref(false);
let disarmTimer: ReturnType<typeof setTimeout> | undefined;
function onDisconnectClick(): void {
  if (armed.value) {
    clearTimeout(disarmTimer);
    armed.value = false;
    void clearSettings().then(() => emit('disconnected'));
    return;
  }
  armed.value = true;
  disarmTimer = setTimeout(() => (armed.value = false), 3500);
}
function disarm(): void {
  clearTimeout(disarmTimer);
  armed.value = false;
}
</script>

<template>
  <div class="settings">
    <header class="head">
      <span class="title">Settings</span>
      <button type="button" class="linkbtn" @click="emit('close')">Done</button>
    </header>

    <p v-if="pinging" class="status">Checking connection…</p>
    <p v-else-if="account" class="status status--ok">
      Connected as {{ account.name }} · server {{ account.version }}
    </p>
    <p v-else class="status status--warn">{{ pingError || 'Not connected.' }}</p>

    <div class="field">
      <div class="field-head">
        <span>Server</span>
        <button v-if="!editUrl" type="button" class="linkbtn" @click="startEditUrl">Edit</button>
      </div>
      <p v-if="!editUrl" class="value">{{ serverUrl }}</p>
      <input
        v-else
        v-model="urlDraft"
        type="url"
        autocomplete="off"
        placeholder="https://mahalinkam.example.com"
      />
    </div>

    <div class="field">
      <div class="field-head">
        <span>API token</span>
        <button v-if="!editToken" type="button" class="linkbtn" @click="startEditToken">
          Replace token
        </button>
      </div>
      <p v-if="!editToken" class="value">{{ redactToken(token) }}</p>
      <input
        v-else
        v-model="tokenDraft"
        type="password"
        autocomplete="off"
        placeholder="Paste a new token"
      />
    </div>

    <div v-if="editUrl || editToken" class="actions">
      <button type="submit" class="primary" :disabled="!dirty || verifying" @click="saveAndVerify">
        {{ verifying ? 'Verifying…' : 'Save & verify' }}
      </button>
      <button type="button" class="linkbtn" @click="cancelEdits">Cancel</button>
    </div>
    <p v-if="verifyError" class="field-error">{{ verifyError }}</p>

    <div class="disconnect">
      <button
        type="button"
        class="danger"
        :class="{ armed }"
        :aria-label="armed ? 'Confirm disconnect' : 'Disconnect from server'"
        @click="onDisconnectClick"
        @blur="disarm"
      >
        {{ armed ? 'Confirm?' : 'Disconnect' }}
      </button>
      <p class="note">
        Removes this addon's saved credentials. The token stays valid on your server until you
        delete it there.
      </p>
    </div>
  </div>
</template>

<style scoped>
.settings {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.title {
  font-family:
    ui-monospace, 'SF Mono', 'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', monospace;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #111827;
}

.linkbtn {
  padding: 0.1rem 0.1rem;
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

.linkbtn:hover {
  text-decoration: underline;
}

.status {
  margin: 0;
  font-size: 0.78rem;
  color: #6b7280;
}

.status--ok {
  color: #166534;
}

.status--warn {
  color: #b91c1c;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.field-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.field-head > span {
  font-size: 0.78rem;
  font-weight: 600;
}

.value {
  margin: 0;
  font-family:
    ui-monospace, 'SF Mono', 'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', monospace;
  font-size: 0.8rem;
  color: #1a1a1a;
  word-break: break-all;
}

.field input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.4rem 0.5rem;
  font-size: 0.85rem;
  font-family: inherit;
  border: 1px solid #bbb;
  border-radius: 4px;
}

.actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-top: 0.1rem;
}

.primary {
  padding: 0.5rem 0.9rem;
  font-size: 0.88rem;
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

.field-error {
  margin: 0;
  font-size: 0.75rem;
  color: #b91c1c;
}

.disconnect {
  margin-top: 0.4rem;
  padding-top: 0.7rem;
  border-top: 1px solid #e5e7eb;
}

.danger {
  padding: 0.45rem 0.75rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #b91c1c;
  background: transparent;
  border: 1px solid #b91c1c;
  border-radius: 4px;
  cursor: pointer;
  transition:
    background 120ms ease,
    color 120ms ease;
}

.danger.armed {
  color: #fff;
  background: #b91c1c;
}

.note {
  margin: 0.4rem 0 0;
  font-size: 0.72rem;
  line-height: 1.4;
  color: #6b7280;
}

@media (prefers-color-scheme: dark) {
  .title {
    color: #f3f4f6;
  }

  .linkbtn {
    color: #60a5fa;
  }

  .value {
    color: #e8e8e8;
  }

  .field input {
    background: #1e1e1e;
    border-color: #555;
    color: #e8e8e8;
  }

  .status--ok {
    color: #4ade80;
  }

  .status--warn,
  .field-error {
    color: #fca5a5;
  }

  .disconnect {
    border-top-color: #2a2a2a;
  }
}
</style>

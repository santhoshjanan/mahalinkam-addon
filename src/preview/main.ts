/**
 * Standalone preview harness for the extension popup. Renders the real
 * `src/popup/App.vue` (Save / List / Search tabs) against mocked `browser.*`
 * (see vite.preview.config.ts alias) and a mocked `fetch` serving fixtures.
 *
 * Run: npx vite --config vite.preview.config.ts  →  http://localhost:5173
 * Dev-only. Not part of the shipped extension build.
 */
import './fetchMock';
import { createApp } from 'vue';
import App from '../popup/App.vue';

const app = document.getElementById('app');
if (app) createApp(App).mount(app);

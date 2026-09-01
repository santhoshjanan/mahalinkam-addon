import { resolve } from 'node:path';
import process from 'node:process';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

/**
 * Dev-only config for the standalone popup preview harness (`src/preview/`).
 * Renders the real popup Vue app in a normal browser tab by aliasing
 * `webextension-polyfill` to a mock; `fetch` is mocked at runtime in
 * `src/preview/fetchMock.ts`. Never used for the shipped extension build
 * (that's `vite.config.ts`).
 *
 * Run from the repo root:
 *   npx vite --config vite.preview.config.ts   →   http://localhost:5173
 */
const projectRoot = process.cwd();

export default defineConfig({
  root: resolve(projectRoot, 'src/preview'),
  resolve: {
    alias: {
      'webextension-polyfill': resolve(projectRoot, 'src/preview/browserMock.ts'),
    },
  },
  plugins: [vue()],
  server: { port: 5173, strictPort: true },
});

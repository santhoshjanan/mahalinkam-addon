import { cpSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import vue from '@vitejs/plugin-vue';
import webExtension from 'vite-plugin-web-extension';

const target = process.env.TARGET_BROWSER ?? 'chrome';
const outDir = `dist/${target}`;

// vite-plugin-web-extension only bundles HTML/script inputs; static manifest
// assets (icons) are its blind spot. Copy them into the output at the paths
// the manifest references.
function copyManifestAssets(): Plugin {
  return {
    name: 'mahalinkam:copy-manifest-assets',
    apply: 'build',
    closeBundle() {
      const dest = resolve(outDir, 'src/assets');
      mkdirSync(dest, { recursive: true });
      cpSync(resolve('src/assets'), dest, { recursive: true });
    },
  };
}

export default defineConfig({
  // vite-plugin-web-extension spawns child builds that ignore the `--outDir`
  // CLI flag, so the per-target output directory must be set here.
  build: {
    outDir,
    emptyOutDir: true,
  },
  plugins: [
    vue(),
    webExtension({
      manifest: 'src/manifest.json',
      browser: target,
      additionalInputs: ['src/popup/index.html', 'src/options/index.html'],
      // Emit a valid MV3 package per target. Chromium keeps
      // `background.service_worker`; Firefox MV3 wants `background.scripts`.
      // vite-plugin-web-extension does not transform this key, so do it here.
      transformManifest: (manifest) => {
        const bg = manifest.background as
          | { service_worker?: string; scripts?: string[]; type?: string }
          | undefined;
        if (target === 'firefox' && bg?.service_worker) {
          manifest.background = {
            scripts: [bg.service_worker],
            type: bg.type ?? 'module',
          } as typeof manifest.background;
        }
        return manifest;
      },
    }),
    copyManifestAssets(),
  ],
});

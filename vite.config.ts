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

// Rollup's built-in filename sanitizer replaces filesystem/URL-hostile
// characters (including control chars) with `_` and strips a leading `.`. The
// Vue SFC runtime helper is the virtual module id `<NUL>plugin-vue:export-helper`,
// so that default turns the leading NUL and the `:` into `_` and emits
// `_plugin-vue_export-helper.js`. Chrome, the Chrome Web Store and AMO reject
// any file whose name starts with `_` (reserved for `_locales` / `_metadata`),
// so the built extension refuses to load with "Filenames starting with _ are
// reserved for use by the system".
//
// This replacement drops control characters, maps the same hostile characters
// Rollup does to `_`, and then strips a leading `.` OR `_` from every path
// segment, so the shared chunk becomes `plugin-vue_export-helper.js` and no
// emitted file (chunk, entry or asset) starts with `_`.
//
// vite-plugin-web-extension overrides entry/chunk/assetFileNames in its child
// builds but never sets `sanitizeFileName`, so this survives its config merge.
const HOSTILE_CHARS = '"#$&*+,:;<=>?[]^`{|}';
function sanitizeFileName(name: string): string {
  let out = '';
  for (const ch of name) {
    const code = ch.codePointAt(0) ?? 0;
    if (code <= 31 || code === 127) continue;
    out += HOSTILE_CHARS.includes(ch) ? '_' : ch;
  }
  return out.replace(/(^|\/)[._]+/g, '$1');
}

export default defineConfig({
  // vite-plugin-web-extension spawns child builds that ignore the `--outDir`
  // CLI flag, so the per-target output directory must be set here.
  build: {
    outDir,
    emptyOutDir: true,
    rollupOptions: {
      output: {
        sanitizeFileName,
      },
    },
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

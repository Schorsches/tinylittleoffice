/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { CSP_META, headersFile } from './src/net/csp.ts';

/** Production only: the CSP <meta> into index.html and the security headers into dist/_headers. */
function security(): Plugin {
  return {
    name: 'linkmap-security',
    apply: 'build',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP_META }, injectTo: 'head-prepend' },
    ],
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: '_headers', source: headersFile() });
    },
  };
}

export default defineConfig({
  plugins: [react(), security()],
  build: {
    target: 'es2022',
    // No source maps in production: smaller deploy, nothing extra to audit. Turn on locally when debugging.
    sourcemap: false,
    // Vite's modulepreload polyfill is an inline script, which the CSP forbids; every supported browser has it natively.
    modulePreload: { polyfill: false },
    assetsInlineLimit: 0,
    // MapLibre is ~1.1 MB minified (300 kB gzipped) and lazy; the warning would only be noise.
    chunkSizeWarningLimit: 1200,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    testTimeout: 20_000,
  },
});

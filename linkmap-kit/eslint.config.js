// @ts-check
/**
 * Lint rules are the guardrails a coding agent cannot talk its way past. Each restriction maps to a rule in
 * docs/SECURITY.md or docs/ARCHITECTURE.md. Do not disable a rule inline; change the design instead.
 */
import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const NETWORK = ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'WebTransport'].map((name) => ({
  name,
  message: 'Network access is forbidden outside src/net/ (docs/SECURITY.md: no requests except the allow-list).',
}));
const STORAGE = ['localStorage', 'sessionStorage', 'indexedDB'].map((name) => ({
  name,
  message: 'Persistence goes through src/storage/ only (docs/SECURITY.md: nothing kept unless the user saves).',
}));

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules', 'playwright-report', 'test-results'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-restricted-globals': ['error', ...NETWORK, ...STORAGE],
      'no-restricted-properties': [
        'error',
        { object: 'navigator', property: 'sendBeacon', message: 'No telemetry, ever.' },
        { property: 'innerHTML', message: 'XSS: render text with React, never HTML strings.' },
        { property: 'outerHTML', message: 'XSS: render text with React, never HTML strings.' },
        { property: 'insertAdjacentHTML', message: 'XSS: render text with React, never HTML strings.' },
        { property: 'setHTML', message: 'XSS: MapLibre Popup.setHTML parses HTML. Use setDOMContent or setText.' },
        { object: 'document', property: 'write', message: 'XSS.' },
      ],
      'no-restricted-syntax': [
        'error',
        { selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']", message: 'XSS: user text from a link must never become HTML.' },
        {
          selector: "JSXAttribute[name.name='target'][value.value='_blank']",
          message: "Use the <ExternalLink> component (adds rel='noopener noreferrer').",
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['**/format/*', '!**/format/index.ts'], message: 'Import the format through src/format/index.ts.' },
            {
              group: ['axios', 'ky', '*analytics*', '*sentry*', '*posthog*', '*mixpanel*', '*gtag*'],
              message: 'No HTTP clients or telemetry SDKs.',
            },
          ],
        },
      ],
    },
  },
  {
    // The format is pure: no DOM, no React, no MapLibre, no network. It runs in Node and in the browser alike.
    files: ['src/format/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['react', 'react-*', 'maplibre-gl', 'terra-draw*', '../*'], message: 'src/format is pure and self-contained.' },
          ],
        },
      ],
    },
  },
  {
    // Byte-level code indexes arrays after explicit bounds checks (tsconfig has noUncheckedIndexedAccess).
    files: ['src/format/**/*.ts', 'src/main.tsx'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },
  { files: ['src/net/**/*.ts'], rules: { 'no-restricted-globals': ['error', ...STORAGE] } },
  { files: ['src/storage/**/*.ts'], rules: { 'no-restricted-globals': ['error', ...NETWORK] } },
  {
    files: ['**/*.test.{ts,tsx}', 'e2e/**/*.ts'],
    rules: { 'no-restricted-imports': 'off', '@typescript-eslint/no-non-null-assertion': 'off' },
  },
  { files: ['*.config.{ts,js}', 'eslint.config.js'], languageOptions: { globals: globals.node } },
);

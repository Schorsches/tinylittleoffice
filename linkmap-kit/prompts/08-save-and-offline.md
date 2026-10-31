# Prompt 08: Save on this device and offline (PWA)

Read first: AGENTS.md rule 5, docs/SECURITY.md T9, docs/ACCEPTANCE.md (08).

## Files

- `src/storage/saved.ts`: the only module that persists anything. It uses `idb-keyval` (already installed) with a
  dedicated store `createStore('linkmap', 'saved')`. Records are `{ id, title, payload, savedAt }`, and the payload is
  the encoded (or sealed) payload, never a plain password. API: `list()`, `save(entry)`, `rename(id, title)`,
  `remove(id)`, `forgetEverything()` (clears the store and calls `caches.delete` for every cache this app owns).
  Unit tests use `fake-indexeddb`. **New dev dependency allowed**: `fake-indexeddb@6.2.7`.
- `src/ui/SavedMaps.tsx`: a "Save on this device" button (explains that it's local only on first use), the saved list
  with Open, Rename and Delete, and "Forget everything" with a confirmation.
- PWA: **new dev dependency allowed**: `vite-plugin-pwa@2.0.0` (exact). Use `registerType: 'prompt'` and
  `injectRegister: 'script'` (an external file, never inline). Precache the app shell only (`globPatterns` for
  js/css/html/svg/webmanifest), and `navigateFallback: 'index.html'`. **No runtimeCaching for tiles.openfreemap.org.**
  Add a manifest with name, icons (SVG plus PNG generated once and committed) and `theme_color`.
- An "Update available" toast for the waiting service worker.

## Constraints

Nothing touches IndexedDB until the user presses Save. Verify the CSP still passes: `npm run build && npm run preview`,
then check the console for violations.

## Done when

docs/ACCEPTANCE.md 08 is met.

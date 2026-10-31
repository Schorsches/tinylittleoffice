# AGENTS.md: rules for every coding agent working on Linkmap

Linkmap is a map editor where **the link is the map**. A map (pins, lines, areas, names, notes, view) is compressed
into the URL fragment (`#/v1/…`). There are no accounts and no backend, and nothing is stored on a server. Whoever has
the link has the map.

Read this file completely before every task. If a request conflicts with a rule here, stop and say so. Do not work around it.

## 1. Non-negotiable rules

1. **The fragment never leaves the browser.** Never send the URL, the hash, the payload or any map content to any
   server, and never put it in a query string, a log, an error message, `document.referrer`, analytics or telemetry.
2. **Network: allow-list only.** The only remote host is `https://tiles.openfreemap.org`
   (`src/net/allowlist.ts`). Don't add CDNs, Google Fonts, analytics, error trackers, geocoders or tile hosts. A new
   host requires an ADR in `docs/DECISIONS.md` and an update to `src/net/allowlist.ts`. The CSP is generated from that file.
3. **No raw HTML from data.** Text from a link is attacker-controlled. Render it only as React text. Never use
   `dangerouslySetInnerHTML`, `innerHTML`, MapLibre `Popup.setHTML`, or `eval`/`new Function`. ESLint enforces this.
4. **Don't weaken the CSP** (`src/net/csp.ts`): no `'unsafe-inline'`, no `'unsafe-eval'`, no `blob:` workers, no
   wildcards. If something breaks under the CSP, fix the code.
5. **Persistence is opt-in, local only.** Nothing is stored unless the user presses Save. Saved maps go to IndexedDB
   via `src/storage/` (idb-keyval), never to `localStorage`, cookies or a server. A "Forget everything" button removes it all.
6. **The format is frozen.** `src/format/` holds the hand-written, tested reference codec. Don't change the byte layout
   of v1, and keep the golden test (`src/format/tests/link.test.ts`) passing. A new layout gets a new version byte, a
   `docs/FORMAT.md` update and new tests, and old links must still open.
7. **Passwords**: use `newLocker` / `encodeSealed` / `openSealed` from `src/format`. Keep keys and passwords in memory
   only. Never store, log or prefill them. Never roll your own crypto.
8. **No new dependencies** unless the prompt asks for one. Pin exact versions (`.npmrc` has `save-exact`). Never add
   packages with install scripts, HTTP clients, UI kits over 50 kB gzipped, or telemetry SDKs.
9. **Attribution stays visible**: OpenFreeMap © OpenMapTiles, data © OpenStreetMap contributors (MapLibre's
   attribution control). Don't hide it.

## 2. Architecture (details: docs/ARCHITECTURE.md)

```
src/
  format/   PURE. MapDoc model, binary codec, base64url, deflate, AES-GCM seal. No DOM, no React. Done & tested.
  net/      allow-list + CSP. The only place that may name a remote origin.
  map/      MapLibre (lazy) + terra-draw wiring. The only place that imports maplibre-gl / terra-draw.
  state/    zustand store: the current MapDoc, selection, undo/redo, link sync.
  storage/  opt-in local saves (IndexedDB via idb-keyval). The only place that persists anything.
  ui/       React components. Read state, dispatch actions. No business logic, no direct MapLibre calls.
  io/       import/export (GeoJSON, GPX, KML). Pure functions MapDoc <-> file text, unit-tested.
  i18n/     message catalogs (phase 8).
```

Data flow: **URL hash → decodeMap → store (MapDoc) → map + UI.** An edit dispatches an action, the store produces a
new immutable MapDoc, then `encodeMap` runs (debounced at 150 ms) and `history.replaceState` updates the hash. Undo/redo
lives in the store, not in browser history. The `hashchange` event (the user pasted another link) replaces the
document. Import UI code from `src/format/index.ts` only.

## 3. Workflow for every task

1. Restate the task in 2 or 3 lines and list the files you will touch. Stay inside the phase's scope.
2. Write or extend tests first for any logic (`src/**/tests/*.test.ts`, Vitest, node environment). Use
   `// @vitest-environment jsdom` only for component tests that need the DOM.
3. Implement with small, typed functions and no `any`.
4. Run `npm run check` (typecheck + ESLint + Prettier + tests) and show the summary. Fix everything before you finish.
5. End with: what changed, how to verify it by hand, any open question. Don't continue into the next phase.

## 4. Code style

- TypeScript strict, `noUncheckedIndexedAccess`. Use function components and hooks, named exports, files of 300 lines at most.
- State: one zustand store (`src/state/store.ts`) with explicit actions. Components select narrowly.
- Styling: plain CSS with custom properties in `src/styles.css` plus per-component CSS files. No CSS-in-JS runtime
  (the CSP forbids inline `<style>`). Tailwind is not used.
- Accessibility: every control is a `<button>`/`<input>` with a visible or `aria-label` name, focus is visible, and
  every action works by keyboard. Contrast ≥ 4.5:1. Respect `prefers-reduced-motion` and `prefers-color-scheme`.
- Errors shown to users are friendly and never contain a payload or stack trace.
- Comments explain _why_. Keep the existing file headers up to date.

## 5. Things Bolt's preview cannot do

- Playwright e2e tests (`npm run test:e2e`) need a real browser. They run locally or in CI, so write them but don't
  try to run them in the WebContainer.
- The CSP is injected only by `npm run build`. Check CSP problems with `npm run build && npm run preview`.

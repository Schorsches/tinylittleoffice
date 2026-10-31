# Prompt 01: App shell, state store, link sync

Read first: AGENTS.md, docs/ARCHITECTURE.md §State, docs/ACCEPTANCE.md (01).

## Goal

Replace the placeholder `src/App.tsx` with the real layout and a single zustand store that holds the MapDoc and keeps
the URL fragment in sync.

## Files

- `src/state/store.ts`: the store from docs/ARCHITECTURE.md §State. Actions validate with `problems()` and reject
  invalid changes (return `false`, don't throw). Undo/redo stacks are capped at 100. `setView` never creates undo entries.
- `src/state/link.ts`: `startLinkSync(store)`. On start it reads `location.hash` with `payloadOf` and `decodeMap`, and
  sets `status` to `'ready' | 'needs-password' | 'damaged'` (LinkError code `sealed` means needs-password). It then
  subscribes to `doc`, encodes with a 150 ms debounce, and calls `history.replaceState(null, '', toHash(payload) || location.pathname)`.
  It listens to `hashchange`, ignoring its own writes (compare payloads), and returns an unsubscribe function.
- `src/state/tests/store.test.ts` and `src/state/tests/link.test.ts`: write these first. Use fake timers, and stub
  `location`/`history` with a minimal fake object injected as a parameter (no jsdom needed).
- `src/ui/Layout.tsx` + `src/ui/layout.css`: header (title, toolbar slot, share slot), a collapsible sidebar on the
  left (inline-start), and the map area. Mobile below 720 px: the sidebar becomes a bottom sheet.
- `src/ui/DamagedLink.tsx`: friendly message plus a "Start a new map" button (clears the hash).
- `src/App.tsx`: starts link sync once and renders Layout or DamagedLink. Keep the existing map from
  `src/map/maplibre.ts` in the map area for now.

## Constraints

No new dependencies. No MapLibre imports outside `src/map/`. The password flow is phase 06; for `needs-password`,
show a placeholder panel.

## Done when

docs/ACCEPTANCE.md 01 and the Definition of Done are met, and `npm run check` is green.

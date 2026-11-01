# Architecture

## Overview

```
                    ┌──────────────── browser tab ────────────────────────────────────────┐
  https://host/#/v1/z…  │                                                                 │
        │               │  location.hash ──payloadOf──▶ decodeMap ──▶ state/store (MapDoc) │
        │               │       ▲                                        │      │          │
        │               │  replaceState ◀── encodeMap (debounced) ◀──────┘      ▼          │
        │               │                                          map/ (MapLibre,  ui/    │
        │               │                                          terra-draw)    (React) │
        │               │                                               │                  │
        │               │                       storage/ (IndexedDB, opt-in)               │
        └───────────────┴───────────────────────────────────────────────┼──────────────────┘
                                                                         ▼ tiles only
                                                         https://tiles.openfreemap.org
```

There is no backend. Static files can be served from any static host (Netlify, Cloudflare Pages, GitHub Pages, or
nginx). `dist/_headers` carries the security headers for hosts that read it.

## Modules and their contracts

| Module        | Owns                                    | May import                                                     | Must not                                  |
| ------------- | --------------------------------------- | -------------------------------------------------------------- | ----------------------------------------- |
| `src/format`  | `MapDoc` model, v1 codec, seal          | `fflate`                                                       | DOM, React, MapLibre, other `src/*`       |
| `src/net`     | allowed origins, CSP, headers           | –                                                              | storage                                   |
| `src/map`     | MapLibre instance, layers, terra-draw   | `maplibre-gl`, `terra-draw*`, `format`, `net`                  | React state outside props/callbacks       |
| `src/state`   | zustand store, actions, undo, link sync | `format`                                                       | MapLibre, DOM except `location`/`history` |
| `src/storage` | saved maps (IndexedDB)                  | `idb-keyval`, `format`                                         | network                                   |
| `src/io`      | GeoJSON/GPX/KML ↔ MapDoc                | `format`                                                       | DOM except `DOMParser` (GPX import)       |
| `src/ui`      | React components                        | `state`, `format` (types, PALETTE), `map` (via `MapView` only) | `maplibre-gl` directly                    |

## State (`src/state/store.ts`)

```ts
interface State {
  doc: MapDoc; // the document (immutable)
  selected: number | null; // feature index
  tool: 'select' | 'point' | 'line' | 'polygon';
  past: MapDoc[];
  future: MapDoc[]; // undo/redo, capped at 100
  locker: Locker | null; // password key, memory only
  status: 'ready' | 'needs-password' | 'damaged';
  // actions
  addFeature(f: Feature): void;
  updateFeature(i: number, patch: Partial<Feature>): void;
  removeFeature(i: number): void;
  setView(v: View): void; // NOT pushed to undo history
  setTitle(t: string): void;
  undo(): void;
  redo(): void;
  replaceDoc(d: MapDoc): void;
}
```

Rules: every document change goes through an action, and the action validates with `problems()` before committing.
View changes (pan/zoom) update `doc.view` but don't create undo entries. Link sync (`src/state/link.ts`) subscribes to
`doc` and `locker`, encodes (sealed if `locker`) debounced at 150 ms, and calls `history.replaceState(null, '', toHash(p))`.
It never uses `pushState`, so the back button leaves the app instead of stepping through edits.

## Map rendering (`src/map/`)

- `maplibre.ts` (from the kit) is the lazy loader and map factory. Reuse it.
- `layers.ts` turns a MapDoc into **one** GeoJSON source `linkmap` with features carrying `{ i, kind, color, name }`
  plus fixed layers: `linkmap-fill` (polygons, 20% opacity), `linkmap-line` (lines and polygon outlines, 3 px),
  `linkmap-point` (circle 7 px, white 2 px stroke), `linkmap-label` (symbol layer using the style's own font
  `Noto Sans Regular`, which OpenFreeMap serves, so no new font host is needed). Colour comes from
  `['at', ['get','color'], ['literal', PALETTE]]`.
- Updating the map calls `source.setData()` with the new GeoJSON. Don't add or remove layers per feature.
- `draw.ts` wires terra-draw (`TerraDrawMapLibreGLAdapter`) modes point/linestring/polygon/select. On finish, it
  converts the terra-draw feature into a `Feature` and dispatches `addFeature`, then clears terra-draw's own store.
  The MapDoc stays the single source of truth.
- `MapView.tsx` (in `ui/`) is the only React component that touches the map. It creates the map on mount, removes it on
  unmount, and syncs props to the map in effects.

## Performance budgets

- Initial JS (without MapLibre chunk) ≤ 90 kB gzipped; CSS ≤ 15 kB gzipped.
- Encode + replaceState for a 5,000-coordinate doc < 16 ms on a mid-range laptop (measure in a unit benchmark).
- The MapLibre chunk is loaded only when a map is shown.

## Testing pyramid

- **Unit (Vitest, node)**: format (done), io, state actions, link sync, simplify, limits.
- **Component (Vitest + jsdom)**: panels, forms, share dialog. Mock `src/map`.
- **E2E (Playwright, production build, CSP active)**: open link, draw, share, password, import, no foreign hosts.
  Runs locally and in CI, not in Bolt.

## Deployment

`npm run build`, then upload `dist/` to any static host. Cloudflare Pages and Netlify apply `dist/_headers`
automatically. On GitHub Pages only the CSP `<meta>` applies, so `frame-ancestors` is missing. Document that limitation.

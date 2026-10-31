# Prompt 02: Render the map document

Read first: AGENTS.md, docs/ARCHITECTURE.md §Map rendering, docs/ACCEPTANCE.md (02).

## Goal

Draw every feature of the MapDoc on the map and keep the camera and the document in sync.

## Files

- `src/map/geojson.ts`: `toGeoJson(doc): FeatureCollection` with properties `{ i, kind, color, name }`. Polygons are
  closed here (ring + first point). Make it pure and unit-test it in `src/map/tests/geojson.test.ts`.
- `src/map/layers.ts`: `installLayers(map)` adds source `linkmap` and the layers `linkmap-fill`, `linkmap-line`,
  `linkmap-point` and `linkmap-label` exactly as docs/ARCHITECTURE.md describes. Labels use the font
  `["Noto Sans Regular"]` (served by OpenFreeMap) with a halo. `updateLayers(map, doc, selected)` calls `setData`, and
  the selected feature gets a thicker outline via a `feature-state` or `['==', ['get','i'], selected]` expression.
- `src/ui/MapView.tsx`: creates the map with `createMap` from `src/map/maplibre.ts` on mount and removes it on
  unmount. It installs layers on `load`, updates them when `doc.features` or `selected` change, and on `moveend`
  dispatches `setView` (rounded via the store). When a new document is loaded (hashchange), it jumps to its view.
  Clicking a feature selects it (`queryRenderedFeatures` on the linkmap layers).
- Add a loading state while MapLibre loads, and an error state if WebGL is unavailable ("Your browser cannot draw
  this map" plus the feature list still usable).

## Constraints

Use a single GeoJSON source; don't add or remove layers per feature. Don't add HTML popups; feature details live in the
sidebar (phase 04). Don't add new dependencies.

## Done when

The golden Lisbon link from `e2e/smoke.spec.ts` shows all four features, and docs/ACCEPTANCE.md 02 is met.

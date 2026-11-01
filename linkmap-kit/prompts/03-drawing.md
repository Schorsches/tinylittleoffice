# Prompt 03: Drawing tools (terra-draw)

Read first: AGENTS.md, docs/ARCHITECTURE.md §Map rendering (draw.ts), docs/ACCEPTANCE.md (03).

## Goal

Let users create and edit points, lines and polygons. The MapDoc stays the single source of truth.

## Files

- `src/map/draw.ts`: `createDraw(map)` with `TerraDraw` and `TerraDrawMapLibreGLAdapter` (from
  `terra-draw-maplibre-gl-adapter`) and the modes `TerraDrawPointMode`, `TerraDrawLineStringMode`,
  `TerraDrawPolygonMode` and `TerraDrawSelectMode` (dragging coordinates allowed, deletion allowed). It exposes
  `setTool(tool)`, `onFinish(cb)` and `editFeature(index, feature)` / `stopEditing()`.
  On finish: convert to a `Feature` (polygon ring unclosed, coordinates wrapped with `wrapLng`), call `addFeature`
  with the last-used colour, clear terra-draw's store, and switch back to `select`.
  Editing an existing feature: load only that feature into terra-draw, and on change dispatch `updateFeature` (debounced
  100 ms, one undo entry per drag).
- `src/map/tests/draw-convert.test.ts`: unit tests for the pure conversion functions (terra-draw GeoJSON ↔ Feature).
- `src/ui/Toolbar.tsx`: Select (V), Point (P), Line (L), Area (A), Undo, Redo, as buttons with `aria-pressed` and
  tooltips showing shortcuts. Esc cancels the current drawing, Enter finishes a line or polygon, and Delete/Backspace
  removes the selected feature (not while typing in an input).
- Wire it up in `MapView.tsx`. While drawing, the store's `tool` drives the cursor and the hint text ("Click to add
  points, Enter to finish").

## Constraints

terra-draw is only the input device; never read features back from it as state. Respect `LIMITS` (refuse to add when
full, with a message). Don't add new dependencies (terra-draw is already installed).

## Done when

docs/ACCEPTANCE.md 03 is met. Manual check: draw one of each, reload the page, and they're still there (from the link).

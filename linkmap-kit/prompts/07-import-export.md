# Prompt 07: Import and export (GeoJSON, GPX, KML)

Read first: AGENTS.md, docs/PRD.md §Import / export, docs/SECURITY.md T4, docs/ACCEPTANCE.md (07).

## Files (`src/io/`, pure functions, unit-tested with fixture files in `src/io/tests/fixtures/`)

- `geojson.ts`: `fromGeoJson(text): { doc: MapDoc; skipped: string[] }` and `toGeoJson(doc): string`. Accept
  Feature, FeatureCollection and bare geometries. Multi* geometries split into features, polygon holes are dropped
  (reported in `skipped`), `properties.name`/`description`/`note` are mapped, and unknown properties are ignored.
  Validate with `problems()` and trim to `LIMITS`, listing what was cut.
- `gpx.ts`: `fromGpx(text)` via `DOMParser('application/xml')`, which checks for `parsererror`. `wpt` becomes a point,
  `rte` and each `trkseg` become a line, and `name`/`desc` are read. `toGpx(doc)` writes points as `wpt` and lines as
  `trk`, and leaves polygons out (listed). All text is XML-escaped (`& < > " '`).
- `kml.ts`: `toKml(doc)` only, with `Placemark` per feature and colours from `PALETTE` converted to KML `aabbggrr`.
- `src/ui/ImportExport.tsx`: file input (accept .geojson, .json, .gpx) and drag-and-drop on the map. Read locally with
  `File.text()`, reject files over 10 MB, and show an import summary (imported/skipped). Import can replace the map
  or add to it. Export buttons download via `Blob` + `URL.createObjectURL` + `<a download>` and revoke the URL after.
  File names come from the title, sanitised.

## Constraints

Never upload files. Don't add new dependencies. Never evaluate or inject imported content as HTML.

## Done when

docs/ACCEPTANCE.md 07 is met.

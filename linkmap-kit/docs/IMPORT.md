# Local import and data preparation

Open **Import file**. Choose a file or expand **Paste GeoJSON**, paste JSON and press **Check data**.
The preview shows the first five accepted items, the number of accepted features and the number of adjustment
or rejection notices. Expand the notices to see up to 20 distinct issues. One feature may cause several notices;
the notice count is not the number of rejected features. Nothing is committed until **Add to map** or **Replace map**.
Add keeps the current title/settings and appends features; Replace uses the imported document. Both are undoable.
An import with zero accepted features cannot replace or add to a map. Editing pasted data or choosing a new file
invalidates the previous preview, and late reads cannot replace a newer result.

CSV and GPX remain supported. Ordinary GeoJSON keeps its original behavior. Native Linkmap GeoJSON exports use
`linkmap.format: "atlas-v2"` and retain map view/settings and metadata. For human or agent-prepared data, use the
flat profile below. Unknown declared profiles are rejected instead of silently importing an incomplete map.

## GeoJSON import profile v1

This is an import-only profile, separate from the version of a shared link. Accepted metadata becomes the existing
v2 document; ordinary v1 links and all existing crypto remain unchanged. No new remote host is used.

```json
{
  "type": "FeatureCollection",
  "name": "Meeting map",
  "linkmap": { "format": "import-v1" },
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "Point", "coordinates": [8.37, 49.21] },
      "properties": {
        "name": "Fictional meeting point",
        "address": "",
        "category": "Meeting",
        "services": ["Step-free access"],
        "hours": "Saturday 14:00–18:00",
        "note": "Fictional example. Replace before sharing.",
        "color": "#15604c"
      }
    }
  ]
}
```

| Field                                | Type and limits                                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `type`, `linkmap.format`, `features` | Required envelope: `FeatureCollection`, `import-v1`, array of GeoJSON Features                   |
| Top-level `name`                     | Optional map title, plain string, up to 400 UTF-8 bytes; invalid titles reject the file          |
| `geometry`                           | Point, LineString or Polygon; coordinates ordered `[longitude, latitude]` in WGS84; no geocoding |
| `properties`                         | Required object; all fields below optional; omitted text becomes empty text                      |
| `name`, `note`                       | Plain strings, up to 400 / 4,000 UTF-8 bytes                                                     |
| `address`, `hours`                   | Plain strings, up to 2,000 UTF-8 bytes each                                                      |
| `category`                           | Plain string, up to 120 UTF-8 bytes                                                              |
| `services`                           | Array of up to 30 plain strings, each up to 120 UTF-8 bytes                                      |
| `color`                              | Optional six-digit hex string such as `#15604c`; maps to a feature's custom color                |

Explicit null values and wrong metadata types are invalid, not defaults. Invalid metadata skips the entire feature
with a numbered notice; it never silently disappears from an otherwise accepted feature. Unknown fields are reported
and omitted. Geometry conversion follows the existing GeoJSON importer: multi-geometries are expanded, polygon holes
are reported and omitted, and invalid or unsupported geometry is skipped. Longitude must be within ±180; latitude
must also fit the map's Web Mercator limit (approximately ±85.05113). Polygon rings must have at least three
vertices; source rings should follow GeoJSON's closure convention. No coordinate is guessed or derived from an address. `geometry: null` produces
an invalid-geometry notice and skips the feature.

The source limit is 10 MiB, with at most 5,000 accepted features and 200,000 accepted coordinates. Existing import
limits report excess features/coordinates. Native GeoJSON may also report truncated text; the flat profile instead
rejects invalid metadata for that feature. All imported strings remain text, including anything that looks like HTML.
Use native GeoJSON export for lossless backups including map settings; CSV/GPX/KML have narrower field coverage.

## Template and transformation prompt

Expand **Templates and data preparation** to download a point CSV, a GeoJSON example with a point/path/area or a
transformation prompt in the current interface language (German/English). The downloads are generated locally and
contain fictional examples only, never the current map, shared link or password.

The prompt describes the exact profile, asks the external tool to treat source text as data rather than instructions,
and forbids inventing or looking up coordinates and facts. Records with missing coordinates get `geometry: null`,
so Linkmap reports them rather than placing guessed pins. Users supply their own source data to a tool they choose;
Linkmap does not call an AI service or send data. A prompt is guidance, not a guarantee about an external model's
output: always check both the import notices and the resulting places before sharing.

## Verification

Parser tests cover metadata/link/native export round trips, the downloadable template, ordinary GeoJSON compatibility,
unsupported fields, missing coordinates, hostile text, wrong types, unknown profiles, invalid envelopes and size limits.
Dialog regressions cover preview-before-commit, stale preview invalidation and out-of-order file-read failures.
The production browser flow is `e2e/import.spec.ts`; it additionally checks pasted data, explicit application and
metadata after link reload under the existing network/privacy guard.

# Changelog

## Local import workflow — 2026-11-13

- Added the versioned `import-v1` GeoJSON profile with flat place metadata, validation and native v2-link conversion.
- Added local GeoJSON paste/check, item previews and bounded adjustment notices before explicit Add/Replace.
- Added GeoJSON examples and German/English transformation-prompt downloads without sending map data.
- Invalidated stale previews and out-of-order file reads; empty imports cannot replace an existing map.

## Kartenatelier integration — 2026-11-13

- Integrated the prepared Kartenatelier commit onto the dependency-policy baseline without changing either lockfile.
- Fixed the office suite's workflow inventory and scoped its removed-feature vocabulary lint to that product.
- Added v2 visitor-link synchronization and protected-document gating regressions.
- Extended the browser privacy guard to cover both link versions and visitor URLs.

## Kartenatelier — 2026-11-01

- Implemented selected design direction 1 with content outline, map toolbar and contextual inspector.
- Added addresses, categories, service tags, display-only hours, custom colors and appearance settings.
- Added visitor search and category/service filters, mobile map/list views and touch-visible drawing completion.
- Added downloadable CSV template, local CSV validation and lossless native extended GeoJSON exchange.
- Added v2 metadata links and protected snapshots while preserving all v1 codec and crypto tests.
- Added locally hosted IBM Plex Sans and Phosphor icons; no new remote origins.

## 1.0.0 — 2026-11-01

- Implemented map editing, feature descriptions and colours, undo/redo and live fragment links.
- Added sharing, local QR codes, password protection and unlock/lock workflows.
- Added GeoJSON/GPX import, GeoJSON/GPX/KML export, and line simplification with preview.
- Added opt-in local encrypted saves, deletion, offline app shell and PWA manifest.
- Added German/English UI, responsive layout, light/dark themes and keyboard alternatives.
- Added component, state, import, storage and production browser checks, size budgets and repository-level CI.
- Preserved the frozen v1 format, crypto implementation, allow-list, CSP and security lint rules.

# Acceptance criteria

## Definition of Done (every phase)

- `npm run check` is green (typecheck, ESLint, Prettier, Vitest), and the output summary is shown.
- New logic has unit tests, and bugs fixed get a regression test.
- No new remote host, HTML sink, inline style or script, and no persistence outside `src/storage/`.
- No new dependency unless the phase lists it, pinned exactly.
- `npm run build` succeeds, and the main chunk stays ≤ 90 kB gzipped (excluding the MapLibre chunk).
- Keyboard-operable, with visible focus and labelled controls.
- The phase's own checklist below is fully satisfied.

## Phase checklists

**01 Shell & state**: the store has actions, undo/redo (max 100) and validation. Link sync is debounced and uses
replaceState. `hashchange` loads another map. A damaged link shows a friendly screen with "Start a new map".
Unit tests cover every action, undo/redo, and the encode/replaceState debounce (fake timers).

**02 Map**: the golden Lisbon link renders 2 pins, 1 line and 1 polygon in their colours with labels. Panning updates
the hash (view) without an undo entry. A new map shows the world view. The attribution is visible.

**03 Drawing**: point, line and polygon tools work with mouse, touch and keyboard (Esc cancels, Enter finishes). Select,
move vertices and Delete all work. Each drawn feature appears in the link. Undo removes it.

**04 Panel**: there's a feature list, and selecting one flies to it (instantly under reduced motion). Name, note,
colour and title can be edited, with byte counters at the limits. Over-limit input is prevented, not truncated silently.

**05 Share**: the link meter thresholds are 2,048 and 8,000. Copy (with a fallback when the Clipboard API is denied),
Web Share when present, and a local QR code (`qrcode-generator`, as a data-URL `<img>`). Simplify lines uses
Douglas–Peucker with a tolerance slider, previewed before it's applied, and can be undone.

**06 Password**: you can set, change and remove a password. A sealed link prompts for it. Wrong password and damaged
link show the same message. The key is never persisted. The strength hint is local only.

**07 Import/export**: GeoJSON round-trips (Point, LineString, Polygon outer ring, and Multi* split into features).
GPX imports wpt/rte/trk and exports. KML exports. The file size limit is 10 MB, and unsupported geometries are listed in
a summary instead of failing silently. Exported XML escapes all text.

**08 Save & offline**: Save, the saved list, Rename, Delete and "Forget everything" (IndexedDB plus SW caches). Nothing
is written before the first Save. The PWA is installable, the app shell works offline, and tiles aren't precached.

**09 i18n & a11y**: English and German catalogs and a language switcher (choice kept only in a saved setting after
Save, otherwise taken from `navigator.language`). CSS logical properties, so an RTL layout works with `dir="rtl"`. axe
reports no violations in component tests. Contrast passes.

**10 Hardening & release**: e2e covers open, draw, share, password, import, the "no foreign host" check and the "no
fragment leak" check. Lighthouse meets the targets in docs/PRD.md. The README for users and self-hosters is done.
`dist/_headers` is verified, and the deploy guide covers Cloudflare Pages, Netlify and GitHub Pages.

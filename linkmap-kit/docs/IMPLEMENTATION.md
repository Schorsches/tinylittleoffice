# Implementation and verification

The standalone starter from PR #1 is now an application in `linkmap-kit/`. All runtime changes are confined to that
folder; `.github/workflows/linkmap.yml` at repository root runs its checks because workflows nested inside the kit
are only active after copying it to a standalone repository.

## Decisions made during implementation

- The user's request authorizes the complete implementation, so phases 01–10 were implemented in order in this
  working branch. The starter's “one phase per message” rule describes the original incremental Bolt workflow.
- The v1 codec, crypto, CSP and ESLint policy are unchanged. MapLibre palette expressions explicitly convert stored
  colour strings to colours; the style validator requires this conversion.
- All features render in one GeoJSON source. Terra Draw holds only the current drawing/editing gesture, and completed
  gestures commit to the document store. A completed drag is one undo step.
- Service worker registration is explicit (“Enable offline app”), satisfying the stricter rule that nothing is
  persisted by default. A small generated worker avoids adding a PWA framework dependency. It caches only app build
  files, never tiles or user documents. Updates wait for user activation; forgetting removes app caches and registration.
- File import reports skipped/adjusted geometries. GPX rejects DTD/entity declarations before DOMParser and escapes
  all exported XML text. GeoJSON validates finite WGS84 coordinates and reports unsupported geometries and holes.
- Large geometry bounds use reductions instead of spread arguments, which could overflow the call stack at codec limits.
- Imported content and labels are rendered only as React text or MapLibre text fields. No HTML sinks are introduced.
- Protected saved records use a generic title to avoid exposing a map's title outside its ciphertext.
- Text edits commit after a 500 ms typing pause or on blur. All features also have editable coordinate text for a full
  keyboard alternative to dragging. Feature lists use native buttons with Tab/Enter navigation.
- Camera movement is transient; Appearance explicitly commits the start view. Geolocation never commits a location.

## Validation

`npm run check` runs strict TypeScript, the unchanged security and architecture ESLint rules, Prettier, the original
codec/CSP tests, and tests for state/history, hash synchronization, passwords, geometry conversion, simplification,
imports/exports, local storage, language parity and component accessibility. Component axe checks omit colour contrast
because jsdom has no layout; contrast must be checked in the real browser.

`npm run test:e2e` uses the production build and real OpenFreeMap. A shared guard asserts no unexpected remote hosts,
request bodies, fragment-bearing requests/referrers, runtime errors or console errors. Flows cover the golden Lisbon
link, damaged links, all drawing modes, sharing, password reopening, GPX import, encrypted storage, forgetting, mobile
keyboard input and opt-in offline startup.

`npm run build` enforces the 90 KiB initial JavaScript and 15 KiB total CSS budgets and emits `_headers`, a CSP meta,
manifest and versioned app-shell service worker. The frozen golden link continues to round-trip byte-for-byte.

## Baseline results before Kartenatelier (2026-11-01)

- `npm run check`: 40 tests in 12 files; TypeScript, ESLint and Prettier pass.
- Production browser checks cover real OpenFreeMap under CSP, including desktop and mobile German dark mode axe
  scans with no WCAG A/AA violations in the tested screens.
- Initial JavaScript is about 85 KiB gzip; CSS including MapLibre about 12.3 KiB gzip.
- `npm audit --omit=dev --audit-level=high`: zero vulnerabilities reported.
- Local synthetic examples: a ten-pin payload is 85 characters; a 300-vertex track simplified at 10 m encodes to
  48 characters. Encoding a 5,000-coordinate track averaged about 4.1 ms over ten runs in the development container.
  These figures describe those fixtures and this machine, not arbitrary imports or mobile hardware.
- Desktop and mobile production screenshots were visually reviewed. The initial map-container CSS conflict and
  Terra Draw's UUID requirement were fixed and are exercised by the drawing/browser flows.

## Limits to assess before a public release

- Lighthouse targets in the PRD need a dedicated audit on the intended deployment, device and network. Unit/component
  checks are not evidence of Lighthouse 100 or full WCAG conformance.
- Tile availability and latency depend on OpenFreeMap. Offline mode preserves app UI and document editing, not a
  downloadable background map. No search/geocoder or routing service has been added.
- Browser link capacity and messaging limits vary; warnings are guidance, not delivery guarantees.
- New passwords cannot revoke old shared links. Local saves are device-specific and may be cleared by the browser.

## Selected Kartenatelier design

Three-column desktop editor and responsive mobile map/list workflow, contextual metadata editor, appearance controls,
visitor search/category/service filters, CSV template import and version-2 links are implemented. Hours are display
text; there is no automatic open-now evaluation. No address geocoding or remote search is added. The earlier design
proposal for a richer normalized import profile and AI transformation prompt remains a future extension; the supplied
CSV template and native GeoJSON are the supported exchange formats today. See `../design-qa.md` for current evidence.

Current Kartenatelier validation: `npm run check` passes 49 tests in 15 files, TypeScript, ESLint and Prettier.
All 9 production browser tests pass; the final typography change was followed by another passing desktop/mobile axe
check. Production build passes at 89.1 KiB initial JavaScript and approximately 14.1 KiB total CSS gzip.

## Integration validation — 2026-11-13

The prepared Kartenatelier commit `46575c4` is integrated onto `5d03846` (the merged dependency-policy PR).
Both manifests and lockfiles retain the policy baseline's versions. The office suite's workflow inventory now
recognizes the standalone Linkmap checks, and its removed-feature vocabulary rule applies only to that suite.
New regressions exercise v2 visitor-link synchronization and password gating; the browser privacy guard now
recognizes v1, v2 and visitor fragments in request headers.

- Release-age gate: all 442 exact locked versions pass; all six policy tests pass.
- Linkmap `npm run check`: TypeScript, ESLint, Prettier and 51 tests in 15 files pass.
- Linkmap production build: passes; 89.1 KiB initial JavaScript and approximately 14.1 KiB total CSS gzip.
- Linkmap `npm audit --omit=dev`: zero reported vulnerabilities. This does not assess development dependencies.
- Root targeted checks (`deploy`, `lints`, `cli`, `doc/properties`) with one worker: all 67 tests pass.
- Root `npm run build:site`: passes, including its budgets. This is separate from the standalone Linkmap output.
- Full root unit run: 1,255 pass, six skip, four fail. The CLI/property timeouts pass in the targeted single-worker
  run. Remaining failures concern the unchanged calendar test's local-timezone assumption and a card-rendering
  test needing the unavailable pinned browser.
- Root `npm run lint` stops at pre-existing Playwright `Page` type incompatibilities in three unchanged root e2e
  files; root-wide validation is not green.
- Linkmap's nine production browser tests were attempted using `/usr/bin/chromium`. Chromium aborts before any
  page loads because this environment denies its process-singleton socket. No current browser or visual pass is
  claimed; the screenshots and nine-test pass above are historical evidence from 2026-11-01.

Before merging, rerun the repository CI and all nine Linkmap browser tests in an environment that can launch
Chromium. Manual review: open an existing v1 link, add address/category/services to produce v2, reload, preview,
filter places and open the shared snapshot in another tab. Repeat with password protection and at 390 × 844.
This integration does not publish either application. Normalized import profiles and the AI transformation prompt
remain follow-up work.

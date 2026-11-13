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
proposal for a richer normalized import profile and AI transformation prompt is implemented in the local import workflow
described in [IMPORT.md](IMPORT.md). CSV, native GeoJSON and GPX remain supported. See `../design-qa.md` for design evidence.

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

## Local import workflow validation — 2026-11-13

Built on merged PR #3 (`b4e2485`). The import-only `import-v1` profile, local paste/preview flow and locally generated
DE/EN transformation prompts are documented in [IMPORT.md](IMPORT.md). Invalid previews and late file reads are
discarded, and zero-feature imports cannot replace the current map. Add/Replace remain explicit, undoable actions.
No package manifest, lockfile, shared-link codec, CSP, storage policy or network allow-list changes are required.

- `npm run check`: TypeScript, ESLint, Prettier and all 59 unit/component tests in 17 files pass.
- `npm run build`: passes, including budgets; 89.7 KiB initial JavaScript and approximately 14.1 KiB total CSS gzip.
- Parser tests cover metadata/native export/link round trips, template input, ordinary GeoJSON, invalid profiles,
  oversized input, wrong types, hostile text, unsupported fields and missing coordinates.
- Dialog tests cover preview before commit, undo, stale preview invalidation, out-of-order read failures and
  blocking zero-feature replacement.
- New production flow `e2e/import.spec.ts` was attempted with `/usr/bin/chromium`. It stops at browser launch with
  `socket() failed: Operation not permitted`; no page assertions or fresh visual checks ran. Run all ten browser
  tests and inspect the desktop/mobile import dialog in a browser-capable environment before release.
- This slice changes only Linkmap. The root suite issues recorded above were not changed or revalidated here.

Manual check: Import file → Templates and data preparation → download the GeoJSON template. Paste it under
Paste GeoJSON, check the preview, then change the text to invalid JSON and confirm the previous apply actions
disappear. Paste the template again, check and Add; Undo restores the prior map before a reload. Add again, reload
the v2 link and inspect the point's category, services, hours and color. Try both languages and download the transformation prompt; it should
contain fictional examples only. Maps and passwords are never inserted into that prompt.

## Link and password transition validation — 2026-11-13

Built on merged PR #4 (`f660ac3`). Preview/edit switches now participate in the existing 150 ms link debounce without
creating document undo entries. A mode change invalidates pending encryption so its result cannot restore a stale
mode in the URL. Both v1 and v2 routes remain compatible; the payload layout and cryptographic code are unchanged.
Unknown map routes such as `#/view/v3/...` show the damaged-link screen and are not automatically rewritten. Existing
non-map anchors remain outside the route parser.

Password/damaged-link gates atomically clear document-derived transient state (camera, filters, selection, history,
active drawing, messages and keys) and advance the document revision. Late protect/unlock results from an earlier
revision are discarded, even after navigating away and back to an identical payload. A pending lock cannot lock a
newly opened map. New map on a locked visitor link switches to edit mode.

- `npm run check`: strict TypeScript, ESLint, Prettier and all 70 tests in 18 files pass.
- `npm run build`: passes including the existing size budgets (approximately 89.8 KiB initial JavaScript and
  14.1 KiB total CSS gzip).
- Eleven new regressions exercise mode-only reloads for v1/v2, encrypted mode races, unsupported routes, transient
  state clearing, three password-navigation races and new-map behavior from the visitor password screen.
- Existing production browser flows now also assert preview/edit persistence across reload and unsupported-route
  recovery. Browser launch is still blocked in this workspace by Chromium's process-singleton socket restriction
  recorded in the preceding slices; no browser or fresh visual pass is claimed for this change.
- No dependency, lockfile, shared-link codec, CSP, host allow-list or persistence-policy changes. Root-suite issues
  described above remain outside this slice and were not revalidated.

Manual verification: create a map, choose Preview, wait for its visitor URL, then reload; the visitor view must
remain active. Choose Edit this copy, wait for its edit URL and reload again. Repeat with an extended/password-protected
map. An unsupported version must show recovery rather than an empty editor. On a locked visitor map, New map must
open the editor. Re-run the ten production browser tests in a browser-capable environment before release.

## Capacity and share-recovery validation — 2026-11-13

Built on merged PR #5 (`35e4a4e`). Structurally valid documents can exceed codec byte limits. Commits now preflight
the real encode/decode round trip and reserve the same 64 packed bytes used by the v2 protected encoder. Refused
edits retain the previous document and history; refused feature edits also retain the drawing color. Add validates
the combined map rather than just the incoming file. The import dialog shows a specific limit message and stays
open on refusal. Simplification previews report capacity failure without throwing during rendering. Copy fallback
handles missing Clipboard APIs, rejected promises and synchronous exceptions.

- `npm run check`: TypeScript, ESLint, Prettier and all 81 tests in 20 files pass.
- `npm run build`: passes existing budgets, approximately 89.9 KiB initial JavaScript and 14.1 KiB total CSS gzip.
- Eleven new regression cases cover v1/v2 inflated limits, incompressible packed limits, rejected transaction
  history/color preservation, valid round trips, combined imports, safe simplification and three clipboard failures.
- The existing production import flow now attempts a 600-point oversized document, checks refusal and then
  continues to a valid import. The ten browser tests still require a browser-capable environment; the Chromium
  launch restriction recorded above remains unresolved. No fresh browser or visual pass is claimed.
- A separate local Node timing run of the full preflight on a 5,000-coordinate extended track, after two warmups,
  averaged approximately 36 ms over ten runs (maximum 86 ms). This is synthetic container evidence, not a mobile
  performance guarantee; checking/compressing large maps has a synchronous cost and should be evaluated on target devices.
- No dependencies, lockfiles, codec layouts/crypto, CSP, network hosts or persistence policy changed. Root-suite
  issues remain outside this slice and were not revalidated.

Manual review: import a file with 600 points each holding a 4,000-byte note, try Add or Replace and confirm that
the existing map and undo history remain unchanged. Reduce the source and retry. Verify normal simplification,
Cancel and undo after Apply. Deny clipboard access and confirm the link is selected with manual-copy instructions.

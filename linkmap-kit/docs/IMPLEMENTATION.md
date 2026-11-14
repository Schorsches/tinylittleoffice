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

## Local-save transaction validation — 2026-11-13

Built on merged PR #6 (`7949af5`). The Save action captures a coherent title/payload pair after link generation;
navigation, document edits or password changes during that work reject the save rather than switching its content.
Protected v1/v2 snapshots use the generic protected-map title. The storage layer copies only the intended fields.
Map and language writes share one IndexedDB transaction, with explicit abort handling for synchronous put failures.
The previous saved-record shape and opt-in behavior remain compatible; no migration is required.

Local storage reads/writes and offline registration run in request order within one app instance. The queue recovers
after a failed job. Persist-language checks consent when its queued job executes, so an earlier saved setting cannot
recreate settings after Forget. The UI no longer performs a separate language write after Save. The saved-map dialog
guards duplicate jobs synchronously and disables Open/Rename/Delete/offline/Forget actions while busy. Forget also
unregisters matching waiting/installing workers and clears its pending-update control.

- `npm run check`: TypeScript, ESLint, Prettier and 91 tests in 22 files pass.
- `npm run build`: passes existing budgets; approximately 89.9 KiB initial JavaScript and 14.1 KiB total CSS gzip.
- Ten new regressions cover combined map/language saves, asynchronous transaction aborts, synchronous put failures,
  queue recovery, Save/Forget/language ordering, offline-registration ordering, protected v1/v2 snapshots, navigation
  during encryption, duplicate jobs, conflicting controls and error/retry behavior.
- The existing production save/forget flow now checks that one map plus its language record exist after Save and
  that no records remain after Forget. The ten browser tests still require a browser-capable environment; the known
  Chromium launch restriction remains unresolved. No fresh browser or visual pass is claimed.
- Ordering applies to calls in this JavaScript instance, not a global lock across other tabs. IndexedDB transaction
  atomicity covers the map/settings writes; cache and service-worker cleanup remain separate browser operations.
- No dependencies, lockfiles, link byte formats, crypto, CSP or remote hosts changed. All persistence remains explicit
  and local. Existing root-suite issues remain outside this slice and were not revalidated.

Manual review: save a protected extended map, reopen it and verify metadata and password protection; change the saved
language and reload. Try repeated Save clicks and ensure one record appears. Forget all data and verify the list stays
empty after another language change. Test offline opt-in followed by Forget, including a waiting app update. Simulate
an unavailable/quota-limited database and confirm the error does not leave half a save and a later retry can succeed.

## Repository release-validation repairs — 2026-11-14

Built on merged PR #7 (`82dcf4d`). The previously recorded root Playwright type conflict is resolved by aligning the
existing `@playwright/test` and `playwright` pins to 1.64.1. The accessibility adapter, runner and Vitest provider now
share one `playwright-core@1.64.1`; no casts, skipped type checks, overrides or new dependencies are needed. The root
dependency page is regenerated. Both lockfiles passed the release-age gate before installation (439 distinct exact
versions, zero age violations); the standalone Linkmap manifest and lockfile are unchanged.

The calendar assertion that expected UTC while reading the machine's default zone now explicitly supplies UTC.
Three additional cases verify UTC, Europe/Berlin and America/New_York viewers without depending on the host zone.
The original failure was reproduced with `TZ=Europe/Berlin` before the repair. No calendar runtime behavior changes.

- Root `npm run lint`: passes, including TypeScript, formatting, dead-export checks and all 36 lint/style/scroll tests.
- Root `npm run typecheck`: passes, including both Workers' generated types and checks.
- Root `npm run build:site`: passes its builds and budgets. This is a build check, not a deployment; no site was published.
- Calendar test file: all 21 cases pass with `TZ=UTC` and again with `TZ=Europe/Berlin`.
- Full root unit run with one worker: 1,266 pass, one skip, one fail out of 1,268. The only remaining failure is the
  card-rendering test, which cannot find the pinned Chromium Headless Shell executable. No product assertion in that
  test ran. The earlier CLI/property timeout cases and the timezone case pass in this run.
- Linkmap `npm run check`: all 91 tests in 22 files, TypeScript, ESLint and Prettier pass. Its production build and
  budgets pass (approximately 89.9 KiB initial JavaScript and 14.1 KiB CSS gzip).
- All ten Linkmap production browser tests were retried with `/usr/bin/chromium`: all stop at browser launch with
  `socket() failed: Operation not permitted`. Installing Playwright's pinned Headless Shell was also attempted, but
  its download returned invalid/truncated archives. No browser assertions, screenshots, Lighthouse scores or fresh
  visual pass are claimed. Browser validation remains required in a working browser environment.
- All six release-age policy tests pass. Root production audit reports zero vulnerabilities. The full root audit
  still reports one high and six moderate development-tool findings across Vitest/Cloudflare tooling and their
  dependencies; this narrow compatibility repair does not remediate or waive them.

The root lint/type gates are now green. Full release approval remains blocked by the browser-dependent checks,
development-tool audit findings and the previously unverified Lighthouse/target-device requirements. This slice
changes development tooling, tests and documentation only; no Linkmap runtime, format, privacy or network policy changes.

## Development-tool audit remediation — 2026-11-14

Built on merged PR #8 (`f8c090c`). Three existing root development dependencies are updated, without adding direct
dependencies or changing the standalone Linkmap manifest/lockfile:

| Package | Before | After | Publication of selected version |
| --- | --- | --- | --- |
| `vitest` | 5.0.3 | 5.0.5 | 2026-10-15 |
| `@vitest/browser-playwright` | 5.0.3 | 5.0.5 | 2026-10-15 |
| `wrangler` | 4.149.0 | 4.156.0 | 2026-10-29 |

The refreshed root graph uses `miniflare@5.20261023.3-beta` and `undici@7.30.1`; all Vitest components align at 5.0.5.
The root full audit falls from one high/six moderate findings to zero. Linkmap's separate full audit still reports
nine moderate findings through its unchanged ESLint/typescript-eslint/minimatch graph. Both production-only audits
report zero vulnerabilities. These are the npm audit results at preparation time, not a waiver of future findings.

The remaining lint-tool remediation is blocked: `eslint@10.15.0` was published on 2026-11-13 at 21:33:34.115 UTC and
becomes eligible under the repository policy at 2026-11-20T21:33:34.115Z (22:33:34.115 CET). Its older eligible versions
still require minimatch 10.x. The latest observed `@typescript-eslint/typescript-estree@8.72.2` also requires
`minimatch: ^10.2.2`; it does not yet select the fixed 11.x line. Although minimatch 11.0.5 itself is old enough,
forcing it would override those declared major-version ranges. No such override, downgrade or policy exception is
introduced. Recheck compatible upstream fixes and exact release timestamps before changing that graph.

- Release-age gate before installation: all 439 distinct locked versions pass; all six policy tests pass.
- Root lint (including 36 tests), full typecheck/Worker type generation and site build/budgets pass.
- Full root unit run with one worker: 1,267 pass and one fail out of 1,268. The remaining card-rendering case cannot
  find the pinned Headless Shell executable and stops before its product assertions; no test exclusions were added.
- Linkmap check passes all 91 tests, TypeScript, ESLint and formatting; build/budgets remain approximately
  89.9 KiB initial JavaScript and 14.1 KiB CSS gzip.
- Browser-dependent validation remains blocked as described above; no new browser, visual or Lighthouse pass is claimed.

No application source, codecs, crypto, CSP, runtime hosts or storage behavior changes. Dependency documentation is
regenerated. No site is published. Full release approval still needs browser/device checks and compatible lint-tool fixes.

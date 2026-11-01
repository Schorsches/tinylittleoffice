# Kartenatelier design QA

Selected visual source: direction 1, “Kartenatelier”, selected by the user with `1`.
Source image: `design-evidence/reference.png` (original generated-image result
`exec-36f27dd6-5fe6-48dd-878e-c554078d0945`). This is the only visual direction used.

## Capture and comparison

- Desktop source and implementation: 1487 × 1058 CSS pixels, capture density 1×.
- Matched state: German, light theme, “Kultur am Rhein”, five example features, first place selected, opening hours collapsed.
- Live implementation: `design-evidence/desktop.png`; full side-by-side: `design-evidence/comparison.png`.
- Focused comparisons: `design-evidence/header-comparison.png`, `design-evidence/inspector-comparison.png`.
- Responsive evidence: `mobile-editor.png` and `mobile-list.png`, 390 × 844 at 1×.
- Visitor evidence: `visitor.png`, same desktop viewport, preview mode with no editor drawing controls.
- The selected source and current rendered screenshot were opened, then their combined comparison and inspector crop
  were inspected. Screenshots show genuine MapLibre rendering with live OpenFreeMap, not a map-image replacement.

The user explicitly authorized local Chromium/Playwright in the earlier design review. It is used with software
WebGL for actual map capture and production-CSP interaction tests. The cloud browser was also opened for the local
preview, but its environment has no WebGL2 (`GPUInitializationError`). Its map rendering is blocked; it is not the
basis for a map-rendering pass. The application displays a friendly WebGL support message there.

## Findings and fixes

| Priority | Finding                                                                         | Resolution                                                                                        |
| -------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| P1       | Demo selected during asynchronous map loading initially retained the world view | Apply the current document view at map load; recapture confirms Germersheim and all five features |
| P1       | Sharing from visitor mode could duplicate the viewer prefix                     | Preserve an existing prefix; browser test opens the resulting visitor v2 link in a new page       |
| P2       | Mobile preview icon lost its accessible name when its text was hidden           | Explicit localized aria-label; desktop and mobile dark German axe checks pass                     |
| P2       | Metadata editor could remount during each category edit                         | Stable feature selection key; browser test types and reloads full metadata                        |
| P2       | Touch drawing needed an explicit completion action                              | Visible Done/Cancel controls; mobile line completed using Done in browser test                    |
| P2       | Inspector typography and spacing were smaller than the selected source          | Increased form type to 16 px and adjusted header/label spacing; compared again                    |
| P2       | Native export omitted the saved start view                                      | Export and validate native view metadata; full-document GeoJSON roundtrip test                    |
| P3       | Font metrics and Phosphor icon details differ slightly from generated source    | Retain locally hosted IBM Plex Sans and consistent licensed icons                                 |
| P3       | Actual map labels, geometry position and scale differ from illustrative source  | Real data and real coordinates retained; no baked map artwork                                     |

The 82 px header, 306 px outline, 362 px inspector, green action color, divided content groups, white surfaces,
compact floating toolbar and contextual form match the chosen composition. Additional functional color and exact
coordinate controls scroll within the inspector. Mobile adapts to a map/list switch and scrollable detail sheet;
it does not squeeze three desktop columns into a phone viewport. No P0/P1/P2 issue remains in the tested scope.

## Primary interaction and accessibility checks

Production build with CSP: points, lines and polygons; pointer and keyboard alternatives; touch-visible Done;
undo/redo; title/name edits; metadata reload through v2; visitor category filter; shared snapshot opened in a second
page; password protection and incorrect-password recovery; GPX import; encrypted local save/forget; opt-in offline
shell; old golden v1 link; malformed-link recovery; desktop and mobile dark German axe A/AA checks.

The shared request guard checks unexpected hosts, request bodies, fragment-bearing requests/referrers, page errors
and console errors. Only the local app origin and OpenFreeMap are contacted. Captures report no page/console errors.
Automated accessibility results apply to the tested screens and do not constitute a full WCAG conformance claim.

## Scope

Opening hours are descriptive text, without automatic “open now”. Local filters do not geocode addresses. The CSV
template and native extended GeoJSON are implemented; the richer future normalized import schema and AI transformation
workflow remain follow-up work. Viewer mode is a presentation mode, not a permission boundary. OpenFreeMap receives
IP/tile requests as disclosed. No account, backend, telemetry or new remote origin was introduced.

Verification: 49 unit/component tests in 15 files pass, all 9 production browser tests pass, and the final typography
change passes the repeated desktop/mobile axe test. Typecheck, ESLint, Prettier and production size budgets pass
(89.1 KiB initial JS, approximately 14.1 KiB total CSS gzip).

final result: passed

# Prompt 05: Share dialog, link meter, simplify

Read first: AGENTS.md, docs/PRD.md §Live link and §Share, docs/SECURITY.md T10, docs/ACCEPTANCE.md (05).

## Files

- `src/ui/LinkMeter.tsx`: the current full URL length with states ok (< `URL_SOFT_LIMIT`), long (< `URL_HARD_WARN`)
  and too long. Text, not colour alone, says what the state means ("Some apps may cut links this long").
- `src/ui/ShareDialog.tsx`: a native `<dialog>` with a focus trap and Esc to close. It contains: the read-only link
  field, **Copy link** (`navigator.clipboard.writeText`; on failure, select the text and show "Press Ctrl/Cmd+C"),
  **Share…** (`navigator.share` only if available), a **QR code**, and the sentence "Anyone with this link can see this
  map. Nothing is stored on a server." plus a "Protect with a password" button (opens phase 06's dialog; until then, disabled).
- QR code: **new dependency allowed**: `qrcode-generator@2.0.4`. Render with `createDataURL(4, 8)` into an `<img alt>`.
  Never use `createSvgTag`/`createImgTag` with innerHTML. Hide the QR code when the link exceeds 2,900 characters (the QR
  capacity) and say why.
- `src/map/simplify.ts`: Douglas–Peucker on lines and polygon rings in metres (equirectangular projection around each
  feature's latitude), never reducing a line below 2 or a polygon below 3 points. Make it pure and unit-test it.
- `src/ui/SimplifyPanel.tsx`: a tolerance slider (1–100 m) that previews the new link length and vertex count, with
  Apply (one undo entry) and Cancel.

## Constraints

The share dialog never sends the link anywhere. No URL shorteners (v2).

## Done when

docs/ACCEPTANCE.md 05 is met.

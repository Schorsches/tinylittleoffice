# Prompt 06: Password-protected maps

Read first: AGENTS.md rule 7, docs/FORMAT.md §Sealed payload, docs/SECURITY.md T6/T7, docs/ACCEPTANCE.md (06).

## Goal

Optional end-to-end protection: the link alone reveals nothing without the password.

## Files

- Store: `locker: Locker | null` (already declared). Add the actions `protect(password)` (uses `newLocker`),
  `unprotect()`, `unlock(password)` (uses `openSealed`, sets doc and locker) and `lock()` (drops the locker and doc,
  back to needs-password).
- `src/state/link.ts`: when `locker` is set, encode with `encodeSealed(doc, locker)` (async; drop stale results if a
  newer edit arrived meanwhile).
- `src/ui/PasswordDialog.tsx`: set or change a password (entered twice), with a strength hint computed locally (length
  and word count; no library, no network) that recommends 4+ random words.
- `src/ui/UnlockScreen.tsx`: the password field (`autocomplete="current-password"`), and a busy state while PBKDF2 runs
  (about 0.5 s). For `LinkError` code `password`, show "Wrong password or damaged link". Rate-limit to one attempt
  per second in the UI.
- Show a lock indicator in the header while protected.
- Tests: store and link unit tests with a low iteration count passed through (see `src/format/tests/seal.test.ts`).
  Production code always uses the default iterations.

## Constraints

Never put the password or key in storage, the URL, logs, errors, React DevTools-visible props of persisted
components, or `console`. Don't implement any crypto yourself; use `src/format` only.

## Done when

docs/ACCEPTANCE.md 06 is met.

# Saved-map recovery

Saved maps remain opt-in and local in IndexedDB (`linkmap` / `saved`). This change adds a defensive read model;
it does not migrate, delete or repair records automatically. Reading the list never rewrites stored values.

## Stored data and displayed rows

Normal records keep their existing `{ id, title, payload, savedAt }` shape. The settings entry stays separate.
`list()` now returns internal UI rows with the actual IndexedDB `key`, a bounded string title, an optional usable
payload envelope and an optional timestamp. Stored `id` fields are not trusted for rename/delete actions: a mismatched
ID must not target another saved map. The actual key is preserved, including non-string IndexedDB keys.

| Stored field                                                    | Read behavior                                                                         |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `title` is a string                                             | Display up to 400 characters as React text; preserve the stored value                 |
| Missing or non-string title                                     | Display the existing Untitled map label                                               |
| Finite, valid numeric timestamp                                 | Display the localized date/time and sort newest first                                 |
| Missing, non-numeric or invalid timestamp                       | Omit the date; sort after dated entries                                               |
| Bounded payload with a recognized v1/v2 envelope and alphabet   | Allow Open; normal link decoding/password handling follows                            |
| Missing, wrongly typed, malformed-envelope or oversized payload | Show the existing damaged-link message; disable Open/Rename and keep Delete available |
| Null/array/other malformed record                               | Keep a removable row rather than losing access to the rest of the list                |

The envelope check limits payload strings to 1,400,000 characters and accepts the existing `r`, `z`, `E`, `2r`, `2z`,
and `2E` forms. It does not decrypt protected maps or prove that every byte is valid. Damaged content inside an
otherwise plausible envelope, including exact codec byte-limit violations, is handled by the normal link-opening recovery screen. Listing maps never needs a
password and does not add network requests or persistence.

## Recovery workflow

If a row has usable map content but damaged metadata, open it and use Save on this device to create a fresh record.
Check the new record before deleting the old one. If the payload envelope is unusable, delete only that row; other
saved maps and the language setting remain available. Forget everything remains a separate explicit action.
Rename rereads and checks the target record before writing, preserves its other stored fields, and rejects missing
or unusable targets. The settings record cannot be renamed through this operation. No record is discarded merely
because its metadata is invalid. Existing encrypted data and normal records require no migration.

## Verification

Regression tests cover invalid title/date fields, null values, non-string storage keys, oversized/malformed payloads,
stored-ID collisions, individual removal while retaining a valid map/settings, rename rejection, literal rendering of
HTML-looking titles and UI recovery controls. The existing production save flow also seeds a damaged record and
checks that deleting it preserves the valid map and language setting. That browser flow still needs execution in a
browser-capable environment; unit/component evidence does not claim a browser or visual pass.

# Link format v1 (frozen)

The reference implementation is `src/format/` and its tests are the specification's gate. This page and that code
change together. Once a format version is released, its bytes never change, because old links must open forever.

## URL

```
https://<host>/#/v1/<payload>
payload := flag  base64url(bytes)        with "+" inserted every 300 characters
flag    := "z"  deflate-raw (RFC 1951) of the binary document
         | "r"  the binary document itself (wins for tiny maps)
         | "E"  sealed: password-encrypted, see below
         | "y"  RESERVED (future: deflate with a preset dictionary). Rejected by v1 readers.
```

The encoder picks the shorter of `z` and `r`. An empty fragment (`""` or `"#"`) is an empty map. A fragment not
starting with `#/v1/` is not a map (`payloadOf` returns `null`), so `#about` can be used for in-app routes.

**base64url variant**: RFC 4648 §5 alphabet with `~` in place of `-` for value 62, no padding. A hyphen is a
line-break opportunity (UAX #14) in mail and chat clients, which cut links there. `~` is unreserved and never breaks.
Readers also accept `-` as 62 and skip `+` and `%2B`. The `+` breaks exist because iMessage and Signal stop
linkifying after about 301 unbroken word characters.

## Binary document (format byte 1)

All integers are **LEB128 unsigned varints** (`uvar`, canonical: no trailing zero bytes, ≤ 8 bytes) or
**zigzag varints** (`svar`: n ≥ 0 → 2n, n < 0 → −2n−1). Strings are `uvar byteLength` followed by UTF-8 bytes
(decoded with `fatal: true`).

```
u8    format            = 1
str   title             ≤ 400 bytes
svar  center.lng × 1e5
svar  center.lat × 1e5
uvar  zoom × 100        0 … 2400
uvar  bearing           0 … 359 (integer degrees)
uvar  pitch             0 … 85  (integer degrees)
uvar  featureCount      ≤ 5,000
featureCount × {
  u8    header          bits 0-1 kind (0 point, 1 line, 2 polygon, 3 reserved → error)
                        bits 2-4 color (palette index 0-7)
                        bit  5   has name
                        bit  6   has note
                        bit  7   reserved, must be 0
  uvar  n               ONLY for line (n ≥ 2) and polygon (n ≥ 3); a point has n = 1 implicitly
  n × { svar dLng, svar dLat }     delta from the previous coordinate, the first from the view center
  str   name            if bit 5, ≤ 400 bytes
  str   note            if bit 6, ≤ 4,000 bytes
}
(end of data: any trailing byte is an error)
```

- Coordinates are integers of 1e-5° (≈ 1.1 m). Deltas continue across features, so nearby features cost few bytes.
- Polygons store the outer ring **unclosed** (the first coordinate is not repeated). Holes are not supported in v1.
- Total coordinates ≤ 200,000. Every decoded coordinate must satisfy |lng| ≤ 180 and |lat| ≤ 90.
- The palette is `PALETTE` in `src/format/model.ts`. An index is stored, never a colour string, so links stay
  small and no CSS injection is possible.

## Sealed payload (flag `E`)

```
"E" base64url( 0x01 | salt[16] | iv[12] | AES-256-GCM(key, iv, aad="linkmap/seal/1", plaintext) )
plaintext := flagByte ("z" or "r") | packed bytes
key       := PBKDF2-HMAC-SHA-256(password.normalize("NFKC"), salt, 600,000 iterations) → 256-bit AES-GCM key
```

`0x01` is the crypto-parameter version. A wrong password and a tampered link both fail GCM authentication, and the
UI must report them the same way. Each re-encryption uses a fresh random IV with the session's key and salt.

## Decoder limits (hostile input)

| Limit                       | Value                                                   |
| --------------------------- | ------------------------------------------------------- |
| Packed payload after base64 | 1 MiB                                                   |
| Inflated document           | 2 MiB (streamed and aborted beyond that: zip-bomb safe) |
| Features / coordinates      | 5,000 / 200,000                                         |
| Title / name / note         | 400 / 400 / 4,000 UTF-8 bytes                           |

Every failure throws `LinkError` with a `code`. The UI maps codes to friendly messages and never shows `message`.

## Golden vector

The map `LISBON` in `src/format/tests/fixtures.ts` encodes to:

```
rARJTYXR1cmRheSBpbiBMaXNib26TyG_M19gDxgoAAARgqgmFERNQcmHDp2EgZG8gQ29tw6lyY2lvDlN0YXJ0IGF0IDEwOjAwLMsX8gMIUGFzdMOpaXMlBMwX8QP5BLYB3wigAfEJnAEEV2Fsa0oExhHXAZADAAC_Ao8DAAZNYXJrZXQ
```

If this changes, the format has been broken.

## Changing the format

1. Add a new format byte (2) in `binary.ts` and keep the reader for 1.
2. Writers emit the newest version, and readers accept all versions.
3. Add a golden vector per version and an ADR in `docs/DECISIONS.md`.

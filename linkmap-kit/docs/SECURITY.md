# Security and privacy

This follows the same model as Tiny Little Office: the document is in the link, and nothing is on a server.

## Assets

1. **The map content** (places, notes, title). It may reveal where someone lives, meets or travels.
2. **The password** of a sealed map, and its derived key.
3. **The user's device integrity** (no XSS, no crash from a hostile link).

## Trust boundaries and threats

| #   | Threat                                                                          | Mitigation                                                                                                                                                               | Enforced by                                                                                       |
| --- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| T1  | Map content reaches a server (logs, analytics, referrer)                        | Content only in the URL **fragment**, which browsers never send. No analytics. `Referrer-Policy: no-referrer` plus `<meta name="referrer">`. No query strings with data. | `AGENTS.md` rule 1, ESLint network ban, e2e "never reaches any server"                            |
| T2  | Third-party requests leak usage                                                 | Only `tiles.openfreemap.org` is contacted. It sees IP and viewed tiles, never content. Disclosed in the UI.                                                              | `src/net/allowlist.ts` → CSP `connect-src`/`img-src`, MapLibre `transformRequest`, e2e host check |
| T3  | XSS through names/notes/titles in a crafted link                                | React text rendering only. No HTML sinks. A strict CSP with no inline script or eval.                                                                                    | ESLint `no-restricted-*`, CSP `script-src 'self'`                                                 |
| T4  | Hostile link freezes or crashes the tab (zip bomb, huge counts, deep recursion) | Streaming inflate with a 2 MiB cap, count limits checked before allocation, no recursion, no `JSON.parse` of untrusted data in the hot path                              | `src/format/limits.ts`, fuzz tests in `link.test.ts`                                              |
| T5  | Clickjacking / embedding                                                        | `frame-ancestors 'none'`, `X-Frame-Options: DENY`                                                                                                                        | `dist/_headers`                                                                                   |
| T6  | Password brute force on a leaked sealed link                                    | PBKDF2-SHA-256 with 600k iterations and a random 16-byte salt. The UI recommends a passphrase of 4+ words and shows a strength hint                                      | `src/format/seal.ts`                                                                              |
| T7  | Password or key persisted or leaked                                             | Kept in memory only (`Locker` in the store). Never in IndexedDB, logs or the URL. Cleared on "Lock" and tab close                                                        | `AGENTS.md` rule 7, code review                                                                   |
| T8  | Supply chain (malicious package)                                                | Exact pins, lockfile, `ignore-scripts=true`, `npm audit` in CI, Dependabot, minimal dependency set                                                                       | `.npmrc`, CI                                                                                      |
| T9  | Local data seen by another person on the device                                 | Nothing stored unless Save. "Forget everything" clears IndexedDB and caches. Guidance on private browsing.                                                               | `src/storage/`                                                                                    |
| T10 | Link shared too widely                                                          | The share dialog says "Anyone with this link can see this map" and offers a password                                                                                     | UI copy                                                                                           |
| T11 | Opening external links from notes                                               | Notes are plain text and URLs are not auto-linked in v1. Any future link uses `<ExternalLink>` with `rel="noopener noreferrer"`                                          | ESLint                                                                                            |
| T12 | Geolocation privacy                                                             | Only on explicit button press. Never written to the link automatically. `Permissions-Policy: geolocation=(self)`                                                         | UI, headers                                                                                       |

## What the server and others can see

- **Static host**: IP, user agent, and requests for app files. It never sees the fragment.
- **OpenFreeMap**: IP and which tiles are loaded, which reveals the approximate area being looked at. No referrer.
- **Anyone with the link**: the whole map, unless it's sealed.
- **Browser history and sync**: the full link. Users who need to avoid that should use private browsing or a password.

## CSP (generated, `src/net/csp.ts`)

```
default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data: blob: https://tiles.openfreemap.org;
font-src 'self'; connect-src 'self' https://tiles.openfreemap.org; worker-src 'self'; manifest-src 'self';
object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests
```

If a feature fails under this policy, fix the feature:

- Inline `<style>` from a library: import its CSS file instead.
- A Blob worker: give a same-origin worker URL.
- A QR code library that uses canvas `toDataURL` is fine (`img-src data:`), but one that injects HTML is not.
- Service worker (phase 7): uses `worker-src 'self'`. It must not cache tile responses beyond the browser's HTTP
  cache rules, and it never caches URLs with fragments (fragments aren't sent anyway).

## Security checklist per pull request

- [ ] No new remote origin, or there's an ADR and an allow-list entry.
- [ ] No new HTML sink, `eval`, `new Function`, inline script or style.
- [ ] Untrusted input (link, imported file) is validated with limits before use.
- [ ] No map content, password or payload in logs, errors, storage (except explicit Save) or network.
- [ ] New dependency: exact version, no install script, license MIT/BSD/ISC/Apache-2.0, size justified.
- [ ] `npm run check` is green, and the e2e host and leak tests are green.

## Reporting

Report vulnerabilities privately (GitHub Security Advisories on the repository), never in a public issue.

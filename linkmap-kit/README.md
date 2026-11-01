# Linkmap

Create a map, add places, lines and areas, and share one link. The document is compressed into the URL fragment.
No account, backend, API key, cookies or analytics are required. Built with React, MapLibre GL JS, Terra Draw and
OpenFreeMap Liberty. English and German, light and dark themes, mobile layout and keyboard controls are included.

## Use

- Choose Point, Line or Area and click the map. Enter finishes a shape; Escape cancels. Shortcuts: V/P/L/A.
- Select a feature to change its name, note or colour. Drag it or its vertices. Exact coordinates can also be edited
  in the details panel; “Add at map centre” provides a keyboard alternative to pointer drawing.
- Undo/redo: Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z. Pan and zoom do not add undo steps.
- Share opens a copyable link and a locally generated QR code. Protect with a password before sharing sensitive maps.
  Keep that password separately; there is no reset service. Changing a password does not revoke already shared links.
- Import GeoJSON or GPX locally, then replace the map or add the imported features. Export GeoJSON, GPX or KML.
  GPX omits areas; polygon holes and unsupported GeoJSON geometry types are reported on import.
- Simplify previews a smaller vertex count and link before applying a change that can be undone.
- Saved maps → Save on this device writes to IndexedDB. Saved maps can be opened, renamed or deleted.
  Encrypted maps are saved as ciphertext, with a generic title; passwords and keys are never saved.
- Saved maps → Enable offline app installs an app-shell service worker only after this explicit opt-in.
  Map tiles are not precached and require an internet connection. “Forget everything” clears saved maps and app caches.

Whoever has an unprotected link has the complete map. The link is a snapshot: later edits do not change links you
already sent. Large links may be cut by messaging apps; the length indicator warns at 2,048 and 8,000 characters.
No short-link service is used.

## Privacy

The static host sees requests for app files, your IP address and browser information. It does not receive the URL
fragment. OpenFreeMap receives your IP and tile requests, revealing the approximate area you view. Neither receives
feature names, notes, imported files, map payloads or passwords. Referrers are suppressed. Geolocation runs only when
“My location” is pressed; that camera jump does not update the link. A later manual map movement updates the camera.

Your browser history, browser sync, clipboard or another app you choose to share with may retain the complete link.
Use private browsing and password protection where appropriate. No local database or service-worker cache is created
before an explicit save/open-saved/offline action. Language changes remain in memory; Save also records the language.

## Development

Node 22 or later (CI uses 24).

```sh
cd linkmap-kit # when working in Schorsches/tinylittleoffice
npm ci --ignore-scripts
npm run dev
npm run check      # types, security lint, formatting, unit and component tests
npm run build      # production CSP, security headers, offline worker and size checks
npm run test:e2e   # real Chromium, real OpenFreeMap; production build
```

Install Chromium once with `npx playwright install chromium`. `CHROMIUM_PATH` can select an existing browser;
`LINKMAP_PROXY` optionally configures the test browser's proxy. These options affect tests only.
The initial app JavaScript budget is 90 KiB gzip; MapLibre, Terra Draw, import/export, saved maps and QR code UI load
separately. CSS including MapLibre is limited to 15 KiB gzip.

The frozen `src/format/` reference codec, crypto, allow-list and production CSP remain unchanged. See `AGENTS.md`,
`docs/FORMAT.md`, `docs/SECURITY.md` and `docs/IMPLEMENTATION.md`. The original implementation prompts remain as design
history. Development mode does not enforce production CSP; use build + preview for security verification.

## Static hosting

Build output is the self-contained `dist/` directory. No environment secrets or backend are required.

- **Cloudflare Pages:** root directory `linkmap-kit` in this repository, build `npm run build`, output `dist`.
  If extracted into its own repository, leave root directory empty. The generated `_headers` applies security headers.
- **Netlify:** base directory `linkmap-kit`, build `npm run build`, publish `dist`. `_headers` is generated automatically.
- **GitHub Pages:** set `LINKMAP_BASE=/tinylittleoffice/` (or the actual Pages subpath) at build time, then upload
  `dist` with your Pages deployment workflow. The manifest, worker and assets support this base path. Pages applies
  only the CSP meta tag, **not** `_headers`; frame-ancestors, HSTS and other response headers need a configurable host.
- **nginx/other hosts:** serve `dist` over HTTPS. Translate `dist/_headers` into your host's response-header syntax.
  Serve `sw.js` and `index.html` with revalidation so updates become available. No SPA rewrite is required for fragment links.

No deployment is performed by this repository's Linkmap CI job. The app can also be copied into a separate repository,
including its own `.github`, `.npmrc`, lockfile and documentation.

## Licence and attribution

MIT. Background map: © OpenFreeMap, © OpenMapTiles, data © OpenStreetMap contributors (ODbL). Attribution remains
visible in MapLibre's control. Report security issues privately through GitHub Security Advisories.

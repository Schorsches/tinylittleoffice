# Product requirements: Linkmap v1

## One sentence

Make a map with pins, routes and areas, then share it as a link. No sign-up, no server keeps it, and the link is the map.

## Users and jobs

| User                         | Job                                                                               |
| ---------------------------- | --------------------------------------------------------------------------------- |
| Friend planning a day out    | Drop five pins with notes and send the link in a chat.                            |
| Neighbourhood organiser      | Draw the area of a street fair and the route of a parade, then print or share it. |
| Hiker                        | Import a GPX track, add water stops, and share the link without an account.       |
| Privacy-conscious journalist | Share a map with a password so the link alone reveals nothing.                    |
| AI agent / developer         | Produce a link from GeoJSON (`encodeMap`) with no API key.                        |

## Principles

1. **The link is the document.** Every edit updates the address bar, and copying it copies the map.
2. **Private by default.** Nothing is stored or sent anywhere. The only third party is the tile host, and the app says so.
3. **No registration, ever.** No accounts, no email, no cookies, no tracking.
4. **Small and fast.** First load without MapLibre ≤ 90 kB gzipped JavaScript. The map loads lazily.
5. **Accessible and international.** Works by keyboard, meets WCAG 2.2 AA, supports right-to-left languages.

## Features v1 (in phase order, see prompts/)

- **View**: open a link and see the map at the saved camera, with features drawn in their colours and names as labels.
- **Create**: add a point, line or polygon by clicking or tapping, then drag vertices, delete, and pick one of 8 colours.
- **Describe**: give each feature a name (≤ 400 bytes) and a note (≤ 4,000 bytes) in a side panel, plus a map title.
- **Feature list**: a sidebar list of all features. Selecting one flies to it, and reordering is not needed.
- **Live link**: the hash updates on every change. A meter shows the link length (green < 2,048, amber < 8,000,
  red above), and **Simplify lines** reduces vertices when the link is long.
- **Undo / redo**: Ctrl/Cmd+Z, Shift+Ctrl/Cmd+Z, with buttons too.
- **Share**: Copy link (Clipboard API), the native share sheet (Web Share API) where available, and a QR code
  rendered locally. Text explains that whoever has the link has the map.
- **Password**: optionally seal the link (AES-GCM, PBKDF2). Opening a sealed link asks for the password. Re-sealing
  after edits keeps the password for the session only.
- **Import / export**: GeoJSON (import + export), GPX (import + export), KML (export). Files are read locally with
  FileReader and never uploaded.
- **Save on this device** (opt-in): a list of saved maps in IndexedDB with open, rename and delete actions, plus
  **Forget everything**.
- **My location** (opt-in button): centres the map on the user's position, writes nothing to the link, and does not
  run automatically.
- **Offline**: an installable PWA. The app shell works offline, and tiles need a connection.
- **Languages**: English and German first, with a structure ready for more (RTL-safe CSS logical properties).

## Non-goals v1

Accounts, sync, collaboration in real time, server-side storage, short links, preview cards, geocoding/search (it
would send queries to a third party), routing engines, custom tile sources, polygon holes, images in notes, Markdown or
HTML in notes, analytics of any kind.

## Later (v2 candidates)

Encrypted short links on a tiny server, where the server sees only ciphertext and the key stays in the fragment
(as in Tiny Little Office's `tinier`). Also opt-in privacy-preserving search (self-hosted Photon), a preset compression
dictionary (`y` flag), polygon holes, and measurement tools.

## Success criteria

- A 10-pin map with names opens from a link of ≤ 600 characters.
- A 300-vertex GPX track fits in under 2,048 characters after Simplify (tolerance ≈ 10 m).
- Lighthouse: Performance ≥ 90, Accessibility 100, Best Practices 100 on the production build.
- Zero requests to any host except the app and `tiles.openfreemap.org` (e2e-tested).

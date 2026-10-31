# Linkmap: implementation kit for Bolt

Linkmap is a privacy-friendly map maker. Draw pins, routes and areas on an OpenFreeMap Liberty map (MapLibre GL JS) and
share them as a link. **The link is the map**: it is compressed into the URL fragment, which browsers never send to a
server. There's no sign-up, no backend and no tracking. The design follows Tiny Little Office's security model.

This folder is a complete starting project plus the instructions a coding agent (Bolt.new, but also Claude Code,
Cursor and others) needs to build the app phase by phase.

## What's in the kit

| Path                   | What                                                                             | State                        |
| ---------------------- | -------------------------------------------------------------------------------- | ---------------------------- |
| `AGENTS.md`            | Binding rules for any coding agent                                               | ready                        |
| `.bolt/prompt`         | Bolt's project-level system prompt (short form of AGENTS.md)                     | ready                        |
| `docs/PRD.md`          | Product requirements, scope, non-goals, success criteria                         | ready                        |
| `docs/ARCHITECTURE.md` | Modules, data flow, state shape, map layers, budgets                             | ready                        |
| `docs/FORMAT.md`       | Exact link format v1 with golden vector                                          | ready                        |
| `docs/SECURITY.md`     | Threat model, CSP, privacy statement, PR checklist                               | ready                        |
| `docs/ACCEPTANCE.md`   | Definition of Done plus a checklist per phase                                    | ready                        |
| `docs/DECISIONS.md`    | ADRs (why fragment, why OpenFreeMap, why no server, …)                           | ready                        |
| `prompts/00…10`        | One Bolt prompt per phase, small and verifiable                                  | ready                        |
| `prompts/RECOVERY.md`  | Corrective prompts for when the agent drifts                                     | ready                        |
| `src/format/`          | **Finished** link codec: model, binary v1, deflate, base64url, AES-GCM seal      | done, 24 tests incl. fuzzing |
| `src/net/`             | Host allow-list, generated CSP and security headers                              | done, tested                 |
| `src/map/maplibre.ts`  | Lazy MapLibre loader (same-origin worker, request guard)                         | done                         |
| `src/App.tsx`          | Placeholder that opens a link and shows the map                                  | replaced in phase 01         |
| `eslint.config.js`     | Security and architecture guardrails (no HTML sinks, no fetch outside `net/`, …) | done                         |
| `e2e/`                 | Playwright: production CSP, no foreign hosts, no fragment leak                   | done, 3 tests                |
| `.github/`             | CI (check, build, audit, e2e) and Dependabot                                     | done                         |

The security-critical, deterministic parts (byte format, crypto, CSP, guardrails) were written by hand and tested,
so the agent doesn't generate them. The agent builds the UI and features against those fixed contracts.

## Using it with Bolt.new

1. **Make it its own repository.** Copy this folder's contents (including `.bolt/`, `.github/`, `.npmrc` and
   `.gitignore`) into a new, empty GitHub repo, e.g. `linkmap`, and push.
2. **Open it in Bolt** at `https://bolt.new/~/github.com/<you>/linkmap`, or start a Bolt project and upload the folder.
   Bolt uses `.bolt/prompt` as its project instructions. If your Bolt workspace doesn't pick it up, paste the file's
   contents into the project's knowledge or system-prompt settings.
3. **Run the prompts in order.** Paste the contents of `prompts/00-orient.md`, then `01`, `02`, … one per message.
   Use Bolt's discussion or plan mode for `00`.
4. **After each phase**:
   - Make sure Bolt ran `npm run check` and it's green. If not, use a prompt from `prompts/RECOVERY.md`.
   - Click through the app in the preview using the phase's checklist in `docs/ACCEPTANCE.md`.
   - Check the diff: no changes to `src/format/**`, `src/net/csp.ts`, `eslint.config.js` or `.github/**`.
   - Commit or sync to GitHub (Bolt's GitHub integration), so CI runs the e2e tests that Bolt can't run.
5. **Release**: after phase 10, deploy `dist/` to Cloudflare Pages or Netlify (they apply `dist/_headers`).

Tips:

- One phase per message. Large prompts make agents skip requirements.
- If a phase is too big for one go, split it: "Do only the files `src/state/*` of prompt 01 now."
- Start a fresh chat for each phase if Bolt's context gets long. AGENTS.md and the docs carry the context.
- Keep `docs/` up to date when you change a decision (add an ADR). The agent treats the docs as truth.

## Commands

```sh
npm install
npm run dev        # dev server (no CSP in dev)
npm run check      # typecheck + ESLint + Prettier + unit tests
npm run build      # production build with CSP meta and dist/_headers
npm run preview    # serve the build: CSP active
npm run test:e2e   # Playwright against the build (locally or in CI; set CHROMIUM_PATH to use an installed Chromium)
```

Node 22+.

## Verified state of the kit (2026-10-31)

- `npm run check`: typecheck, lint and format clean, with 24 unit tests passing (round-trip and stability property
  tests, 4,000 fuzz cases, zip bomb, seal).
- `npm run build`: the entry chunk is 74 kB gzipped and MapLibre is 298 kB gzipped (lazy, separate). The CSP meta and
  `_headers` are emitted.
- `npm run test:e2e`: the golden link renders in Chromium under the production CSP with zero console errors. Only
  `tiles.openfreemap.org` is contacted, and the fragment never appears in any request.

## Licence and attribution

MIT. The map is © OpenFreeMap, © OpenMapTiles, and data © OpenStreetMap contributors (ODbL). The attribution is
shown on the map and must stay visible.

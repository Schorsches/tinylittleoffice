# Prompt 10: Hardening and release

Read first: docs/SECURITY.md (checklist), docs/ACCEPTANCE.md (10), docs/PRD.md §Success criteria.

## Tasks

1. Extend `e2e/smoke.spec.ts` with flows for: draw a point, line and polygon, then reload (persists via the link);
   name a feature; copy the link; protect with a password and open it in a new page (wrong password, then right one);
   import the GPX fixture; save and forget everything. Keep the "no foreign host" and "no fragment leak" assertions in
   every test via a shared fixture. (E2E can't run inside Bolt; write the tests, and they run in CI.)
2. `scripts/budgets.mjs`: after the build, gzip-size every file in `dist/assets`, fail if the entry chunk exceeds
   90 kB or CSS exceeds 15 kB, and print a table. Add it to `npm run build`.
3. Review the whole codebase against the docs/SECURITY.md checklist and list the findings and fixes in the PR description.
4. Write `README.md` for users and self-hosters: what the app is, the privacy statement (what each party can see),
   how to deploy to Cloudflare Pages, Netlify and GitHub Pages (note: only the meta CSP applies there), and attribution.
5. Add `public/robots.txt` (allow) and `public/.well-known/security.txt` (a contact via GitHub Security Advisories).
6. Bump the version to 1.0.0 and add `CHANGELOG.md`.

## Done when

docs/ACCEPTANCE.md 10 is met, and CI (.github/workflows/ci.yml) is green on GitHub.

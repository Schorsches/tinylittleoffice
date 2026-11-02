# Repository agent instructions

Use only package versions published at least seven complete days (168 hours) before use. This applies to production,
development, optional, platform-specific and transitive npm dependencies in both the root and Linkmap lockfiles.
Verify each exact version, not the age of the package name. No exceptions or allowlists are configured. If registry
metadata is missing or unavailable, stop the installation; never assume a package is old enough.

Before installing: `node scripts/release-age.mjs`. Before changing dependencies, resolve with the seven-day cutoff
and verify both lockfiles again. Use exact direct versions for additions. Do not bypass the check for security
updates or use unpinned `npx` packages. Report a blocked security fix instead.

Read `docs/dependency-release-age.md` and the nested `linkmap-kit/AGENTS.md` when working on Linkmap.

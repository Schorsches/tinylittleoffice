# Dependency release age

Every npm version must be published for at least 168 hours before it is installed or used. The policy covers both
package-lock.json files and all production, development, optional, nested and platform packages. No exclusions are
configured. It is separate from advisory scanning: a seven-day-old package can still be vulnerable.

Before installation, from the repository root:

```sh
node --test scripts/tests/release-age.test.mjs
node scripts/release-age.mjs
npm ci
```

The checker uses only Node built-ins and registry publication timestamps, so it runs before package code is installed.
It fails closed on missing timestamps, registry errors and external package sources it cannot verify. Registry metadata
is requested only during this development/CI check; application runtime network policy is unchanged. Proxy environments
can use Node's `NODE_USE_ENV_PROXY=1` where supported. The check does not trust a cached report or a user-defined cutoff.

The root and nested .npmrc files set `min-release-age=7` for npm clients supporting that option. Older clients may ignore
it, and locked installs need independent verification; therefore every existing install job runs the lockfile checker
before npm ci. Dependabot waits seven days for ordinary version proposals in both projects. Security proposals must
also pass the same pre-install check. There is no automatic security exception.

When changing versions, select eligible exact direct releases and regenerate lockfiles with an absolute cutoff at
least seven days before the current time (`npm install --package-lock-only --ignore-scripts --before=<ISO cutoff>`).
Then run the checker, install, scan advisories, and run each affected project's tests and build. Never run an unpinned
npx package. Future additions of a lockfile or install workflow must extend this gate before installation.

The gate uses wall-clock UTC and accepts the exact 168-hour boundary. Its tests cover that boundary, missing/future
metadata, nested/development/optional/alias dependencies, invalid sources and failed metadata requests. It is repository
enforcement; making the check mandatory for merging also requires GitHub branch rules. This change does not alter those
rules or publish/deploy the application.

/** Build-time gate: all locked npm versions must have been published at least seven full days ago. */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const MINIMUM_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const lockfiles = ['package-lock.json', 'linkmap-kit/package-lock.json'];
const root = fileURLToPath(new URL('../', import.meta.url));

export function lockedPackages(lock) {
  if (![2, 3].includes(lock.lockfileVersion) || !lock.packages) throw Error('Expected a v2/v3 npm lockfile');
  return Object.entries(lock.packages).flatMap(([path, entry]) => {
    if (!path || entry.link || !path.includes('node_modules/')) return [];
    const name = entry.name ?? path.split('node_modules/').at(-1);
    if (!/^(@[a-z0-9._~-]+\/)?[a-z0-9._~-]+$/i.test(name) || typeof entry.version !== 'string') throw Error(`Invalid locked package: ${path}`);
    if (!entry.resolved?.startsWith(`https://registry.npmjs.org/${name}/-/`)) throw Error(`Unverifiable package source: ${name}@${entry.version}`);
    return [{ name, version: entry.version }];
  });
}

export function ageProblem(published, now) {
  const timestamp = typeof published === 'string' ? Date.parse(published) : NaN;
  if (!Number.isFinite(timestamp) || timestamp < 0) return 'missing or invalid publication timestamp';
  if (timestamp > now) return 'publication timestamp is in the future';
  if (now - timestamp < MINIMUM_AGE_MS) return `eligible at ${new Date(timestamp + MINIMUM_AGE_MS).toISOString()}`;
  return null;
}

export async function audit(paths, { now = Date.now(), fetchMetadata = registryMetadata } = {}) {
  const packages = new Map();
  for (const path of paths) {
    const lock = JSON.parse(await readFile(path, 'utf8'));
    for (const pkg of lockedPackages(lock)) packages.set(`${pkg.name}@${pkg.version}`, pkg);
  }
  const byName = new Map();
  for (const pkg of packages.values()) {
    const versions = byName.get(pkg.name) ?? [];
    versions.push(pkg.version);
    byName.set(pkg.name, versions);
  }
  const queue = [...byName];
  const problems = [];
  await Promise.all(
    Array.from({ length: Math.min(6, queue.length) }, async () => {
      while (queue.length) {
        const [name, versions] = queue.shift();
        try {
          const metadata = await fetchMetadata(name);
          for (const version of versions) {
            const issue = ageProblem(metadata.time?.[version], now);
            if (issue) problems.push(`${name}@${version}: ${issue}`);
          }
        } catch {
          problems.push(`${name}: registry metadata unavailable; age cannot be verified`);
        }
      }
    }),
  );
  return { checked: packages.size, problems: problems.sort() };
}

async function registryMetadata(name) {
  const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}`, {
    headers: { accept: 'application/json' },
    redirect: 'error',
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw Error('Registry unavailable');
  return response.json();
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const result = await audit(lockfiles.map((path) => resolve(root, path)));
    console.log(JSON.stringify(result, null, 2));
    if (result.problems.length) process.exitCode = 1;
  } catch (error) {
    console.error(`Release-age check failed: ${error.message}`);
    process.exitCode = 1;
  }
}

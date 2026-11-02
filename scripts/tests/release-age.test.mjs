import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MINIMUM_AGE_MS, ageProblem, lockedPackages, audit } from '../release-age.mjs';
const now = Date.parse('2026-11-01T12:00:00Z');
const entry = (name, version = '1.0.0') => ({ version, resolved: `https://registry.npmjs.org/${name}/-/${name.split('/').at(-1)}-${version}.tgz` });
test('requires seven complete days, including the exact boundary', () => {
  assert.equal(ageProblem(new Date(now - MINIMUM_AGE_MS).toISOString(), now), null);
  assert.match(ageProblem(new Date(now - MINIMUM_AGE_MS + 1).toISOString(), now), /eligible at/);
  assert.equal(ageProblem('2020-01-01T00:00:00Z', now), null);
});
test('fails closed for missing, invalid and future timestamps', () => {
  for (const timestamp of [undefined, null, '', 'bad', 5, '2027-01-01']) assert.ok(ageProblem(timestamp, now));
});
test('includes nested, development, optional and alias packages', () => {
  const result = lockedPackages({
    lockfileVersion: 3,
    packages: {
      '': {},
      'node_modules/a': entry('a'),
      'node_modules/a/node_modules/@scope/b': { ...entry('@scope/b'), dev: true, optional: true },
      'node_modules/alias': { ...entry('actual'), name: 'actual' },
    },
  });
  assert.deepEqual(
    result.map((p) => p.name),
    ['a', '@scope/b', 'actual'],
  );
});
test('rejects unknown lock layouts and unverifiable external sources', () => {
  assert.throws(() => lockedPackages({ lockfileVersion: 1 }));
  for (const resolved of ['file:../x', 'git+https://example.com/x', 'https://example.com/a.tgz', undefined])
    assert.throws(() => lockedPackages({ lockfileVersion: 3, packages: { 'node_modules/a': { version: '1', resolved } } }));
});
test('checks every version with one metadata request per package and fails on network errors', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'release-age-'));
  try {
    const path = join(dir, 'lock.json');
    await writeFile(
      path,
      JSON.stringify({
        lockfileVersion: 3,
        packages: {
          'node_modules/a': entry('a'),
          'node_modules/b/node_modules/a': entry('a', '2.0.0'),
          'node_modules/b': entry('b'),
        },
      }),
    );
    const calls = [];
    const result = await audit([path], {
      now,
      fetchMetadata: async (name) => {
        calls.push(name);
        if (name === 'b') throw Error('offline');
        return { time: { '1.0.0': '2020-01-01', '2.0.0': new Date(now).toISOString() } };
      },
    });
    assert.equal(result.checked, 3);
    assert.equal(result.problems.length, 2);
    assert.equal(calls.filter((n) => n === 'a').length, 1);
    assert.match(result.problems.join('\n'), /b: registry metadata unavailable/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test('every workflow npm install is preceded by the age gate', async () => {
  const { readdir, readFile } = await import('node:fs/promises');
  const directory = new URL('../../.github/workflows/', import.meta.url);
  for (const name of await readdir(directory)) {
    const lines = (await readFile(new URL(name, directory), 'utf8')).split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (/^\s+- run: npm (ci|install|update)\b/.test(lines[i])) assert.match(lines[i - 1], /run: node (\.\.\/)?scripts\/release-age\.mjs$/, `${name}:${i + 1}`);
    }
  }
});

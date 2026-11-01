import type { Page } from '@playwright/test';
import { test, expect } from './fixtures.ts';

/** Collects CSP violations and console errors; every test asserts there are none. */
function watch(page: Page) {
  const problems: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(m.text());
  });
  page.on('pageerror', (e) => problems.push(e.message));
  return problems;
}

// The golden Lisbon map (src/format/tests/link.test.ts).
const LISBON =
  '#/v1/rARJTYXR1cmRheSBpbiBMaXNib26TyG_M19gDxgoAAARgqgmFERNQcmHDp2EgZG8gQ29tw6lyY2lvDlN0YXJ0IGF0IDEwOjAwLMsX8gMIUGFzdMOpaXMlBMwX8QP5BLYB3wigAfEJnAEEV2Fsa0oExhHXAZADAAC_Ao8DAAZNYXJrZXQ';

test('opens a map link under the production CSP without violations', async ({ page }) => {
  const problems = watch(page);
  const hosts = new Set<string>();
  page.on('request', (r) => hosts.add(new URL(r.url()).host));
  await page.goto('/' + LISBON);
  await expect(page.getByLabel('Map title')).toHaveValue('Saturday in Lisbon');
  await expect(page.locator('.maplibregl-canvas')).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(problems).toEqual([]);
  // Only the app itself and OpenFreeMap are ever contacted.
  expect([...hosts].filter((h) => h !== 'localhost:4173' && h !== 'tiles.openfreemap.org')).toEqual([]);
});

test('the map document never reaches any server', async ({ page }) => {
  const leaked: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('rARJTYXR1') || (r.headers()['referer'] ?? '').includes('#')) leaked.push(r.url());
  });
  await page.goto('/' + LISBON);
  await page.waitForLoadState('networkidle');
  expect(leaked).toEqual([]);
});

test('a damaged link shows a message, not a crash', async ({ page }) => {
  const problems = watch(page);
  await page.goto('/#/v1/z!!!');
  await expect(page.getByRole('alert')).toBeVisible();
  expect(problems).toEqual([]);
});

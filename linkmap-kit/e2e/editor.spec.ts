import { test, expect, ready } from './fixtures.ts';
import { readSavedRecords, databases } from '../src/storage/tests/browser.ts';
import { emptyDoc, decodeMap, payloadOf } from '../src/format/index.ts';

test('draws points, lines and areas with mouse and reloads the live link', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  const canvas = page.locator('.maplibregl-canvas');
  const box = await canvas.boundingBox();
  expect(box).toBeTruthy();
  if (!box) return;
  await page.getByRole('button', { name: 'Point', exact: true }).click();
  await canvas.click({ position: { x: box.width * 0.4, y: box.height * 0.4 } });
  await expect(page.getByLabel('Name', { exact: true })).toBeVisible();
  await page.getByLabel('Name', { exact: true }).fill('Meeting point');
  await page.getByLabel('Name', { exact: true }).blur();
  await page.getByRole('button', { name: 'Line', exact: true }).click();
  await canvas.click({ position: { x: box.width * 0.5, y: box.height * 0.4 } });
  await canvas.click({ position: { x: box.width * 0.6, y: box.height * 0.5 } });
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Area', exact: true }).click();
  await canvas.click({ position: { x: box.width * 0.4, y: box.height * 0.6 } });
  await canvas.click({ position: { x: box.width * 0.5, y: box.height * 0.6 } });
  await canvas.click({ position: { x: box.width * 0.5, y: box.height * 0.7 } });
  await page.keyboard.press('Enter');
  await expect
    .poll(() => {
      const p = payloadOf(new URL(page.url()).hash);
      return p ? decodeMap(p).features.length : 0;
    })
    .toBe(3);
  await page.reload();
  await ready(page);
  await expect(page.getByRole('button', { name: 'Meeting point', exact: true })).toBeVisible();
});

test('share, password, import, save and forget work under production CSP', async ({ page, context }) => {
  await page.goto('/');
  await ready(page);
  await page.getByLabel('Map title').fill('My private map');
  await page.getByLabel('Map title').blur();
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('img', { name: 'QR code for this map' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Copy link' }).click();
  await expect(dialog.getByRole('status')).toHaveText(/Link copied|Ctrl\/Cmd\+C/);
  await dialog.getByRole('button', { name: 'Protect with a password' }).click();
  await page.getByLabel('Password', { exact: true }).fill('four random words example');
  await page.getByLabel('Repeat password').fill('four random words example');
  await page.getByRole('button', { name: 'Protect with a password', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect.poll(() => new URL(page.url()).hash.startsWith('#/v1/E')).toBe(true);
  const other = await context.newPage();
  await other.goto(page.url());
  await expect(other.getByRole('heading', { name: 'Unlock map' })).toBeVisible();
  await other.getByLabel('Password', { exact: true }).fill('wrong');
  await other.getByRole('button', { name: 'Unlock map', exact: true }).click();
  await expect(other.getByRole('alert')).toHaveText('Wrong password or damaged link.');
  await other.waitForTimeout(1050);
  await other.getByLabel('Password', { exact: true }).fill('four random words example');
  await other.getByRole('button', { name: 'Unlock map', exact: true }).click();
  await expect(other.getByLabel('Map title')).toHaveValue('My private map');
  await other.close();
  await page.getByRole('button', { name: 'Import file', exact: true }).click();
  await page.getByLabel('Import file').setInputFiles({
    name: 'walk.gpx',
    mimeType: 'application/gpx+xml',
    buffer: Buffer.from(
      '<gpx><wpt lat="49.2" lon="8.3"><name>Start</name></wpt><trk><trkseg><trkpt lat="49.2" lon="8.3"/><trkpt lat="49.21" lon="8.31"/></trkseg></trk></gpx>',
    ),
  });
  await page.getByRole('button', { name: 'Add to map' }).click();
  await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'File actions', exact: true }).click();
  await page.getByRole('button', { name: 'Saved maps', exact: true }).click();
  await page.getByRole('button', { name: 'Save on this device' }).click();
  await expect(page.getByRole('dialog').getByRole('status')).toContainText('Map saved on this device');
  const records = await page.evaluate(readSavedRecords);
  expect(records).toHaveLength(2);
  expect(records).toContainEqual({ language: 'en' });
  expect(JSON.stringify(records)).not.toContain('My private map');
  expect(JSON.stringify(records)).not.toContain('four random words');
  expect(JSON.stringify(records)).not.toContain('Start');
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Forget everything' }).click();
  await expect(page.locator('.saved-list li')).toHaveCount(0);
  expect(await page.evaluate(readSavedRecords)).toEqual([]);
});

test('no storage before opt-in; responsive keyboard workflow, undo and offline shell', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await ready(page);
  expect(await page.evaluate(databases)).toHaveLength(0);
  expect(await page.evaluate(() => caches.keys())).toHaveLength(0);
  await page.getByRole('button', { name: 'Point', exact: true }).click();
  await page.getByRole('button', { name: 'Add at map centre' }).click();
  await expect(page.getByLabel('Name', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect
    .poll(() => {
      const p = payloadOf(new URL(page.url()).hash);
      return p ? decodeMap(p).features : emptyDoc().features;
    })
    .toHaveLength(0);
  await page.getByRole('button', { name: 'File actions', exact: true }).click();
  await page.getByRole('button', { name: 'Saved maps', exact: true }).click();
  await page.getByRole('button', { name: 'Enable offline app' }).click();
  await expect
    .poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistrations())[0]?.active?.state))
    .toBe('activated');
  await expect.poll(() => page.evaluate(async () => (await caches.keys()).length)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.context().setOffline(true);
  await page.reload();
  await expect(page.getByLabel('Map title')).toBeVisible();
  await page.context().setOffline(false);
});

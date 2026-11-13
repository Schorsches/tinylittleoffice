import { test, expect, ready } from './fixtures.ts';
import { decodeDocument, documentPayload } from '../src/format/index.ts';

test('extended map editor, visitor filters and shared snapshot retain local place information', async ({ page, context }) => {
  await page.goto('/');
  await ready(page);
  await page.getByRole('button', { name: 'Open example map' }).click();
  await page.locator('.outline-group button').first().click();
  await page.getByLabel('Category', { exact: true }).fill('Community');
  await page.getByLabel('Address', { exact: true }).fill('My private address');
  await page.getByLabel('Address', { exact: true }).blur();
  await expect
    .poll(() => {
      const p = documentPayload(new URL(page.url()).hash);
      return p ? decodeDocument(p).features[0]?.info?.address : '';
    })
    .toBe('My private address');
  await page.reload();
  await ready(page);
  await page.locator('.outline-group button').first().click();
  await expect(page.getByLabel('Category', { exact: true })).toHaveValue('Community');
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect.poll(() => new URL(page.url()).hash.startsWith('#/view/v2/')).toBe(true);
  await page.reload();
  await ready(page);
  await expect(page.locator('.toolbar')).toHaveCount(0);
  await page.getByLabel('Category', { exact: true }).selectOption('Community');
  await expect(page.locator('.visitor-list li')).toHaveCount(1);
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  const shared = await page.getByRole('dialog').locator('textarea').inputValue();
  expect(shared).toContain('#/view/v2/');
  const other = await context.newPage();
  await other.goto(shared);
  await ready(other);
  await expect(other.locator('.toolbar')).toHaveCount(0);
  await expect(other.locator('.visitor-list')).toContainText('My private address');
  await other.close();
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Edit this copy', exact: true }).click();
  await expect.poll(() => new URL(page.url()).hash.startsWith('#/v2/')).toBe(true);
  await page.reload();
  await ready(page);
  await expect(page.locator('.toolbar')).toBeVisible();
});

test('mobile drawing can be completed with the visible Done action', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await ready(page);
  await page.getByRole('button', { name: 'Line', exact: true }).click();
  const canvas = page.locator('.maplibregl-canvas');
  await canvas.click({ position: { x: 130, y: 160 } });
  await canvas.click({ position: { x: 230, y: 220 } });
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByLabel('Name', { exact: true })).toBeVisible();
});

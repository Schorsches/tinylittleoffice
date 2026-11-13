import { test, expect, ready } from './fixtures.ts';
import { importTemplate } from '../src/io/import-guide.ts';
import { emptyDoc } from '../src/format/index.ts';
import { toGeoJson } from '../src/io/geojson.ts';
test('pasted profile is previewed locally, invalidates on edit and survives link reload', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await page.getByRole('button', { name: 'Import file', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('summary').filter({ hasText: 'Paste GeoJSON' }).click();
  await dialog.getByLabel('Paste GeoJSON').fill(importTemplate);
  await dialog.getByRole('button', { name: 'Check data' }).click();
  await expect(dialog.getByRole('region', { name: 'Import preview' })).toContainText('Example meeting point');
  await expect(page.locator('.outline-group li')).toHaveCount(0);
  const oversized = toGeoJson({
    ...emptyDoc(),
    features: Array.from({ length: 600 }, () => ({
      kind: 'point',
      coords: [[8.3, 49.2]],
      color: 0,
      name: '',
      note: 'x'.repeat(4000),
    })),
  });
  await dialog
    .getByLabel('Import file')
    .setInputFiles({ name: 'oversized.geojson', mimeType: 'application/geo+json', buffer: Buffer.from(oversized) });
  await expect(dialog.getByRole('region', { name: 'Import preview' })).toContainText('Imported features: 600');
  await dialog.getByRole('button', { name: 'Add to map' }).click();
  await expect(dialog.getByRole('alert')).toHaveText('The limit was reached. Shorten the text or simplify the map.');
  await expect(page.locator('.outline-group li')).toHaveCount(0);
  await dialog.getByLabel('Paste GeoJSON').fill('{');
  await expect(dialog.getByRole('button', { name: 'Add to map' })).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Check data' }).click();
  await expect(dialog.getByRole('alert')).toBeVisible();
  await dialog.getByLabel('Paste GeoJSON').fill(importTemplate);
  await dialog.getByRole('button', { name: 'Check data' }).click();
  await dialog.getByRole('button', { name: 'Add to map' }).click();
  await expect(page.locator('.outline-group li')).toHaveCount(3);
  await expect.poll(() => new URL(page.url()).hash.startsWith('#/v2/')).toBe(true);
  await page.reload();
  await ready(page);
  await page.getByRole('button', { name: 'Example meeting point', exact: true }).click();
  await expect(page.getByLabel('Category', { exact: true })).toHaveValue('Meeting');
  await expect(page.getByLabel('Opening hours', { exact: true })).toHaveValue('Saturday 14:00–18:00');
});

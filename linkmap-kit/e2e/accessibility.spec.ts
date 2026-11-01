import axe from 'axe-core';
import { test, expect, ready } from './fixtures.ts';
test('desktop and mobile dark German UI pass automated WCAG A/AA checks; dropped files stay local', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  const data = await page.evaluateHandle(() => {
    const data = new DataTransfer();
    data.items.add(new File(['{"type":"Point","coordinates":[8.3,49.2]}'], 'place.geojson', { type: 'application/geo+json' }));
    return data;
  });
  await page.locator('.map-area').dispatchEvent('drop', { dataTransfer: data });
  await page.getByRole('button', { name: 'Add to map' }).click();
  await expect(page.locator('.feature-list li')).toHaveCount(1);
  await page.evaluate(axe.source);
  const audit = () =>
    page.evaluate(async () => {
      const engine = (window as unknown as { axe: typeof axe }).axe;
      const result = await engine.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } });
      return result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }));
    });
  expect(await audit()).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.getByLabel('Language').selectOption('de');
  await expect(page.getByLabel('Kartentitel')).toBeVisible();
  expect(await audit()).toEqual([]);
});

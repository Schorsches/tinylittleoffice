import { test as base, expect, type Page } from '@playwright/test';
export const test = base.extend<{ privacyGuard: undefined }>({
  privacyGuard: [
    async ({ context }, use) => {
      const violations: string[] = [];
      const watch = (page: Page) => {
        page.on('request', (r) => {
          const u = new URL(r.url());
          if (['http:', 'https:'].includes(u.protocol) && !['localhost:4173', 'tiles.openfreemap.org'].includes(u.host))
            violations.push('unexpected host');
          if (u.hash || Object.values(r.headers()).some((h) => h.includes('#/v1/')) || r.postData()) violations.push('document leak');
        });
        page.on('pageerror', (error) => violations.push(error.message));
        page.on('console', (m) => {
          if (m.type() === 'error') violations.push(m.text());
        });
      };
      context.pages().forEach(watch);
      context.on('page', watch);
      await use(undefined);
      expect(violations).toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };
export async function ready(page: Page) {
  await expect(page.getByRole('status').filter({ hasText: 'Select a feature' })).toBeVisible({ timeout: 30000 });
}

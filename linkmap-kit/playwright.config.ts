import { defineConfig, devices } from '@playwright/test';

/** End-to-end tests run against the production build (CSP active). Not runnable inside Bolt's WebContainer: run locally or in CI. */
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:4173',
    ...devices['Desktop Chrome'],
    // CHROMIUM_PATH: use a preinstalled browser instead of 'npx playwright install'. Software WebGL for headless CI.
    launchOptions: {
      args: ['--enable-unsafe-swiftshader'],
      ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    },
  },
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

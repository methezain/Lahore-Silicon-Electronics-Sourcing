import { defineConfig } from '@playwright/test';

const baseURL = 'http://localhost:4321';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  snapshotPathTemplate: '{testDir}/{testFilePath}-snapshots/{arg}{-projectName}{-platform}{ext}',
  use: { baseURL },
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: '390',
      use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 },
    },
    {
      name: '1440',
      use: { viewport: { width: 1440, height: 900 } },
    },
  ],
});

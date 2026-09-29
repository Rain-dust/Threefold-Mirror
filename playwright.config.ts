import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  testMatch: '*.spec.ts',
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: 'http://127.0.0.1:4318',
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    headless: true,
    viewport: { width: 1440, height: 1100 },
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm start',
    url: 'http://127.0.0.1:4318/api/state',
    env: { PORT: '4318', MIRROR_DATA_DIR: '.local/browser-test' },
    reuseExistingServer: false,
    timeout: 30000,
  },
  reporter: 'list',
});

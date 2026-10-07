import { existsSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:8787';
if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(baseURL).hostname)) {
  throw new Error('E2E tests create temporary data. Run them against a local development server.');
}

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  retries: 0,
  reporter: 'list',
  use: {
    baseURL,
    browserName: 'chromium',
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    // Authentication input and response cookies must stay out of saved traces.
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    launchOptions: existsSync('/usr/bin/chromium') ? { executablePath: '/usr/bin/chromium' } : {},
  },
});

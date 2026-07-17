import { defineConfig, devices } from '@playwright/test';

const CLIENT_URL = process.env.E2E_CLIENT_URL || 'http://localhost:3000';
const API_URL = process.env.E2E_API_URL || process.env.VITE_API_BASE_URL || 'http://localhost:5001';

/**
 * Auth-flow smoke tests for Dinkboard.
 * Requires the API server (with MySQL) to be reachable at E2E_API_URL / PORT.
 * Default API port is 5001 on macOS when AirPlay holds 5000 — set PORT in server/.env.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  reporter: [['list']],
  use: {
    baseURL: CLIENT_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Cookies must flow to the API origin (cross-origin credentials).
    extraHTTPHeaders: {},
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    cwd: '../client',
    url: CLIENT_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      ...process.env,
      VITE_API_BASE_URL: API_URL.endsWith('/') ? API_URL : `${API_URL}/`,
    },
  },
});

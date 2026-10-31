import { defineConfig, devices } from '@playwright/test';

// 4321 belongs to `astro dev` in other trees; this build server stays apart.
const PORT = 4327;

/** process.env without pulling in @types/node for one lookup. */
const env =
  (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env ?? {};
const CI = Boolean(env.CI);

const desktop = {
  ...devices['Desktop Chrome'],
  viewport: { width: 1440, height: 900 },
};

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 2 : 0,
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop-chromium', use: desktop, testIgnore: /no-js\.spec\.ts/ },
    // Most visitors are on phones; 375 wide matches the Paper mobile design.
    {
      name: 'mobile-webkit',
      use: devices['iPhone 13 Mini'],
      testIgnore: /no-js\.spec\.ts/,
    },
    {
      name: 'no-js-chromium',
      use: { ...desktop, javaScriptEnabled: false },
      testMatch: /no-js\.spec\.ts/,
    },
  ],
  webServer: {
    // The production build, so the CSP meta, hashed scripts and image output
    // are what ships. CI builds in its own step first.
    command: `${CI ? '' : 'npm run build && '}node e2e/serve.mjs ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    // Always a fresh build: reusing whatever holds the port could test an
    // old build, or a server without the vercel.json headers.
    reuseExistingServer: false,
    timeout: 120_000,
  },
});

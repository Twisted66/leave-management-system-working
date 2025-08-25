import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Leave Management System - STAGING ENVIRONMENT
 * Tests the React SPA served through Encore.dev staging deployment
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 3 : 1, // More retries for staging due to network
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputDir: './test-results/staging-html-report' }],
    ['json', { outputFile: './test-results/staging-results.json' }],
    ['list']
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'https://staging-leave-management-system-99ki.encr.app',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',
    
    /* Global timeout for each action - increased for staging */
    actionTimeout: 15000,
    
    /* Extra HTTP headers */
    extraHTTPHeaders: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    },
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium-staging',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox-staging',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit-staging',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome-staging',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari-staging',
      use: { ...devices['iPhone 12'] },
    },
  ],

  /* No local web server - testing against staging deployment */
  
  /* Global timeout for entire test suite - increased for staging */
  globalTimeout: 60000 * 15, // 15 minutes

  /* Timeout for each individual test - increased for staging */
  timeout: 45000, // 45 seconds per test
});
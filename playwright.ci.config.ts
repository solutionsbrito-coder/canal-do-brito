import { defineConfig, devices } from "@playwright/test";

/**
 * CI-only Playwright config. Self-contained (does not depend on the Lovable
 * fixture package) so it can run in fresh GitHub Actions environments.
 *
 * Spins up the Vite dev server (with /e2e/* routes enabled) and runs the
 * E2E specs against iPhone 13 + Pixel 5 device profiles.
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.spec\.ts/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: "http://localhost:8080",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    // iOS
    { name: "iPhone 13 (WebKit)", use: { ...devices["iPhone 13"] } },
    // Android (Chromium mobile) — múltiplos perfis para cobrir resoluções e densidades
    { name: "Pixel 5 (Chromium)", use: { ...devices["Pixel 5"] } },
    { name: "Pixel 7 (Chromium)", use: { ...devices["Pixel 7"] } },
    { name: "Galaxy S9+ (Chromium)", use: { ...devices["Galaxy S9+"] } },
    { name: "Galaxy Tab S4 (Chromium)", use: { ...devices["Galaxy Tab S4"] } },
    // Desktop
    { name: "Desktop Chrome", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 8080",
    url: "http://localhost:8080",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: "list",
  timeout: 30_000,

  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "dashboard",
      use: { ...devices["Desktop Chrome"] },
      testMatch: "e2e/dashboard.spec.ts",
    },
    {
      name: "extension",
      use: {
        // Extension tests launch their own browser context in globalSetup
        ...devices["Desktop Chrome"],
      },
      testMatch: "e2e/extension.spec.ts",
    },
  ],

  webServer: {
    command: "npm run dev:web",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});

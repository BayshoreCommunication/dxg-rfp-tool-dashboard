import { defineConfig, devices } from "@playwright/test";

const dashboardPort = 3011;
const backendPort = 8011;
const dashboardOrigin = `http://127.0.0.1:${dashboardPort}`;
const backendOrigin = `http://127.0.0.1:${backendPort}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: {
    timeout: 8_000,
  },
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  use: {
    baseURL: dashboardOrigin,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "mobile-chromium",
      use: {
        ...devices["Pixel 5"],
      },
    },
  ],
  webServer: [
    {
      command: "node e2e/support/assistantBackendStub.mjs",
      port: backendPort,
      reuseExistingServer: false,
      timeout: 20_000,
    },
    {
      command: `npm run dev -- --hostname 127.0.0.1 --port ${dashboardPort}`,
      url: `${dashboardOrigin}/sign-in`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        BACKEND_URL: backendOrigin,
        NEXT_PUBLIC_API_URL: backendOrigin,
        NEXT_PUBLIC_FRONTEND_URL: dashboardOrigin,
        NEXT_PUBLIC_APP_URL: dashboardOrigin,
        NEXT_PUBLIC_AI_ASSISTANT_ENABLED: "true",
        NEXT_DIST_DIR: ".next-e2e",
        AUTH_SECRET: "assistant-e2e-auth-secret-32-characters-minimum",
        NEXTAUTH_SECRET: "assistant-e2e-auth-secret-32-characters-minimum",
        AUTH_TRUST_HOST: "true",
        BFF_SHARED_SECRET:
          "assistant-e2e-bff-shared-secret-32-characters-minimum",
        GOOGLE_CLIENT_ID: "assistant-e2e-google-client",
        GOOGLE_CLIENT_SECRET: "assistant-e2e-google-secret",
      },
    },
  ],
});

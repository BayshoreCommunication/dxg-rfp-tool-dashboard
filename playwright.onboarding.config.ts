import { defineConfig } from '@playwright/test';
import base from './playwright.config';
const production = process.env.ONBOARDING_PRODUCTION === '1';

export default defineConfig({
  ...base,
  testMatch: '**/proposal-onboarding.spec.ts',
  testIgnore: [],
  timeout: 60_000,
  webServer: (Array.isArray(base.webServer) ? base.webServer : []).map(server => ({
    ...server,
    ...(production && server.url ? {
      command: 'npm run build && npm run start -- --hostname 127.0.0.1 --port 3011',
      timeout: 180_000,
    } : {}),
    env: {
      ...server.env,
      NEXT_PUBLIC_CONVERSATIONS_ENABLED: 'true',
      ...(production && server.url ? {
        NEXT_DIST_DIR: '.next-e2e-production',
        // Chromium treats loopback as secure; match production's encrypted
        // Secure-cookie name while keeping the synthetic API on loopback.
        AUTH_URL: 'https://127.0.0.1:3011',
      } : {}),
    },
  })),
});

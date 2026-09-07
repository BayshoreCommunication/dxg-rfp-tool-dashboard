import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  testMatch: '**/proposal-onboarding.spec.ts',
  testIgnore: [],
  timeout: 60_000,
  webServer: (Array.isArray(base.webServer) ? base.webServer : []).map(server => ({
    ...server,
    env: { ...server.env, NEXT_PUBLIC_CONVERSATIONS_ENABLED: 'true' },
  })),
});

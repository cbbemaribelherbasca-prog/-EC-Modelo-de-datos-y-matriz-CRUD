import { defineConfig } from '@playwright/test';

// Contrato HTTP simulado: no utiliza cuentas, claves ni servicios reales.
export default defineConfig({
  testDir: './tests',
  outputDir: './playwright-report/remote-ui-results',
  testMatch: 'supabase.spec.js',
  use: {
    baseURL: process.env.TEST_PRODUCTION
      ? 'http://127.0.0.1:5174/Tenis-Urbano/'
      : 'http://127.0.0.1:5174/',
    headless: true,
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
  },
  webServer: {
    command: process.env.TEST_PRODUCTION
      ? 'npm run preview -- --port 5174 --strictPort --base=/Tenis-Urbano/'
      : 'npm run dev -- --port 5174 --strictPort',
    url: process.env.TEST_PRODUCTION
      ? 'http://127.0.0.1:5174/Tenis-Urbano/'
      : 'http://127.0.0.1:5174/',
    reuseExistingServer: false,
    env: {
      VITE_SUPABASE_URL: 'https://demo.supabase.test',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_fixture',
    },
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium', channel: 'msedge' } }],
});

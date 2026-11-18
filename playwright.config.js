import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',
  testIgnore: ['**/supabase.spec.js', '**/supabase.live.spec.js'],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    headless: true,
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
  },
  webServer: {
    command: process.env.TEST_PRODUCTION
      ? 'npm run preview -- --port 5173 --strictPort'
      : 'npm run dev -- --port 5173 --strictPort',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: false,
    env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_PUBLISHABLE_KEY: '' },
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium', channel: 'msedge' } }],
});

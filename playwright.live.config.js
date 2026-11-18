import { defineConfig } from '@playwright/test';
import { loadEnv } from 'vite';
import { validateSupabaseConfig } from './src/lib/supabaseConfig.js';

const values = { ...loadEnv('development', process.cwd(), 'VITE_'), ...process.env };
validateSupabaseConfig(values.VITE_SUPABASE_URL, values.VITE_SUPABASE_PUBLISHABLE_KEY);
export default defineConfig({
  testDir: './tests',
  testMatch: 'supabase.live.spec.js',
  outputDir: './playwright-report/live-results',
  timeout: 120000,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:5175/',
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
    trace: 'off',
    video: 'off',
  },
  webServer: {
    command: 'npm run dev -- --port 5175 --strictPort',
    url: 'http://127.0.0.1:5175/',
    reuseExistingServer: false,
    env: {
      VITE_SUPABASE_URL: values.VITE_SUPABASE_URL,
      VITE_SUPABASE_PUBLISHABLE_KEY: values.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
  },
  projects: [{ name: 'edge-live', use: { browserName: 'chromium', channel: 'msedge' } }],
});

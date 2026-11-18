import { defineConfig, loadEnv } from 'vite';
import { validatePublicEnvironment } from './src/lib/supabaseConfig.js';

export default defineConfig(({ command, mode }) => {
  if (command === 'build') {
    validatePublicEnvironment({
      ...loadEnv(mode, process.cwd(), 'VITE_'),
      ...process.env,
    });
  }
  return { base: './', esbuild: { jsx: 'automatic' } };
});

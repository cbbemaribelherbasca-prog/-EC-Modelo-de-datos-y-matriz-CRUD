import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  validateSupabaseConfig,
  validatePublicEnvironment,
} from '../src/lib/supabaseConfig.js';

test('public client rejects secrets and credential-bearing URLs', () => {
  assert.throws(() =>
    validateSupabaseConfig('https://demo.supabase.co', 'sb_secret_fixture')
  );
  assert.throws(() =>
    validateSupabaseConfig(
      'https://user:password@demo.supabase.co',
      'sb_publishable_fixture'
    )
  );
  const payload = Buffer.from(JSON.stringify({ role: 'service_role' })).toString(
    'base64url'
  );
  assert.throws(() =>
    validateSupabaseConfig('https://demo.supabase.co', `fixture.${payload}.fixture`)
  );
});

test('public client accepts HTTPS and local development configuration', () => {
  assert.doesNotThrow(() =>
    validateSupabaseConfig('https://demo.supabase.co', 'sb_publishable_fixture')
  );
  assert.doesNotThrow(() =>
    validateSupabaseConfig('http://127.0.0.1:54321', 'sb_publishable_fixture')
  );
  assert.throws(() =>
    validateSupabaseConfig('http://demo.supabase.co', 'sb_publishable_fixture')
  );
});

test('build validation blocks private VITE variables before producing a bundle', () => {
  assert.throws(() =>
    validatePublicEnvironment({
      VITE_SUPABASE_URL: 'https://demo.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_fixture',
    })
  );
  assert.throws(() => validatePublicEnvironment({ VITE_DATABASE_PASSWORD: 'fixture' }));
  assert.doesNotThrow(() => validatePublicEnvironment({}));
});

test('Vite actually aborts a build with a private key without logging its value', () => {
  const secret = 'sb_secret_fixture_never_publish';
  const result = spawnSync(
    process.execPath,
    ['node_modules/vite/bin/vite.js', 'build', '--mode', 'test'],
    {
      cwd: new URL('..', import.meta.url),
      env: {
        ...process.env,
        VITE_SUPABASE_URL: 'https://demo.supabase.test',
        VITE_SUPABASE_PUBLISHABLE_KEY: secret,
      },
      encoding: 'utf8',
    }
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /credencial privada/);
  assert.equal(`${result.stdout}${result.stderr}`.includes(secret), false);
});

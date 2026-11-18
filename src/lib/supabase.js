import { validateSupabaseConfig } from './supabaseConfig';
const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
export const remoteEnabled = Boolean(url || key);
let clientPromise;

export function loadSupabase() {
  if (!remoteEnabled) return Promise.resolve(null);
  try {
    validateSupabaseConfig(url, key);
  } catch (error) {
    return Promise.reject(error);
  }
  clientPromise ||= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    })
  );
  return clientPromise;
}

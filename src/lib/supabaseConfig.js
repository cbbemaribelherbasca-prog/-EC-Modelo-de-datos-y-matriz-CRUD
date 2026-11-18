export function validateSupabaseConfig(url, key) {
  try {
    const parsed = new URL(url);
    const local = ['127.0.0.1', 'localhost'].includes(parsed.hostname);
    if (
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash ||
      (parsed.protocol !== 'https:' && !(local && parsed.protocol === 'http:'))
    )
      throw new Error();
    if (!key || key.startsWith('sb_secret_')) throw new Error();
    if (!key.startsWith('sb_publishable_')) {
      const payload = JSON.parse(
        atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
      );
      if (payload.role !== 'anon') throw new Error();
    }
  } catch {
    // Nunca incorporar el valor rechazado al mensaje o a los logs.
    throw new Error(
      'Configura una URL válida y una clave publicable de Supabase. No uses claves privadas.'
    );
  }
}

export function validatePublicEnvironment(values) {
  for (const [name, value] of Object.entries(values)) {
    if (!name.startsWith('VITE_') || !value) continue;
    let privileged = false;
    try {
      privileged =
        JSON.parse(atob(value.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
          .role === 'service_role';
    } catch {
      /* No es un JWT. */
    }
    if (
      /SECRET|PASSWORD|SERVICE_ROLE|ACCESS_TOKEN|PRIVATE_KEY/i.test(name) ||
      String(value).startsWith('sb_secret_') ||
      privileged
    )
      throw new Error(
        'La compilación se bloqueó: una variable VITE_* contiene una credencial privada. Retírala de la configuración pública.'
      );
  }
  const url = values.VITE_SUPABASE_URL?.trim();
  const key = values.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (url || key) validateSupabaseConfig(url, key);
}

import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { validateSupabaseConfig } from '../src/lib/supabaseConfig.js';

// Prueba optativa REAL: crea dos usuarios anónimos y dos pedidos ficticios.
// No usa claves privadas ni imprime sesiones, UUIDs o respuestas de Auth.
const url = process.env.VITE_SUPABASE_URL?.trim();
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
const clients = [];
function check(result) {
  if (result.error)
    throw new Error(
      'La operación fue rechazada. Comprueba migraciones, permisos y Auth.'
    );
  return result.data;
}
try {
  validateSupabaseConfig(url, key);
  const makeClient = () => {
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    clients.push(client);
    return client;
  };
  const publicClient = makeClient();
  const rows = check(
    await publicClient.from('products').select('id,price').eq('is_active', true).limit(1)
  );
  assert.ok(rows.length, 'Se necesita al menos un producto activo de demostración.');
  const product = rows[0];
  const forbidden = await publicClient.from('cart_items').select('qty');
  assert.ok(forbidden.error, 'El visitante sin sesión no debe leer carritos.');
  const first = makeClient();
  const second = makeClient();
  const owner = check(await first.auth.signInAnonymously()).user.id;
  const other = check(await second.auth.signInAnonymously()).user.id;
  assert.notEqual(owner, other, 'Las sesiones deben tener propietarios distintos.');
  check(
    await first.rpc('adjust_cart_item', {
      p_product_id: product.id,
      p_size: 36,
      p_delta: 1,
    })
  );
  check(await first.from('favorites').insert({ product_id: product.id }));
  for (const delta of [1, -1])
    check(
      await first.rpc('adjust_cart_item', {
        p_product_id: product.id,
        p_size: 36,
        p_delta: delta,
      })
    );
  const imported = {
    p_favorites: [product.id],
    p_cart: [{ id: product.id, size: 36, qty: 1 }],
  };
  check(await first.rpc('import_selection', imported));
  check(await first.rpc('import_selection', imported));
  assert.equal(check(await first.from('cart_items').select('qty').single()).qty, 1);
  for (const qty of [0, -1, 11, 1.5, null])
    assert.ok(
      (await first.from('cart_items').insert({ product_id: product.id, size: 37, qty }))
        .error
    );
  assert.ok(
    (
      await first.rpc('adjust_cart_item', {
        p_product_id: product.id,
        p_size: 34,
        p_delta: 1,
      })
    ).error
  );
  assert.ok(
    (
      await first
        .from('cart_items')
        .update({ user_id: other })
        .eq('product_id', product.id)
    ).error
  );
  assert.equal(
    check(await second.from('cart_items').select('qty').eq('user_id', owner)).length,
    0
  );
  assert.equal(
    check(await second.from('favorites').select('product_id').eq('user_id', owner))
      .length,
    0
  );
  const theft = await second
    .from('cart_items')
    .insert({ user_id: owner, product_id: product.id, size: 37, qty: 1 });
  assert.ok(theft.error, 'No debe permitirse crear una fila para otro propietario.');
  const foreignUpdate = await second
    .from('cart_items')
    .update({ qty: 2 })
    .eq('user_id', owner)
    .select('qty');
  assert.equal(check(foreignUpdate).length, 0);
  assert.equal(check(await first.from('cart_items').select('qty').single()).qty, 1);
  const excess = await first.rpc('adjust_cart_item', {
    p_product_id: product.id,
    p_size: 36,
    p_delta: 10,
  });
  assert.ok(excess.error, 'El servidor debe impedir superar diez pares.');
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/La_Paz',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(tomorrow);
  const args = {
    p_request_id: crypto.randomUUID(),
    p_department: 'Cochabamba',
    p_method: 'delivery',
    p_date: date,
    p_ack: true,
  };
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/La_Paz',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  for (const invalid of [
    { p_date: today },
    { p_ack: false },
    { p_department: 'Inventado' },
  ])
    assert.ok((await first.rpc('confirm_order', { ...args, ...invalid })).error);
  const order = check(await first.rpc('confirm_order', args));
  const retry = check(await first.rpc('confirm_order', args));
  assert.equal(order.id, retry.id, 'Un reintento no debe duplicar el pedido.');
  assert.equal(
    Number(order.total),
    Number(product.price) + (Number(product.price) < 500 ? 25 : 0)
  );
  assert.equal(
    check(await second.from('orders').select('id').eq('id', order.id)).length,
    0
  );
  assert.equal(
    check(await second.from('order_items').select('size').eq('order_id', order.id))
      .length,
    0
  );
  assert.ok((await second.rpc('clear_confirmed_cart', { p_order_id: order.id })).error);
  assert.ok((await first.from('orders').update({ total: 1 }).eq('id', order.id)).error);
  assert.ok((await first.from('orders').delete().eq('id', order.id)).error);
  assert.ok(
    (await first.from('order_items').update({ qty: 2 }).eq('order_id', order.id)).error
  );
  assert.ok((await first.from('order_items').delete().eq('order_id', order.id)).error);
  check(
    await first.rpc('adjust_cart_item', {
      p_product_id: product.id,
      p_size: 36,
      p_delta: 1,
    })
  );
  assert.ok((await first.rpc('clear_confirmed_cart', { p_order_id: order.id })).error);
  const nextOrder = check(
    await first.rpc('confirm_order', { ...args, p_request_id: crypto.randomUUID() })
  );
  assert.equal(Number(nextOrder.subtotal), 2 * Number(product.price));
  assert.equal(Number(nextOrder.shipping), 2 * Number(product.price) >= 500 ? 0 : 25);
  check(await first.rpc('clear_confirmed_cart', { p_order_id: nextOrder.id }));
  check(await first.from('favorites').delete().eq('product_id', product.id));
  assert.equal(check(await first.from('cart_items').select('qty')).length, 0);
  console.log(
    'Supabase remoto: CRUD privado, aislamiento P1/P2, importación, cantidades, fecha/aceptación, totales, idempotencia y conflicto de limpieza verificados. Se conservaron dos pedidos ficticios; no se publican identificadores ni sesiones.'
  );
} catch (error) {
  console.error(
    error instanceof assert.AssertionError
      ? 'Supabase remoto: una condición de seguridad no se cumplió; revisa las políticas antes de publicar.'
      : 'Supabase remoto no verificado. Revisa la configuración pública local, la conexión, Auth y las migraciones.'
  );
  process.exitCode = 1;
} finally {
  await Promise.allSettled(
    clients.map((client) => client.auth.signOut({ scope: 'local' }))
  );
}

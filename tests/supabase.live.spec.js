import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import { loadEnv } from 'vite';
import { execFileSync } from 'node:child_process';

// Optativa y REAL: crea cuentas/pedido ficticios y un producto que queda retirado.
// El rol administrativo solo se asigna al usuario sintético creado en esta ejecución.
// No activar trace/video ni imprimir sesiones o respuestas completas de Auth.
const values = { ...loadEnv('development', process.cwd(), 'VITE_'), ...process.env };
const { createClient } = createRequire(import.meta.url)('@supabase/supabase-js');
const url = values.VITE_SUPABASE_URL;
const key = values.VITE_SUPABASE_PUBLISHABLE_KEY;
const ref = new URL(url).hostname.split('.')[0];
function check(result) {
  expect(Boolean(result.error), 'La operación remota debe completarse.').toBe(false);
  return result.data;
}
function roleForCreatedUser(id, enabled) {
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error('Identidad sintética inválida.');
  const update = enabled
    ? 'coalesce(raw_app_meta_data,\'{}\'::jsonb) || \'{"app_role":"catalog_admin"}\'::jsonb'
    : "coalesce(raw_app_meta_data,'{}'::jsonb) - 'app_role'";
  // El token CLI permanece en el almacén seguro del sistema. No se pasa al navegador.
  execFileSync(
    process.execPath,
    [
      'node_modules/supabase/dist/supabase.js',
      'db',
      'query',
      `--remote=${ref}`,
      '--yes',
      `update auth.users set raw_app_meta_data=${update} where id='${id}'::uuid`,
    ],
    { stdio: ['ignore', 'pipe', 'pipe'], timeout: 45000 }
  );
}

test('Supabase real: CRUD administrativo, compra, persistencia y aislamiento', async ({
  page,
}) => {
  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const other = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const created = check(await admin.auth.signInAnonymously()).user;
  check(await other.auth.signInAnonymously());
  let productId;
  let roleGranted = false;
  const name = `Modelo de evidencia ${crypto.randomUUID().slice(0, 8)}`;
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  try {
    roleForCreatedUser(created.id, true);
    roleGranted = true;
    const session = check(await admin.auth.refreshSession()).session;
    expect(session.user.app_metadata.app_role).toBe('catalog_admin');
    await page.addInitScript(
      ({ storageKey, session }) => {
        localStorage.setItem(storageKey, JSON.stringify(session));
      },
      { storageKey: `sb-${ref}-auth-token`, session }
    );
    await page.goto('./#/admin');
    await expect(
      page.getByRole('heading', { name: 'Nuevo producto', exact: true })
    ).toBeVisible();
    await page.locator('#product-name').fill(name);
    await page.locator('#product-color').fill('Verde');
    await page.locator('#product-price').fill('299');
    await page
      .locator('#product-description')
      .fill('Modelo ficticio para verificar el CRUD de la evaluación.');
    await page.getByRole('button', { name: 'Crear producto', exact: true }).click();
    await expect(
      page.getByRole('button', { name: `Editar ${name}`, exact: true })
    ).toBeVisible({ timeout: 15000 });
    productId = check(
      await admin.from('products').select('id').eq('name', name).single()
    ).id;
    await page.getByRole('button', { name: `Editar ${name}`, exact: true }).click();
    await page.locator('#product-price').fill('289');
    await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
    await expect(page.locator('.admin-product').filter({ hasText: name })).toContainText(
      'Bs 289'
    );
    const denied = await other
      .from('products')
      .update({ price: 1 })
      .eq('id', productId)
      .select('id');
    expect(denied.data || []).toHaveLength(0);
    expect(
      Number(
        check(await admin.from('products').select('price').eq('id', productId).single())
          .price
      )
    ).toBe(289);
    expect(
      Boolean((await admin.from('products').delete().eq('id', productId)).error)
    ).toBe(true);
    await page.evaluate(async () => {
      await document.fonts.ready;
      window.scrollTo(0, 0);
    });
    await page.screenshot({ path: 'docs/20-supabase-admin-real.png', fullPage: true });
    await page.getByRole('link', { name: 'Colección', exact: true }).click();
    await page.getByRole('searchbox', { name: 'Buscar productos' }).fill(name);
    await page
      .getByRole('link', { name: `Ver detalles de ${name}`, exact: true })
      .click();
    await page.getByRole('button', { name: '38', exact: true }).click();
    await page.getByRole('button', { name: 'Agregar al carrito', exact: true }).click();
    await expect(page.getByRole('dialog').getByRole('status')).toContainText(
      'Producto agregado',
      { timeout: 15000 }
    );
    await page.getByRole('link', { name: 'Ver carrito →' }).click();
    await page.reload();
    await expect(page.locator('.cart-line-item')).toContainText(name, { timeout: 15000 });
    await page.getByRole('button', { name: /Finalizar compra/ }).click();
    await page.getByRole('button', { name: 'Departamento', exact: true }).click();
    await page.getByRole('option', { name: /Cochabamba/ }).click();
    await page.getByRole('radio', { name: /Envío nacional/ }).check();
    await page.locator('#date').fill(await page.locator('#date').getAttribute('min'));
    await page.locator('#accepted').check();
    await page.getByRole('button', { name: /Confirmar compra/ }).click();
    await expect(page.getByRole('dialog')).toContainText('Bs 314', { timeout: 15000 });
    await page.screenshot({ path: 'docs/21-supabase-compra-real.png' });
    const order = check(
      await admin
        .from('orders')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
    );
    expect(check(await admin.from('orders').select('id'))).toHaveLength(1);
    expect(
      check(await other.from('orders').select('id').eq('id', order.id))
    ).toHaveLength(0);
    await page.getByRole('button', { name: 'Volver al catálogo', exact: true }).click();
    await expect(
      page.getByRole('link', { name: 'Carrito (0)', exact: true })
    ).toBeVisible({ timeout: 15000 });
    await page.getByRole('link', { name: 'Mis pedidos', exact: true }).click();
    await expect(page.locator('.order-record')).toContainText(name, { timeout: 15000 });
    await page.screenshot({ path: 'docs/22-supabase-pedido-real.png', fullPage: true });
    check(
      await admin.rpc('adjust_cart_item', {
        p_product_id: productId,
        p_size: 38,
        p_delta: 1,
      })
    );
    await page.getByRole('link', { name: 'Administrar', exact: true }).click();
    await page.getByRole('button', { name: `Retirar ${name}`, exact: true }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Retirar producto', exact: true })
      .click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 15000 });
    expect(
      check(await admin.from('products').select('is_active').eq('id', productId).single())
        .is_active
    ).toBe(false);
    expect(
      check(await other.from('products').select('id').eq('id', productId))
    ).toHaveLength(0);
    expect(
      Boolean(
        (
          await admin.rpc('confirm_order', {
            p_request_id: crypto.randomUUID(),
            p_department: 'Cochabamba',
            p_method: 'pickup',
            p_date: await page.evaluate(() => {
              const date = new Date();
              date.setDate(date.getDate() + 1);
              return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            }),
            p_ack: true,
          })
        ).error
      )
    ).toBe(true);
    check(
      await admin.rpc('adjust_cart_item', {
        p_product_id: productId,
        p_size: 38,
        p_delta: -1,
      })
    );
    expect(pageErrors).toEqual([]);
  } finally {
    if (productId && roleGranted)
      await admin.from('products').update({ is_active: false }).eq('id', productId);
    if (roleGranted) roleForCreatedUser(created.id, false);
    await Promise.allSettled([admin.auth.signOut(), other.auth.signOut()]);
  }
});

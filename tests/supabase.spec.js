import { test, expect } from '@playwright/test';

// Todo el tráfico se intercepta. Estas pruebas no demuestran un despliegue remoto.
async function backend(page) {
  const products = [
    {
      id: 101,
      name: 'Modelo remoto',
      audience: 'Hombre',
      style: 'Urbano',
      color: 'Azul',
      price: 350,
      old_price: null,
      image_path: 'assets/tenis-cobalto.png',
      badge: 'Nuevo',
      description: 'Producto ficticio del contrato de integración.',
      is_active: true,
    },
  ];
  let cart = [];
  let favorites = [];
  let orders = [];
  let failCart = false;
  let failConfirmation = false;
  let unavailable = false;
  let releaseConfirmation;
  let confirmationGate;
  const requests = [];
  const userId = '00000000-0000-0000-0000-000000000001';
  function session(admin, accountId = userId) {
    const user = {
      id: accountId,
      aud: 'authenticated',
      role: 'authenticated',
      is_anonymous: !admin,
      app_metadata: admin ? { app_role: 'catalog_admin' } : {},
      user_metadata: {},
      created_at: new Date().toISOString(),
    };
    const expires_at = Math.floor(Date.now() / 1000) + 3600;
    const token = `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: accountId, exp: expires_at, role: 'authenticated' })).toString('base64url')}.fixture-only`;
    return {
      access_token: token,
      refresh_token: 'fixture-only',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at,
      user,
    };
  }
  await page.route('https://demo.supabase.test/**', async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    const data =
      method === 'POST' || method === 'PATCH' ? route.request().postDataJSON() : null;
    const respond = (body, status = 200) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        headers: {
          'access-control-allow-origin': '*',
          'access-control-expose-headers': 'retry-after',
          'retry-after': '0',
        },
        body: JSON.stringify(body),
      });
    requests.push({ path: url.pathname, method, data });
    if (url.pathname.startsWith('/auth/v1/'))
      return respond(session(url.searchParams.get('grant_type') === 'password'));
    if (unavailable) return respond({ message: 'Fixture offline' }, 503);
    if (url.pathname.endsWith('/products')) {
      if (method === 'GET')
        return respond(
          products.filter((p) => !url.searchParams.has('is_active') || p.is_active)
        );
      if (method === 'POST') {
        const product = { ...data, id: 102 };
        products.push(product);
        return respond(product, 201);
      }
      if (method === 'PATCH') {
        const product = products.find(
          (p) => String(p.id) === url.searchParams.get('id')?.slice(3)
        );
        Object.assign(product, data);
        return respond(product);
      }
    }
    if (url.pathname.endsWith('/cart_items'))
      return respond(
        cart.map((item) => ({ product_id: item.id, size: item.size, qty: item.qty }))
      );
    if (url.pathname.endsWith('/favorites')) {
      if (method === 'POST') favorites.push(data.product_id);
      if (method === 'DELETE')
        favorites = favorites.filter(
          (id) => String(id) !== url.searchParams.get('product_id')?.slice(3)
        );
      return respond(
        method === 'GET' ? favorites.map((product_id) => ({ product_id })) : null
      );
    }
    if (url.pathname.endsWith('/orders')) return respond(orders);
    if (url.pathname.endsWith('/rpc/import_selection')) {
      cart = data.p_cart;
      favorites = data.p_favorites;
      return respond(null);
    }
    if (url.pathname.endsWith('/rpc/adjust_cart_item')) {
      if (failCart) {
        failCart = false;
        return respond({ message: 'Fixture network error' }, 400);
      }
      const item = cart.find(
        (item) => item.id === data.p_product_id && item.size === data.p_size
      );
      if (item) item.qty += data.p_delta;
      else cart.push({ id: data.p_product_id, size: data.p_size, qty: data.p_delta });
      cart = cart.filter((item) => item.qty > 0);
      return respond(null);
    }
    if (url.pathname.endsWith('/rpc/confirm_order')) {
      if (confirmationGate) await confirmationGate;
      let order = orders.find((order) => order.request_id === data.p_request_id);
      if (!order) {
        order = {
          id: '00000000-0000-0000-0000-000000000099',
          request_id: data.p_request_id,
          total: 375,
          department: data.p_department,
          delivery_method: data.p_method,
          preferred_date: data.p_date,
          order_items: [
            { product_name: 'Modelo remoto', size: 39, qty: 1, unit_price: 350 },
          ],
        };
        orders.push(order);
      }
      if (failConfirmation) {
        failConfirmation = false;
        return respond({ message: 'Response lost after commit (fixture)' }, 400);
      }
      return respond(order);
    }
    if (url.pathname.endsWith('/rpc/clear_confirmed_cart')) {
      cart = [];
      return respond(null);
    }
    return respond({ message: 'Unexpected fixture request' }, 404);
  });
  return {
    failNextCart: () => {
      failCart = true;
    },
    failNextConfirmation: () => {
      failConfirmation = true;
    },
    offline: () => {
      unavailable = true;
    },
    requests,
    orders,
    holdConfirmation: () => {
      confirmationGate = new Promise((resolve) => {
        releaseConfirmation = resolve;
      });
    },
    releaseConfirmation: () => releaseConfirmation(),
    switchAccount: async () => {
      const next = session(false, '00000000-0000-0000-0000-000000000002');
      await page.evaluate((value) => {
        const key = Object.keys(localStorage).find(
          (key) => key.startsWith('sb-') && key.endsWith('-auth-token')
        );
        localStorage.setItem(key, JSON.stringify(value));
        const channel = new BroadcastChannel(key);
        channel.postMessage({ event: 'SIGNED_IN', session: value });
        channel.close();
      }, next);
    },
  };
}

test('catálogo dinámico, error de escritura, persistencia y confirmación idempotente', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const remote = await backend(page);
  await page.goto('./#/catalogo');
  await expect(page.getByText('Catálogo conectado a Supabase')).toBeVisible();
  await expect(page.locator('.product-card')).toHaveCount(1);
  await page
    .getByRole('link', { name: 'Ver detalles de Modelo remoto', exact: true })
    .click();
  await page.getByRole('button', { name: '39', exact: true }).click();
  remote.failNextCart();
  await page.getByRole('button', { name: 'Agregar al carrito', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('No pudimos');
  await expect(page.getByRole('link', { name: 'Carrito (0)' })).toBeVisible();
  await page.getByRole('button', { name: 'Agregar al carrito', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('status')).toContainText(
    'Producto agregado'
  );
  await page.getByRole('link', { name: 'Ver carrito →' }).click();
  await page.reload();
  await expect(page.locator('.cart-line-item')).toHaveCount(1);
  await page.getByRole('button', { name: /Finalizar compra/ }).click();
  await page.getByRole('button', { name: 'Departamento', exact: true }).click();
  await page.getByRole('option', { name: /Cochabamba/ }).click();
  await page.getByRole('radio', { name: /Envío nacional/ }).check();
  const tomorrow = await page.locator('#date').getAttribute('min');
  await page.locator('#date').fill(tomorrow);
  await page.locator('#accepted').check();
  remote.failNextConfirmation();
  await page.getByRole('button', { name: /Confirmar compra/ }).click();
  await expect(page.locator('.checkout-form').getByRole('alert')).toContainText(
    'No pudimos'
  );
  await expect(page.getByRole('dialog')).toHaveCount(0);
  remote.holdConfirmation();
  await page.getByRole('button', { name: /Confirmar compra/ }).click();
  await page.getByRole('radio', { name: /Retiro en tienda/ }).check();
  remote.releaseConfirmation();
  await expect(page.getByRole('dialog')).toContainText('Bs 375');
  await expect(page.getByRole('dialog').locator('.confirmation-delivery')).toContainText(
    'Envío nacional'
  );
  const attempts = remote.requests.filter((request) =>
    request.path.endsWith('/rpc/confirm_order')
  );
  expect(attempts).toHaveLength(2);
  expect(attempts[0].data.p_request_id).toBe(attempts[1].data.p_request_id);
  expect(remote.orders).toHaveLength(1);
  await expect(page.getByRole('link', { name: 'Carrito (1)' })).toHaveCount(1);
  await page.getByRole('button', { name: 'Volver al catálogo', exact: true }).click();
  await expect(page).toHaveURL(/catalogo\?ver=coleccion/);
  await expect(page.getByRole('link', { name: 'Carrito (0)' })).toBeVisible();
  await page.getByRole('link', { name: 'Mis pedidos', exact: true }).click();
  await expect(page.locator('.order-record')).toContainText('Modelo remoto');
  await page.screenshot({
    path: 'docs/18-pedidos-contrato-simulado.png',
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test('un cambio de cuenta con error de red oculta selección e historial anteriores', async ({
  page,
}) => {
  const remote = await backend(page);
  await page.goto('./#/catalogo');
  await page
    .getByRole('link', { name: 'Ver detalles de Modelo remoto', exact: true })
    .click();
  await page.getByRole('button', { name: '39', exact: true }).click();
  await page.getByRole('button', { name: 'Agregar al carrito', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('status')).toContainText(
    'Producto agregado'
  );
  await page.getByRole('button', { name: 'Cerrar detalles', exact: true }).click();
  remote.orders.push({
    id: 'fixture',
    total: 350,
    department: 'Cochabamba',
    delivery_method: 'pickup',
    preferred_date: '2030-01-01',
    order_items: [
      { product_name: 'Pedido privado de A', size: 39, qty: 1, unit_price: 350 },
    ],
  });
  await page.getByRole('link', { name: 'Mis pedidos', exact: true }).click();
  await expect(page.locator('.order-record')).toContainText('Pedido privado de A');
  remote.offline();
  await remote.switchAccount();
  await expect(
    page.getByRole('link', { name: 'Carrito (0)', exact: true })
  ).toBeVisible();
  await expect(page.locator('.order-record')).toHaveCount(0);
});

test('administrador crea, actualiza y retira un producto; colección muestra los cambios', async ({
  page,
}) => {
  await backend(page);
  await page.goto('./#/admin');
  await expect(
    page.getByRole('heading', { name: 'Acceso de administración' })
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Crear producto', exact: true })
  ).toHaveCount(0);
  // Datos ficticios reservados; nunca usar credenciales reales en evidencia.
  await page.locator('#admin-email').fill('fixture@example.invalid');
  await page.locator('#admin-password').fill('fixture-only');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Nuevo producto', exact: true })
  ).toBeVisible();
  await page.getByRole('button', { name: 'Crear producto', exact: true }).click();
  await expect(page.locator('.form-error-summary')).toBeFocused();
  await page.locator('#product-name').fill('Modelo creado');
  await page.locator('#product-color').fill('Verde');
  await page.locator('#product-price').fill('299');
  await page
    .locator('#product-description')
    .fill('Descripción ficticia para probar el alta.');
  await page.getByRole('button', { name: 'Crear producto', exact: true }).click();
  await expect(page.locator('.admin-product')).toHaveCount(2);
  await page.getByRole('button', { name: 'Editar Modelo creado', exact: true }).click();
  await page.locator('#product-price').fill('289');
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
  await expect(page.locator('.admin-product').last()).toContainText('Bs 289');
  await page.evaluate(async () => {
    await document.fonts.ready;
    window.scrollTo(0, 0);
  });
  await page.screenshot({ path: 'docs/17-admin-contrato-simulado.png', fullPage: true });
  await page.getByRole('link', { name: 'Colección', exact: true }).click();
  await expect(page.locator('.product-card')).toHaveCount(2);
  await page.getByRole('link', { name: 'Administrar', exact: true }).click();
  await page.getByRole('button', { name: 'Retirar Modelo creado', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Retirar producto', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('link', { name: 'Colección', exact: true }).click();
  await expect(page.locator('.product-card')).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('link', { name: 'Administrar', exact: true }).click();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
  ).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'docs/19-admin-movil-contrato-simulado.png' });
});

test('error de conexión no muestra el catálogo local como si fuera remoto', async ({
  page,
}) => {
  const remote = await backend(page);
  remote.offline();
  await page.goto('./#/catalogo');
  // El SDK reintenta las lecturas GET ante un 503 antes de devolver el error.
  await expect(page.locator('.connection-status[role="alert"]')).toContainText(
    'No pudimos',
    { timeout: 20000 }
  );
  await expect(page.locator('.product-card')).toHaveCount(0);
  await expect(page.getByText('Catálogo conectado a Supabase')).toHaveCount(0);
});

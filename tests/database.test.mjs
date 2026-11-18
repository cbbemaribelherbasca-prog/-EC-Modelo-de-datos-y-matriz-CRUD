import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('migration defines the PDF schema and private-row policies', async () => {
  const sql = await readFile(
    new URL('../supabase/migrations/202611180001_model.sql', import.meta.url),
    'utf8'
  );
  for (const table of ['products', 'favorites', 'cart_items', 'orders', 'order_items']) {
    assert.match(sql, new RegExp(`create table public\\.${table}\\b`, 'i'));
    assert.match(
      sql,
      new RegExp(`alter table public\\.${table} enable row level security`, 'i')
    );
  }
});

test('PostgreSQL applies constraints, owner isolation, idempotent confirmation and cleanup', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create schema auth; create role anon; create role authenticated;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$;
      create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb)$$;
      grant usage on schema auth to anon, authenticated; grant execute on all functions in schema auth to anon, authenticated;
      insert into auth.users values ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');`);
    await db.exec(
      await readFile(
        new URL('../supabase/migrations/202611180001_model.sql', import.meta.url),
        'utf8'
      )
    );
    await db.exec(
      await readFile(
        new URL('../supabase/migrations/202611180002_catalog.sql', import.meta.url),
        'utf8'
      )
    );
    const owner = '00000000-0000-0000-0000-000000000001';
    const other = '00000000-0000-0000-0000-000000000002';
    await db.exec('set role anon');
    assert.equal(
      (await db.query('select count(*)::int n from public.products')).rows[0].n,
      9
    );
    await assert.rejects(db.exec('select * from public.cart_items'));
    await assert.rejects(db.exec('select public.adjust_cart_item(2,36::smallint,1)'));
    async function session(id, admin = false) {
      await db.exec(
        `reset role; select set_config('request.jwt.claims','${JSON.stringify({ sub: id, app_metadata: admin ? { app_role: 'catalog_admin' } : {}, user_metadata: { app_role: 'catalog_admin' } })}',false); set role authenticated;`
      );
    }
    await session(owner);
    await db.exec(`select public.adjust_cart_item(2,36::smallint,1);`);
    assert.equal(
      (await db.query('select count(*)::int n from public.cart_items')).rows[0].n,
      1
    );
    await assert.rejects(
      db.exec(`insert into public.cart_items(product_id,size,qty) values(2,37,11)`)
    );
    for (const qty of ['0', '-1', 'null', "'1.5'"])
      await assert.rejects(
        db.exec(`insert into public.cart_items(product_id,size,qty) values(2,37,${qty})`)
      );
    await assert.rejects(db.exec('select public.adjust_cart_item(2,34::smallint,1)'));
    await assert.rejects(db.exec('select public.adjust_cart_item(2,null::smallint,1)'));
    await assert.rejects(
      db.exec('select public.import_selection(array[]::bigint[],null::jsonb)')
    );
    await assert.rejects(
      db.exec(
        'select public.import_selection(array[]::bigint[],\'[{"id":2,"size":36,"qty":1.5}]\'::jsonb)'
      )
    );
    await assert.rejects(db.exec(`update public.cart_items set user_id='${other}'`));
    await assert.rejects(
      db.exec(`update public.products set price=1 where id=2 returning id`).then((r) => {
        if (r[0].rows.length === 0) throw Error('denied');
      })
    );
    await session(other);
    assert.equal(
      (await db.query('select count(*)::int n from public.cart_items')).rows[0].n,
      0
    );
    await db.exec(`delete from public.cart_items where user_id='${owner}'`);
    await assert.rejects(
      db.exec(`insert into public.favorites(user_id,product_id) values('${owner}',2)`)
    );
    await session(owner);
    await db.exec(
      `select public.import_selection(array[2::bigint], '[{"id":2,"size":36,"qty":1}]'::jsonb); select public.import_selection(array[2::bigint], '[{"id":2,"size":36,"qty":1}]'::jsonb);`
    );
    assert.equal((await db.query('select qty from public.cart_items')).rows[0].qty, 1);
    assert.equal(
      (await db.query('select count(*)::int n from public.favorites')).rows[0].n,
      1
    );
    await db.exec('delete from public.favorites where product_id=2');
    assert.equal(
      (await db.query('select count(*)::int n from public.favorites')).rows[0].n,
      0
    );
    for (const [date, ack, department] of [
      ["(now() at time zone 'America/La_Paz')::date", 'true', 'Cochabamba'],
      ["(now() at time zone 'America/La_Paz')::date+31", 'true', 'Cochabamba'],
      ["(now() at time zone 'America/La_Paz')::date+1", 'false', 'Cochabamba'],
      ["(now() at time zone 'America/La_Paz')::date+1", 'true', 'Inventado'],
    ])
      await assert.rejects(
        db.exec(
          `select public.confirm_order(gen_random_uuid(),'${department}','pickup',${date},${ack})`
        )
      );
    const call = `select public.confirm_order('00000000-0000-0000-0000-000000000099','Cochabamba','delivery',(now() at time zone 'America/La_Paz')::date+1,true) result`;
    const first = (await db.query(call)).rows[0].result;
    const second = (await db.query(call)).rows[0].result;
    assert.equal(first.id, second.id);
    assert.equal(Number(first.total), 414);
    assert.equal(
      (await db.query('select count(*)::int n from public.orders')).rows[0].n,
      1
    );
    await assert.rejects(db.exec(`update public.orders set total=1`));
    await assert.rejects(db.exec(`delete from public.orders`));
    await assert.rejects(db.exec(`delete from public.order_items`));
    await session(other);
    assert.equal(
      (await db.query('select count(*)::int n from public.orders')).rows[0].n,
      0
    );
    assert.equal(
      (await db.query('select count(*)::int n from public.order_items')).rows[0].n,
      0
    );
    await assert.rejects(db.exec(`select public.clear_confirmed_cart('${first.id}')`));
    await session(other, true);
    assert.equal(
      (await db.query('select count(*)::int n from public.orders')).rows[0].n,
      0
    );
    assert.equal(
      (await db.query('select count(*)::int n from public.cart_items')).rows[0].n,
      0
    );
    await session(owner, true);
    const created = (
      await db.query(
        "insert into public.products(name,audience,style,color,price,image_path,description) values('Modelo de prueba','Hombre','Casual','Azul',300,'assets/tenis-cobalto.png','Descripción ficticia') returning id"
      )
    ).rows[0];
    assert.equal(created.id, 10);
    await db.exec(`update public.products set price=299 where id=${created.id}`);
    await assert.rejects(db.exec(`delete from public.products where id=${created.id}`));
    await db.exec('update public.products set is_active=false where id=1');
    await session(owner);
    assert.equal(
      (await db.query('select count(*)::int n from public.products where id=1')).rows[0]
        .n,
      0
    );
    await db.exec('select public.adjust_cart_item(2,36::smallint,1)');
    await assert.rejects(db.exec(`select public.clear_confirmed_cart('${first.id}')`));
    assert.equal((await db.query('select qty from public.cart_items')).rows[0].qty, 2);
    const next = (
      await db.query(
        "select public.confirm_order(gen_random_uuid(),'Cochabamba','delivery',(now() at time zone 'America/La_Paz')::date+1,true) result"
      )
    ).rows[0].result;
    assert.equal(Number(next.shipping), 0);
    await db.exec(`select public.clear_confirmed_cart('${next.id}')`);
    assert.equal(
      (await db.query('select count(*)::int n from public.cart_items')).rows[0].n,
      0
    );
  } finally {
    await db.close();
  }
});

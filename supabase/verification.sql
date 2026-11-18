-- Una sola respuesta: CLI db query devuelve el último resultado del archivo.
-- Solo metadatos y conteos públicos. No mostrar sesiones ni filas privadas.
select jsonb_build_object(
  'tables', (
    select jsonb_agg(jsonb_build_object('name',tablename,'rls',rowsecurity) order by tablename)
    from pg_tables
    where schemaname='public' and tablename in ('products','favorites','cart_items','orders','order_items')
  ),
  'policies', (
    select jsonb_agg(jsonb_build_object('table',tablename,'name',policyname,'operation',cmd,'roles',roles) order by tablename,policyname)
    from pg_policies
    where schemaname='public' and tablename in ('products','favorites','cart_items','orders','order_items')
  ),
  'active_products', (select count(*) from public.products where is_active),
  'authenticated_can_insert_orders', has_table_privilege('authenticated','public.orders','INSERT'),
  'authenticated_can_update_orders', has_table_privilege('authenticated','public.orders','UPDATE'),
  'authenticated_can_delete_orders', has_table_privilege('authenticated','public.orders','DELETE'),
  'anon_can_execute_confirm_order', has_function_privilege('anon','public.confirm_order(uuid,text,text,date,boolean)','EXECUTE')
) as evidence;

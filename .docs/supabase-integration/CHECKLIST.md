# Checklist reanudable de integración con Supabase

## Estado: remoto conectado y verificado

Proyecto: `tenis-urbano`, referencia pública `luksbjtssyqckmmyooeg`, región `sa-east-1`, PostgreSQL 17. Organización comprobada en plan gratuito antes de crear. La CLI 3.2.0 creó y enlazó el recurso sin duplicados. El conector MCP no estaba autenticado; las operaciones remotas se realizaron mediante CLI y la configuración pública se obtuvo sin revelar claves privadas.

- [x] Revisar proyecto y validar PDF. Se conserva el PDF original de siete páginas.
- [x] Documentar el modelo y su correspondencia con la aplicación. ANALISIS.md.
- [x] Instalar y fijar CLI 3.2.0 y SDK 2.119.1; conservar lockfile.
- [x] Autenticar, comprobar organización gratuita y ausencia de proyectos, crear y enlazar el recurso con CLI.
- [x] Inspeccionar esquema e historial antes de aplicar. No había tablas públicas ni migraciones remotas.
- [x] Crear, aplicar y verificar ambas migraciones. migration list --remote muestra las dos versiones iguales a las locales.
- [x] Verificar cinco tablas con RLS, doce políticas y permisos de pedidos. supabase/verification.sql ejecutado con db query --remote --read-only.
- [x] Revisar config diff y aplicar exclusivamente Auth: URL, redirecciones y acceso anónimo. config push --yes dejó intactas nueve propiedades no declaradas.
- [x] Configurar cliente y variables públicas en .env.local, excluido de Git; no se guardaron secretos del servidor en VITE_*.
- [x] Integrar y comprobar operaciones CRUD requeridas en Supabase real.
- [x] Ejecutar db advisors --remote --type all --fail-on error. Sin ERROR; nueve WARN revisados y justificados en RESULTADOS.md.
- [x] Verificar persistencia, permisos y funcionamiento real: test:live y test:live-ui.
- [x] Documentar resultados, evidencia segura y siguientes pasos. RESULTADOS.md y GUIA-SUPABASE.md.
- [ ] Verificar publicación de la versión actual en GitHub Pages. No se hizo commit, push ni despliegue del sitio en esta ejecución.

## CRUD remoto por entidad

- [x] products C: alta desde Admin con sesión sintética cuyo rol se asignó mediante CLI.
- [x] products R: catálogo activo público; administrador también ve productos retirados.
- [x] products U: edición desde Admin; otro propietario no pudo modificar el precio.
- [x] products D lógica: retirada desde el modal, preservación del pedido y rechazo de confirmar un carrito que contiene ese producto.
- [ ] products DELETE físico: no aplica a la API; se comprobó su rechazo incluso para el administrador.
- [x] favorites C/R/D: creación, consulta propia, importación sin duplicados y eliminación; P2 no lee los datos de P1.
- [ ] favorites U: no aplica; una relación se elimina y se crea, sin UPDATE concedido.
- [x] cart_items C/R/U/D: cantidad aumentada/reducida, importación idempotente, recarga real del navegador y limpieza; propietario inmutable y límite 1..10.
- [x] orders C/R: confirmación RPC y consulta de historial propio; total de servidor y reintento sin duplicar.
- [ ] orders U/D directos: no aplican al cliente; rechazo comprobado remotamente.
- [x] order_items C/R: creados junto con el pedido y leídos desde el historial; aislamiento por propietario.
- [ ] order_items U/D directos: no aplican; rechazo comprobado remotamente.
- [x] Auth: sesiones anónimas reales distintas. El rol administrativo temporal de prueba fue retirado al finalizar y las sesiones de prueba se cerraron.

## Casos comprobados

- [x] Visitante sin sesión no lee carritos ni ejecuta confirm_order.
- [x] P1/P2 no comparten favoritos, carrito, pedidos ni detalles; P2 no crea ni actualiza filas para P1.
- [x] Rechazo de cantidades 0, -1, 11, decimales y null; talla fuera de rango y transferencia de user_id.
- [x] Rechazo de fecha de hoy, aceptación falsa y departamento no configurado.
- [x] Totales calculados desde catálogo; precio/propietario no se envían al confirmar; envío por umbral.
- [x] Reintento con request_id devuelve el mismo pedido.
- [x] Un carrito cambiado después de confirmar no se vacía; una nueva confirmación permite limpiarlo.
- [x] Administrador de catálogo solo lee sus pedidos; el rol no da acceso general a datos privados.
- [x] Error de red conserva selección, respuesta perdida no muestra éxito falso y cambio de sesión oculta datos anteriores: cuatro contratos HTTP simulados, separados de las pruebas reales.
- [x] Evidencia inspeccionada sin sesiones, credenciales ni datos personales; configuración privada excluida de Git.

## Historial y siguiente acción

Las entregas anteriores quedaron preparadas y después bloqueadas por AccessTokenRequiredError. Ese bloqueo quedó resuelto al completar el login local. No repetir creación, init ni migraciones ya aplicadas. Al retomar: projects list, migration list --remote y config diff antes de actuar.

Para uso cotidiano de Admin, autorizar una cuenta propia mediante el procedimiento local de GUIA-SUPABASE.md; no se creó ni publicó una contraseña de acceso. Las cuentas de evidencia son sintéticas y no se entregan como cuentas compartidas. Para Pages, configurar variables públicas de Actions y verificar el despliegue por separado.

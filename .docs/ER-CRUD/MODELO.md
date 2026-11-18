# Página 1: Modelo de datos

y matriz CRUD

Tenis Urbano / H4 - Evaluación continua / 18 de noviembre de 2026

Propósito. Definir entidades, campos, relaciones y permisos del caso para una futura integración con Supabase. Este documento es un modelo objetivo, no evidencia de una base de datos remota ya desplegada.

## Estado actual y alcance objetivo

| Flujo | Hoy en la SPA | Destino propuesto |

| --- | --- | --- |

| Catálogo | Nueve objetos locales en src/data/products.js. | products, conservando los identificadores 1 a 9. |

| Favoritos | Lista de IDs en localStorage. | favorites, con propietario autenticado. |

| Carrito | Líneas id, size, qty; reducer compartido. | cart_items, con unicidad y máximo de 10 pares por talla. |

| Confirmación | Preferencias locales y modal; no existe pedido remoto. | orders y order_items: extensión propuesta para registrar la demostración. |

| Identidad | No hay autenticación ni roles reales. | auth.users y RLS para aislar datos privados. |

## Actores y minimización de datos

V: visitante sin sesión. P: propietario con sesión Supabase válida. A: administrador de catálogo con rol asignado por un proceso confiable. S: servicio o función transaccional que actúa dentro de permisos limitados.

Una sesión anónima de Supabase Auth puede representar a P sin solicitar nombre, correo o teléfono. No debe confundirse con el rol de base de datos anon, que corresponde a peticiones sin sesión de usuario. La sesión no garantiza recuperación desde otro dispositivo.

## Decisiones que amplían el modelo actual

Se proponen is_active y marcas de tiempo en catálogo, identidad de propietario e historial de pedidos de demostración. No se agregan stock, pagos reales, direcciones ni perfiles personales. Estas extensiones son requisitos de diseño para la integración futura y no describen funciones existentes.

# Página 2: Entidades y relaciones

Notación: PK = clave primaria; FK = clave foránea; 1 : N = uno a muchos.

| Origen → destino | Cardinalidad | FK y eliminación |

| --- | --- | --- |

| auth.users → favorites | 1 a 0..N | user_id; ON DELETE CASCADE. |

| auth.users → cart_items | 1 a 0..N | user_id; ON DELETE CASCADE. |

| auth.users → orders | 1 a 0..N | user_id; CASCADE para esta demostración sin retención fiscal. |

| products → favorites | 1 a 0..N | product_id; RESTRICT. El producto se desactiva. |

| products → cart_items | 1 a 0..N | product_id; RESTRICT. Informar si está inactivo. |

| products → order_items | 1 a 0..N | product_id; RESTRICT. Conservar historial. |

| orders → order_items | 1 a 1..N | order_id; CASCADE. La función exige al menos una línea. |

favorites resuelve la relación N : M entre usuarios y productos. cart_items diferencia selecciones por talla. order_items conserva el detalle del pedido. Desactivar un producto impide confirmaciones nuevas, pero mantiene las referencias; la interfaz debe permitir retirar las líneas no disponibles.

# Página 3: Diccionario / catálogo

Tabla public.products. Nulabilidad: NN = NOT NULL; NULL = opcional.

| Campo | PostgreSQL | Clave / nulo | Regla / valor por defecto |

| --- | --- | --- | --- |

| id | bigint | PK, NN | Identidad generada; conservar IDs existentes al importar. |

| name | text | NN | Texto no vacío, hasta 120 caracteres. |

| audience | text | NN | Hombre, Mujer o Niños. |

| style | text | NN | Running, Urbano o Casual. |

| color | text | NN | Texto no vacío, hasta 120 caracteres. |

| price | numeric(10,2) | NN | Mayor que 0. Precio vigente en Bs. |

| old_price | numeric(10,2) | NULL | Si existe, mayor que price. Por defecto NULL. |

| image_path | text | NN | Ruta de un recurso público permitido; no incluir secretos. |

| badge | text | NN | Por defecto texto vacío; máximo 40 caracteres. |

| description | text | NN | Texto no vacío; hasta 1500 caracteres. |

| is_active | boolean | NN | Por defecto true. Baja lógica, sin borrar referencias. |

| created_at | timestamptz | NN | Por defecto now(); no editable desde el cliente. |

## Correspondencia con React

oldPrice se corresponde con old_price; image con image_path. Los demás campos de producto mantienen su significado. El adaptador debe resolver imágenes locales con Vite o usar URLs públicas permitidas. El precio nunca se recupera desde una propiedad agregada al carrito por el cliente.

is_active y created_at son extensiones propuestas. El público ve productos activos; A puede consultar y editar el catálogo completo. No hay DELETE físico expuesto por la API: la baja se realiza actualizando is_active.

# Página 4: Diccionario / selección privada

Supabase administra auth.users. No crear una copia pública de correos, contraseñas ni tokens.

| Entidad / campo | Tipo | Clave / nulo | Regla / valor por defecto |

| --- | --- | --- | --- |

| auth.users.id | uuid | PK, NN | Identificador gestionado por Auth; no escribir directamente. |

| favorites.user_id | uuid | PK, FK, NN | Propietario: auth.users.id; obtenerlo de la sesión. |

| favorites.product_id | bigint | PK, FK, NN | Referencia a products.id. |

| favorites.created_at | timestamptz | NN | Por defecto now(); generado por servidor. |

| cart_items.user_id | uuid | PK, FK, NN | Propietario: auth.users.id. |

| cart_items.product_id | bigint | PK, FK, NN | Referencia a products.id. |

| cart_items.size | smallint | PK, NN | Valor entero entre 35 y 42. |

| cart_items.qty | smallint | NN | Por defecto 1; CHECK entre 1 y 10. |

| cart_items.updated_at | timestamptz | NN | now() al crear; trigger confiable al actualizar. |

## Integridad e índices

PK favorites = (user_id, product_id). PK cart_items = (user_id, product_id, size). Estas claves evitan duplicados por propietario. Añadir índices en product_id para las referencias y en orders(user_id, created_at) para el historial. La FK de cada relación se detalla en la página 2.

## Reglas al sincronizar

La lectura remota solo devuelve filas propias. La importación de una selección local se ejecuta una vez por sesión/estado importado y mediante upsert idempotente; reintentar no debe sumar unidades de nuevo. Normalizar cantidades y duplicados antes de importar, y volver a validar en la base de datos.

P puede modificar únicamente qty en una línea existente. Cambiar la talla significa eliminar la línea original y crear otra dentro de la misma operación controlada. Los identificadores y marcas de tiempo no se reasignan con un UPDATE del navegador.

# Página 5: Diccionario / pedido de demostración

Extensión propuesta: registrar la confirmación sin cobrar ni solicitar información personal.

| Campo | PostgreSQL | Restricción / valor por defecto |

| --- | --- | --- |

| orders.id | uuid | PK, NN; gen_random_uuid(). |

| orders.user_id | uuid | FK, NN; identidad de la sesión, nunca del cuerpo de la petición. |

| orders.request_id | uuid | NN; UNIQUE(user_id, request_id) para reintentos idempotentes. |

| orders.department | text | NN; uno de los nueve departamentos del formulario. |

| orders.delivery_method | text | NN; pickup o delivery. |

| orders.preferred_date | date | NN; validar mañana..30 días al crear, en America/La_Paz. |

| orders.demo_ack | boolean | NN; exigir true, sin aceptación implícita. |

| orders.subtotal | numeric(10,2) | NN; suma del detalle, calculada en servidor. |

| orders.shipping | numeric(10,2) | NN; 0 o 25 según modalidad y subtotal. |

| orders.total | numeric(10,2) | NN; subtotal + shipping, calculado en servidor. |

| orders.created_at | timestamptz | NN; now(). |

| order_items.order_id | uuid | PK, FK, NN; referencia a orders.id. |

| order_items.product_id | bigint | PK, FK, NN; referencia a products.id. |

| order_items.size | smallint | PK, NN; 35..42. |

| order_items.qty | smallint | NN; CHECK entre 1 y 10. |

| order_items.unit_price | numeric(10,2) | NN; instantánea del precio del catálogo, mayor que 0. |

| order_items.product_name | text | NN; instantánea del nombre para el historial. |

Los nueve departamentos son Beni, Chuquisaca, Cochabamba, La Paz, Oruro, Pando, Potosí, Santa Cruz y Tarija. La validación de fechas se ejecuta al crear el pedido; no usar un CHECK dependiente del paso del tiempo como única defensa.

# Página 6: Matriz CRUD por actor y dato

V = visitante; P = propietario autenticado; A = administrador de catálogo; S = función de servidor.

| Dato | Crear | Leer | Actualizar | Eliminar |

| --- | --- | --- | --- | --- |

| products: datos comerciales | A | V/P: activos; A: todos | A | A: baja lógica |

| products.id y created_at | S al alta de A | Igual al producto | Nadie | Sin DELETE físico |

| products.is_active | S: true al alta | Igual al producto | Solo A | No aplica |

| favorites: claves y fecha | P, solo propia | P, solo propia | No aplica; D + C | P, solo propia |

| cart_items: claves y fecha | P, solo propia | P, solo propia | Identidad no; fecha S | P, solo propia |

| cart_items.qty | P, de 1 a 10 | P, solo propia | P, de 1 a 10 | P, eliminando línea |

| orders: preferencias / dueño | P vía RPC; S valida | P: propios | Nadie desde cliente | Sin borrado directo |

| orders: IDs, totales y fecha | S dentro de RPC | P: propios | Nadie desde cliente | Sin borrado directo |

| order_items: todos los datos | S dentro de RPC | P: detalle propio | Nadie desde cliente | Sin borrado directo |

| auth.users | Solo mecanismo Auth | Solo identidad de sesión | Solo mecanismo Auth | Flujo privilegiado de cuenta |

## Notas de autorización

Las filas privadas de un usuario no son legibles por V ni por otro P. A administra catálogo, pero no recibe acceso general a carritos, favoritos o pedidos de terceros. Las operaciones sin permiso se deniegan por defecto. Las cascadas por eliminación de cuenta no conceden DELETE directo a la aplicación.

## Confirmación transaccional

Una RPC de confirmación verifica sesión, aceptación, fecha, catálogo activo y líneas 1..10; consulta precios vigentes y genera cabecera y detalle en una transacción. Un request_id repetido devuelve el mismo pedido. Envío: retiro gratis; delivery Bs 25 si subtotal es menor que Bs 500, gratis desde Bs 500. Rechazar carrito vacío y productos no disponibles.

La RPC no vacía la selección al abrir el modal. Mantener el contrato de la SPA: Volver al catálogo elimina las líneas propias después del éxito; X o Escape conserva la selección. No afirmar que se recibió un pedido si falla la solicitud remota.

# Página 7: Seguridad, riesgo y verificación

Regla prioritaria: aislar datos por propietario y no confiar en valores de autoridad enviados por el navegador.

## Regla indispensable y justificación

RLS en todas las tablas expuestas, junto con GRANT mínimos. En favorites y cart_items, leer y modificar exige user_id = auth.uid(); INSERT debe comprobar el propietario y UPDATE verificar la fila original y la resultante. El dueño de un pedido se valida en orders; el acceso a order_items deriva del pedido, no de un user_id proporcionado por el cliente. [S1]

La finalidad es impedir que cambiar un identificador revele o altere datos ajenos. Ocultar botones no aplica esta defensa. A se reconoce con un rol confiable asignado fuera del cliente, por ejemplo app_metadata gestionado de forma privilegiada; nunca mediante user_metadata editable. Las claves secretas o service_role no van al frontend. [S1, S2]

## Riesgos y mitigación

| Riesgo | Mitigación propuesta |

| --- | --- |

| Leer o modificar la selección de otro usuario. | RLS por propietario, políticas por operación y pruebas con dos sesiones aisladas. |

| Modificar precio, total, dueño o rol desde DevTools. | RPC obtiene dueño y precios desde fuentes confiables; limitar columnas actualizables; no confiar en estado local. |

| Pedido duplicado por doble envío o reintento de red. | Transacción y request_id único por propietario; mismo resultado para el mismo intento. |

| Exponer una clave privada en Vite, Git o capturas. | Solo URL y clave publicable en cliente; secretos fuera de VITE_* y del repositorio; evidencia redactada. |

## Prueba de aceptación y duda técnica

Prueba futura: P1 crea una línea; P2 intenta leerla, cambiar qty, transferir user_id y eliminarla. Todas las operaciones ajenas deben quedar sin acceso o sin efecto y la fila debe conservarse. Como propietario, qty = 11 debe rechazarse. A puede desactivar un producto, pero no consultar carritos privados. Estas pruebas remotas aún no fueron ejecutadas.

Duda: si otra pestaña cambia el carrito después de confirmar el pedido, ¿se debe advertir antes de vaciarlo o eliminar solo las líneas que siguen coincidiendo con la instantánea confirmada? La sincronización entre pestañas queda fuera del modelo actual y debe resolverse antes de una compra real.

## Fuentes y estado de la entrega

## Fuentes oficiales

- S1: https://supabase.com/docs/guides/database/postgres/row-level-security
- S2: https://supabase.com/docs/guides/getting-started/api-keys
- S3: https://supabase.com/docs/guides/auth/auth-anonymous
- S4: https://supabase.com/docs/guides/local-development/cli/getting-started

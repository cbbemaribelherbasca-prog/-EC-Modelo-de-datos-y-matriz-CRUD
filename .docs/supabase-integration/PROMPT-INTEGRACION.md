# Prompt listo: integrar Tenis Urbano con Supabase desde el PDF ER/CRUD

Este archivo guía la integración y su reanudación. El código, SDK y migraciones ya están implementados y probados localmente; el proyecto remoto ya está enlazado y las comprobaciones reales están aprobadas. Consulta CHECKLIST.md antes de ejecutar para no repetir recursos ni reemplazar trabajo existente.

## Parámetros ya reemplazados

```text
RUTA_PDF = ".docs/ER-CRUD/ER-CRUD.pdf"
CARPETA_TRABAJO = ".docs/supabase-integration"
```

Ambas rutas se resuelven desde la raíz de Tenis Urbano. Conserva el PDF original como fuente. Su versión actual contiene siete páginas.

## Objetivo de la ejecución

Revisa el proyecto y conecta sus flujos a un proyecto remoto de Supabase conforme al modelo, relaciones, matriz CRUD y restricciones del PDF. Crea o identifica el recurso remoto con Supabase CLI e integra los archivos necesarios en la aplicación. No confundas el modelo propuesto con una integración ya realizada.

### Contexto específico

- React, React Router con HashRouter, Vite y CSS; aplicación en español, importes en Bs.
- Entrada en `src/main.jsx`; rutas en `src/App.jsx`. Mantener el diseño, los modales, la navegación y la accesibilidad.
- Catálogo actual: `src/data/products.js`; conservar los nueve IDs iniciales y resolver imágenes mediante Vite.
- Favoritos y carrito: `src/context/ShopContext.jsx`; reglas del carrito en `src/data/cart.js`.
- Formulario: `src/pages/Checkout.jsx`; reglas en `src/data/checkout.js`; total compartido en `OrderSummary`.
- La aplicación incluye SDK de Supabase, autenticación, administración e historial preparados. Comprueba el estado real de la CLI y revisa el proyecto enlazado y retoma únicamente tareas pendientes sin reconstruir esos flujos ni crear recursos duplicados.
- El PDF añade explícitamente identidad, disponibilidad y pedidos de demostración. Implementa esas extensiones como tales, sin afirmar que ya existían.

## Reglas de trabajo

1. Lee `AGENTS.md`, los archivos actuales y el checklist existente. Conserva cambios ajenos y trabaja por etapas sin pedir confirmación rutinaria.
2. Pregunta solo por información imprescindible que no pueda obtenerse del entorno; continúa con el código y documentación independientes si faltan credenciales.
3. Usa exclusivamente el plan gratuito. Antes de crear, verifica organización, proyectos y cuota. Si no puede confirmarse capacidad gratuita, deja la creación pendiente; no actives ampliaciones, facturación ni servicios de pago.
4. Reutiliza el proyecto enlazado si corresponde. No crees recursos duplicados al reanudar, no elimines datos ni ejecutes un reset sobre el remoto.
5. No muestres tokens, claves privadas, contraseñas, sesiones o datos reales en chat, logs, código, PDF ni capturas. Las credenciales imprescindibles se introducen localmente por un mecanismo seguro.
6. No uses una clave privada para sortear RLS en el frontend. No inventes un backend funcional cuando solo exista una simulación o datos locales.
7. Si faltan herramientas, permisos o conectividad, registra la limitación, los archivos preparados y el siguiente paso. Distingue ejecutado, verificado, propuesto y bloqueado.

## 1. Inspección y checklist reanudable

Usa `.docs/supabase-integration/CHECKLIST.md`. Conserva el historial y actualízalo con evidencia breve y sin secretos. Marca `[x]` solo cuando el resultado esté comprobado. Mantén `[ ]` para lo pendiente, bloqueado, no verificado o no aplicable y explica el motivo.

Desglosa por entidad y operación, no solamente por tablas:

- products: C y R; U de campos autorizados; D lógica por `is_active`. DELETE físico no permitido.
- favorites: C, R y D propios; U no aplica.
- cart_items: C, R, U de qty y D propios; claves inmutables y fecha controlada por servidor.
- orders: C mediante RPC y R propio; U/D directos no aplican.
- order_items: C mediante la misma RPC y R derivada del pedido; U/D directos no aplican.
- auth.users: gestionar sesión con Auth; no exponer CRUD directo ni copiar información personal a public.

## 2. Leer el PDF y documentar la correspondencia

Comprueba existencia, contenido y legibilidad. Extrae texto y renderiza las páginas con diagramas o tablas. Si el modelo no puede obtenerse, pide lo que falta antes de crear el esquema. No inventes entidades adicionales.

Mantén `.docs/supabase-integration/ANALISIS.md` con:

- Entidades, tipos PostgreSQL, PK, FK, nulabilidad, defaults y restricciones por campo.
- Relaciones, cardinalidades, claves compuestas y reglas de eliminación.
- Correspondencia `página del PDF → entidad → operación → flujo/archivo → verificación`.
- Roles y permisos por operación; los procesos CRUD no sustituyen las políticas de seguridad.
- Diferencias entre el código local, el modelo objetivo y la integración efectiva.
- Decisiones pendientes, incluidas sesión anónima, importación local, producto inactivo y cambios en otra pestaña.

Mapa del PDF: p. 1 alcance y actores; p. 2 relaciones; p. 3 products; p. 4 auth.users, favorites y cart_items; p. 5 orders y order_items; p. 6 CRUD y transacción; p. 7 seguridad, riesgos y aceptación.

## 3. Identificar o crear el proyecto remoto con CLI

Comprueba la versión y los comandos disponibles con `--help` antes de usarlos. Si falta la CLI, usa una instalación oficial local al proyecto o un ejecutable oficial. No uses `npm install -g supabase`. En Windows PowerShell, usa `npm.cmd` y `npx.cmd` si la política bloquea los scripts `.ps1`.

Secuencia de referencia, adaptada a la versión instalada y omitiendo acciones ya realizadas:

```powershell
npx.cmd supabase --version
npx.cmd supabase --help
npx.cmd supabase login --help
npx.cmd supabase projects list --help
npx.cmd supabase projects create --help
npx.cmd supabase link --help
npx.cmd supabase db push --help
```

- Autentica la CLI localmente; evita imprimir su token.
- Consulta las organizaciones y proyectos disponibles. Verifica plan y cuota antes de crear.
- Solo si no existe el recurso adecuado, crea un proyecto gratuito con nombre identificable de Tenis Urbano, organización y región verificadas. No inventes un flag de plan que la CLI no soporte.
- Inicializa `supabase/config.toml` si falta y enlaza el recurso remoto correcto.
- Obtén de forma local la configuración pública necesaria; no vuelques todas las claves ni uses opciones para revelar secretos.
- Conserva la identificación del proyecto en el registro local necesario para reanudar; no publiques contraseñas ni URLs de conexión con credenciales.

Si la cuenta, organización o autenticación no están disponibles, deja esta etapa pendiente y continúa preparando migraciones, adaptadores y pruebas sin simular que se aplicaron en la nube.

## 4. Migraciones, permisos y reglas de integridad

Crea migraciones versionadas bajo `supabase/migrations/`. Antes de aplicar, compara con el remoto y conserva sus datos. Importa el catálogo de demostración de manera idempotente; mantén IDs e imágenes y no dupliques productos al reintentar.

Aplica exactamente las relaciones y restricciones del PDF, incluyendo:

- Unicidad por usuario/producto en favorites y por usuario/producto/talla en cart_items.
- Qty entera de 1 a 10 y tallas de 35 a 42 también en PostgreSQL.
- Productos activos para nuevas selecciones y confirmaciones; baja lógica administrativa.
- Propietarios derivados de la sesión; marcas de tiempo confiables e identidades no reasignables.
- Fecha de entrega evaluada al confirmar en calendario America/La_Paz: desde mañana y hasta 30 días. No depender únicamente de un CHECK temporal ni de la validación del navegador.

Habilita RLS y configura GRANT explícitos mínimos. Define políticas separadas por operación, con USING y WITH CHECK cuando corresponda. Para UPDATE, verifica tanto la fila original como la resultante. Limita columnas para que el propietario solo pueda cambiar qty y no identidades ni marcas de tiempo.

Un rol administrativo de catálogo debe provenir de una asignación privilegiada verificable, nunca de user_metadata ni de un indicador editable en localStorage. A no obtiene lectura de selecciones o pedidos privados por administrar productos.

Implementa la confirmación como una RPC transaccional: dueño desde auth.uid(), carrito del dueño, precios vigentes del catálogo, importes y envío calculados en servidor, petición idempotente por `(user_id, request_id)` y cabecera/detalle en la misma transacción. Rechaza carrito vacío, producto inactivo y datos inválidos.

No aceptes importes, privilegios ni propietarios de autoridad desde el cliente. Si la RPC usa SECURITY DEFINER, justifica el privilegio, fija un search_path seguro, califica objetos, revoca EXECUTE innecesario y comprueba sesión/propiedad explícitamente; no des por hecho que RLS se aplica con el mismo rol dentro de la función.

Aplica y verifica las migraciones con los comandos soportados por la CLI. No marques la etapa remota como terminada solo porque el SQL exista en el repositorio.

## 5. SDK, variables y separación de acceso

Antes de crear archivos con valores, agrega exclusiones para `.env`, `.env.*`, temporales de Supabase y salidas sensibles; conserva solo una plantilla sin valores reales, por ejemplo `.env.example`.

Configura un cliente único con el SDK oficial adecuado al proyecto. Para Vite, los nombres públicos son:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

Estas variables son visibles en el bundle. La clave publicable no concede propiedad ni sustituye RLS. Nunca pongas claves secretas, service_role, contraseñas de base de datos ni tokens de CLI en variables VITE_*.

Separa acceso a datos y mapeo de campos del renderizado. Adapta `old_price → oldPrice` e `image_path → image` y conserva las rutas y componentes actuales. Sustituye las lecturas estáticas necesarias de forma coherente para que el carrito no consulte un catálogo distinto del modal o del resumen.

## 6. Integración de flujos y retroalimentación

- Catálogo público: consultar activos, mantener búsqueda/filtros/orden y resolver carga, vacío y error.
- Sesión de propietario: usar Auth antes de escrituras. Se propone sesión anónima de Supabase Auth para conservar el caso sin solicitar información personal; si no está habilitada o no es viable, registrar el bloqueo y pedir la decisión imprescindible. Una sesión anónima válida usa el rol authenticated, no anon.
- Favoritos y carrito: CRUD solo propio. El almacenamiento local previo se importa una vez de manera idempotente. Reintentar no suma unidades dos veces. Sincroniza con el remoto y no anuncies éxito cuando falle una escritura.
- Si una relación devuelve un producto desactivado o no visible, mostrar no disponible sin romper el render; permitir quitarlo e impedir confirmar con esa línea.
- Formulario: conservar errores accesibles, límites de fecha, aceptación y cálculo visible. Usar RPC al confirmar y mostrar el resultado persistido, sin cobros reales.
- X/Escape del éxito conserva el carrito; Volver al catálogo elimina la selección propia solo después de una confirmación remota válida. Si otra pestaña cambió la selección, no borrar silenciosamente sus novedades: documentar y resolver el conflicto antes de afirmar soporte de concurrencia.
- Administración: implementar únicamente las operaciones autorizadas del catálogo en una vista acorde al diseño, si hace falta para demostrar ese CRUD. La autorización real permanece en la base de datos.

## 7. Pruebas de persistencia y permisos

Ejecuta el build y la suite existente; añade pruebas de las operaciones remotas. No ejecutes la suite antigua contra datos reales compartidos. Usa sesiones y datos sintéticos aislados y elimina únicamente datos de prueba identificados.

Verifica como mínimo:

1. Visitante lee activos y no puede editar catálogo ni acceder a tablas privadas.
2. P1 crea/lee/modifica/elimina su carrito; P2 no puede leerlo ni cambiarlo, borrarlo o transferir user_id.
3. Con RLS, una lectura puede devolver cero filas y una actualización puede afectar cero filas: comprueba ausencia de datos y cambios, sin exigir que todos los rechazos sean HTTP 403.
4. Cantidades 0, 11, negativas o fraccionarias, tallas ajenas y referencias inexistentes son rechazadas; 1 y 10 se aceptan.
5. Repetir importación o confirmar dos veces con el mismo request_id no duplica líneas ni pedidos.
6. El precio enviado por el navegador se ignora y el servidor calcula el total; fecha pasada y falta de aceptación bloquean el pedido.
7. Un fallo de red deja error recuperable y no vacía el carrito ni muestra una compra exitosa falsa.
8. Los datos persisten tras recargar y otra sesión no hereda el acceso privado.
9. A puede crear, modificar y desactivar catálogo, pero no obtiene lectura general de pedidos ni carritos ajenos.
10. El bundle, Git, logs y evidencia no contienen secretos. El frontend solo utiliza configuración pública.

Registra pruebas ejecutadas y resultados reales, diferenciándolos de pruebas propuestas o bloqueadas. Una prueba hecha solo con una clave que omite RLS no demuestra aislamiento de usuarios.

## 8. Entrega y reanudación

Actualiza CHECKLIST.md y ANALISIS.md, las instrucciones de ejecución fuera del README y el README en español con alcance, rutas, CRUD, persistencia, seguridad y evidencia segura. Incluye versión de CLI, migraciones aplicadas, pruebas ejecutadas, pendientes y siguiente acción, sin valores secretos.

Si la autenticación o el remoto quedan bloqueados, entrega el código y comandos preparados y deja [ ] en la verificación remota. No declares el sitio conectado, desplegado o protegido hasta comprobarlo.

Fuentes oficiales para comprobar sintaxis y comportamiento en la fecha de ejecución:

- https://supabase.com/docs/guides/local-development/cli/getting-started
- https://supabase.com/docs/reference/cli/supabase-projects-create
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/database/functions
- https://supabase.com/docs/guides/getting-started/api-keys
- https://supabase.com/docs/guides/auth/auth-anonymous

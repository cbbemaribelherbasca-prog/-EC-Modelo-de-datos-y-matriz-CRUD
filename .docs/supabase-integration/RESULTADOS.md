# Resultados de integración con Supabase

CLI 3.2.0 y SDK 2.119.1 con versiones fijas. Proyecto `tenis-urbano`, referencia pública `luksbjtssyqckmmyooeg`, región `sa-east-1`, PostgreSQL 17.11.0.019. Organización en plan gratuito comprobado antes de crear. No se activaron servicios de pago ni se eliminaron datos existentes.

## Ejecución remota completada

1. La CLI autenticada confirmó que no había proyectos. Se consultó el plan de la organización y se creó el proyecto con projects create, sin tamaño de pago ni alta disponibilidad.
2. link enlazó el proyecto. migration list y una consulta de pg_tables confirmaron esquema e historial vacíos.
3. db push --remote --skip-vault --dry-run identificó exactamente dos migraciones pendientes. db push --remote --skip-vault --yes aplicó 202611180001 y 202611180002. migration list --remote confirmó ambas.
4. verification.sql comprobó cinco tablas con RLS, doce políticas, nueve productos activos y ausencia de permisos directos C/U/D sobre pedidos. El visitante sin sesión no puede ejecutar la RPC de confirmación.
5. config diff permitió revisar los cambios; config push actualizó únicamente URL, redirecciones y Anonymous Sign-Ins. Las nueve propiedades remotas no declaradas permanecieron intactas, incluidos ajustes de MFA y servicios no utilizados.
6. Se obtuvo únicamente el valor de la clave publicable para configurar el frontend en .env.local. No se imprimieron tokens ni claves privadas. La contraseña aleatoria de la base está protegida con DPAPI fuera del repositorio, bajo el perfil local de Windows.

El conector MCP del plugin devolvió USER_NOT_LOGGED_IN. Se utilizó la CLI solicitada por el usuario para creación, enlace, migraciones, configuración, consultas y advisors; la lectura del plan y de configuración pública utilizó la Management API con la sesión CLI del almacén seguro local, sin imprimirla.

## Pruebas y resultados

| Comprobación    | Resultado y alcance                                                                                                                                                     |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| test:unit       | Diez pruebas Node/PostgreSQL: restricciones/RLS en PGlite, configuración, protección de variables y repositorio.                                                        |
| test            | Once pruebas de regresión SPA en modo local aislado de .env.local.                                                                                                      |
| test:remote-ui  | Cuatro pruebas con HTTP simulado: errores, reintentos, cambio de propietario y administración. También se comprobó la compilación con base /Tenis-Urbano/.              |
| test:live       | Aprobada contra Supabase real con dos sesiones anónimas distintas. CRUD privado, importación, límites, fechas, permisos, totales, idempotencia y conflicto de limpieza. |
| test:live-ui    | Una prueba de navegador aprobada contra Supabase real: alta/edición/retiro de producto, persistencia tras recarga, compra, historial y aislamiento.                     |
| build y formato | Compilación y Prettier verificados. No existen scripts de lint ni type-check.                                                                                           |
| npm audit       | La última auditoría de dependencias no informó vulnerabilidades.                                                                                                        |

Las comprobaciones de SDK usan exclusivamente la clave publicable y sesiones reales. No se probó RLS mediante consultas privilegiadas que fingieran ser compradores. La CLI solo asigna temporalmente el rol a la cuenta sintética creada por la prueba administrativa; los cambios de catálogo, carrito y pedidos pasan por la API con su JWT. El rol se retira al terminar y se cierran las sesiones.

El caso administrativo creó y editó un modelo ficticio a Bs 289. La compra con envío se confirmó por Bs 314. Al volver al catálogo se vació el carrito, el historial conservó su detalle y el modelo se retiró mediante baja lógica. Otra sesión no pudo modificar su precio ni leer el pedido. El administrador tampoco recibió acceso a pedidos ajenos.

Las pruebas conservan cuentas anónimas y pedidos ficticios, y los productos de evidencia quedan retirados. No se borraron usuarios existentes ni se usó información personal. Repetir test:live o test:live-ui crea evidencia adicional y consume la cuota de Auth; no ejecutarlas continuamente.

## Evidencia real y evidencia simulada

- docs/20-supabase-admin-real.png: administración conectada a Supabase real.
- docs/21-supabase-compra-real.png: confirmación recibida desde la RPC real.
- docs/22-supabase-pedido-real.png: lectura del historial persistido.
- docs/23-supabase-catalogo-real.png: catálogo real con nueve productos activos; también se comprobó ausencia de errores JavaScript y desbordamiento móvil.

Capturas inspeccionadas; no incluyen sesiones, credenciales ni datos personales. docs/17-admin-contrato-simulado.png, 18-pedidos-contrato-simulado.png y 19-admin-movil-contrato-simulado.png conservan su identificación de pruebas simuladas.

## Advisors: sin errores y nueve advertencias revisadas

`db advisors --remote --type all --fail-on error` terminó correctamente y reportó nueve WARN:

- Cuatro funciones SECURITY DEFINER ejecutables por authenticated. Son puntos de entrada intencionales de ajuste/importación, confirmación transaccional y limpieza validada. Cada una comprueba auth.uid(), fija search_path vacío, califica objetos, limita su operación y revoca EXECUTE de PUBLIC/anon. La confirmación requiere privilegios para crear pedidos mientras la API impide INSERT directo. Las pruebas comprobaron aislamiento e importes; no se declara que esas advertencias hayan desaparecido.
- Cinco avisos sobre políticas accesibles a usuarios anónimos de Auth. Es el actor elegido por el PDF para comprar sin pedir datos personales. Cada fila privada se limita a su propietario; el catálogo exige un rol confiable para escribir. Un usuario con sesión anónima no equivale a una solicitud pública sin sesión. Las pruebas P1/P2 y de catálogo comprobaron los límites.

No se agregó MFA, CAPTCHA, pagos ni servicios de pago para silenciar advertencias. Antes de uso comercial, revisar controles contra abuso, inventario, recuperación de cuentas, límites y retención. El sitio sigue siendo una demostración.

## Revisión del código

La revisión previa detectó dos problemas, reproducidos y corregidos: selección/historial antiguos visibles al cambiar de cuenta si fallaba la lectura; y preferencias del recibo distintas de las enviadas si se editaba durante la espera. Los datos ahora se asocian al propietario y el recibo presenta el pedido recibido. Las regresiones simuladas verifican ambos casos. No quedaron hallazgos importantes descartados de esa revisión.

## Pendientes y límites

- No se publicó esta actualización en GitHub Pages, ni se hizo commit/push. Un backend operativo no prueba que el frontend publicado esté actualizado.
- Para usar Admin de forma cotidiana, crear/autorizar una cuenta propia desde herramientas de confianza conforme a GUIA-SUPABASE.md. No se comparte la sesión temporal usada por las pruebas.
- Auth anónimo pertenece al navegador; borrar su sesión puede impedir recuperar sus datos. No hay cuentas de cliente recuperables ni sincronización Realtime.
- No hay pagos, stock ni carga de imágenes a Storage. Una imagen nueva en assets requiere recompilar.
- La compilación conserva avisos de directivas use client de React Router; los recorridos comprobados funcionaron sin errores de JavaScript.

## Historial seguro

El trabajo se entregó primero como modelo/PDF y luego como integración local pendiente de login. Tras autenticarse la CLI se completó la conexión y verificación descritas arriba. Los antiguos AccessTokenRequiredError fueron un bloqueo de esa etapa, no el estado actual. Se conservó el PDF original y no se recrearon recursos al reanudar.

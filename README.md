# Tenis Urbano · SPA y modelo de datos con Supabase

Tienda de demostración en español para Bolivia, construida con React, React Router, Vite y CSS. Conserva catálogo, favoritos, carrito, modales accesibles y confirmación mediante preferencias de entrega, sin pagos reales.

[Repositorio](https://github.com/cbbemaribelherbasca-prog/Tenis-Urbano) · [Ejecutar en otra máquina](EJECUTAR-OTRA-MAQUINA.md) · [Guía de ejecución y entrega](GUIA-ENTREGA.md) · [Guía de Supabase CLI](.docs/supabase-integration/GUIA-SUPABASE.md)

## Estado de la integración

**Supabase remoto ya está conectado y verificado.** La CLI **3.2.0** creó y enlazó el proyecto `tenis-urbano` en una organización de plan gratuito, aplicó las dos migraciones y configuró Auth anónimo. El catálogo, favoritos, carrito y pedidos utilizan el servicio real mediante el SDK 2.119.1. Esta actualización del frontend todavía no se publicó en Pages.

La configuración pública local está en `.env.local`, excluido de Git. En otra máquina se debe configurar conforme a la guía; sin esas variables funciona la demostración local. Un error de conexión se muestra explícitamente y no se sustituye por un éxito local. La evidencia distingue capturas del servicio real y contratos HTTP simulados.

## Rutas y flujo principal

| Vista            | Ruta              | Responsabilidad                                         |
| ---------------- | ----------------- | ------------------------------------------------------- |
| Inicio           | `/#/`             | Portada y acceso a la colección.                        |
| Colección        | `/#/catalogo`     | Buscar, filtrar y ordenar productos activos.            |
| Favoritos        | `/#/favoritos`    | Revisar y quitar modelos guardados.                     |
| Producto         | `/#/producto/:id` | Modal, talla, favoritos y agregado al carrito.          |
| Carrito          | `/#/carrito`      | Ajustar cantidades, eliminar líneas y revisar el total. |
| Confirmar compra | `/#/checkout`     | Validar preferencias y confirmar una compra ficticia.   |
| Mis pedidos      | `/#/pedidos`      | Leer pedidos propios y sus detalles en modo Supabase.   |
| Administración   | `/#/admin`        | Acceso autorizado, alta, edición y retiro de productos. |

Inicio → Colección → Producto y talla → Carrito → Preferencias de entrega → Confirmación → Volver al catálogo. Abrir la confirmación conserva el carrito; su acción Volver al catálogo lo limpia y regresa a la colección. Cerrar el diálogo conserva la selección.

HashRouter permite enlaces directos y recargas en hosting estático. Se mantienen `categoria`, `buscar=1`, `ver=coleccion` y la ubicación de origen del modal, con recuperación de foco y posición al cerrarlo.

## Formulario y validación

La compra solicita departamento, modalidad de entrega, fecha preferida y aceptación de demostración. No solicita nombres, direcciones, teléfono ni datos de pago. Los errores se asocian al campo y se reúnen en un resumen enfocado al enviar.

- Departamento: uno de los nueve departamentos de Bolivia.
- Entrega: retiro en tienda o envío nacional.
- Fecha: desde mañana hasta 30 días; la RPC usa el calendario de `America/La_Paz`.
- Confirmación: aceptación obligatoria de que no hay cobros.
- Retiro gratis; envío Bs 25 por debajo de Bs 500 y gratis desde ese importe.

En modo local la confirmación permanece en la interfaz. En modo Supabase, solo se anuncia éxito tras recibir el pedido del servidor; este calcula importes desde el catálogo. El reintento de un mismo envío conserva su identificador para evitar pedidos duplicados. Si el carrito cambia después de confirmar, su limpieza se rechaza y se pide revisarlo.

## Estado, persistencia y acceso

| Datos                       | Comportamiento                                                                                                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Favoritos y carrito locales | Claves compatibles `tenis-favoritos` y `tenis-carrito`; normalización de datos alterados y límite de 10 pares por producto/talla.                                                          |
| Catálogo remoto             | Filas activas para visitantes; el administrador autorizado también puede ver modelos retirados.                                                                                            |
| Selección remota            | Sesión anónima de Auth creada al necesitar una escritura privada; filas con propietario y caché local de selección confirmada. La selección local inicial se importa sin sumar duplicados. |
| Cuenta administrativa       | Inicio de sesión; el permiso depende de `app_metadata.app_role = catalog_admin`, asignado fuera del cliente. No se concede acceso general a pedidos ajenos.                                |
| Preferencias y errores      | Estado local del formulario; se envían exclusivamente las preferencias validadas al confirmar en modo remoto.                                                                              |
| Pedidos y detalles          | Creación transaccional por RPC y lectura del propietario; no se permite editar ni eliminar directamente desde la API.                                                                      |

Una sesión anónima pertenece a ese navegador: borrar su almacenamiento o cerrar su sesión puede impedir recuperar sus datos. No se implementó un sistema de cuentas de clientes recuperables ni una sincronización en tiempo real; las vistas refrescan al recuperar el foco y después de una operación.

## Componentes y organización

| Componente o módulo              | Responsabilidad                                                                    |
| -------------------------------- | ---------------------------------------------------------------------------------- |
| `App`                            | Rutas, página inexistente y producto sobre la vista de origen.                     |
| `Layout`                         | Cabecera, navegación, ubicación, títulos, estado de conexión y pie.                |
| `Hero`, `Catalog`, `ProductCard` | Portada, filtros y tarjetas reutilizadas en Favoritos.                             |
| `Product`, `Cart`, `Checkout`    | Selección de talla, cantidades y confirmación validada.                            |
| `Modal`                          | Fondo inerte, bloqueo de desplazamiento, teclado, cierre y restauración de foco.   |
| `FormField`, `Dropdown`          | Etiquetas, ayudas, errores y selectores accesibles en compra y administración.     |
| `OrderSummary`, `PurchaseSteps`  | Importes coherentes y progreso compartido entre Carrito y Checkout.                |
| `Admin`, `Orders`                | Gestión del catálogo y lectura del historial propio.                               |
| `ShopProvider`                   | Selecciona el proveedor local o remoto sin cambiar los consumidores.               |
| `RemoteShopProvider`             | Sesión, catálogo compartido, escrituras remotas serializadas y retroalimentación.  |
| `shopRepository`                 | Consultas y RPC; lista permitida de campos editables y errores públicos seguros.   |
| `supabaseConfig`                 | Valida configuración pública; la compilación bloquea variables privadas conocidas. |
| `supabase/migrations`            | Esquema, restricciones, RLS, permisos por columna, RPC y catálogo inicial.         |

**Decisión de reutilización:** las vistas consumen el catálogo del mismo proveedor que modifica el carrito. Así un producto creado en administración puede aparecer en colección, modal, carrito y resumen sin agregarlo manualmente al archivo estático. El repositorio separa las operaciones de Supabase del renderizado; `OrderSummary`, `Modal` y `FormField` mantienen la presentación y accesibilidad compartidas.

## Modelo, CRUD y seguridad

El [PDF ER/CRUD](.docs/ER-CRUD/ER-CRUD.pdf) conserva el modelo de referencia de siete páginas: productos, favoritos, líneas de carrito, pedidos, detalles y referencias a Auth. Su [análisis actualizado](.docs/supabase-integration/ANALISIS.md) relaciona cada entidad con la aplicación.

| Dato      | Crear                    | Leer                                   | Actualizar            | Eliminar                                              |
| --------- | ------------------------ | -------------------------------------- | --------------------- | ----------------------------------------------------- |
| Productos | Administrador            | Público: activos; administrador: todos | Administrador         | Baja lógica por administrador; DELETE físico denegado |
| Favoritos | Propietario              | Propietario                            | No aplica             | Propietario                                           |
| Carrito   | Propietario              | Propietario                            | Propietario: cantidad | Propietario                                           |
| Pedidos   | Propietario mediante RPC | Propietario                            | Denegado              | Denegado                                              |
| Detalles  | RPC del pedido           | Propietario del pedido                 | Denegado              | Denegado                                              |

**Regla prioritaria:** toda fila privada requiere que su propietario corresponda a `auth.uid()`. Las RPC con privilegios comprueban esa identidad explícitamente y fijan un `search_path` vacío. Cambiar un ID en el navegador no debe dar acceso a otra cuenta.

**Riesgo y mitigación:** un comprador podría intentar alterar precios o atribuirse un rol. El servidor calcula los totales y usa metadatos confiables de Auth; el cliente no envía importes ni propietario al confirmar. Las claves privadas quedan fuera del código y la compilación rechaza configuraciones públicas con secretos conocidos. Esa comprobación no sustituye una revisión de secretos.

[Checklist de integración](.docs/supabase-integration/CHECKLIST.md) · [Resultados y límites de verificación](.docs/supabase-integration/RESULTADOS.md)

## Accesibilidad y evidencia

Los formularios enfocan un resumen con `role="alert"`, enlazan errores mediante `aria-describedby` y marcan campos inválidos. Los diálogos conservan el ciclo de foco, Escape y la recuperación del foco; los selectores funcionan con teclado. Se respetan movimiento reducido y tamaños móviles.

- [Inicio](docs/01-inicio.png), [colección](docs/02-catalogo.png) y [producto](docs/04-detalle.png).
- [Formulario inválido](docs/12-formulario-errores.png), [válido](docs/13-formulario-valido.png) y [móvil](docs/14-formulario-movil.png).
- [Administración simulada](docs/17-admin-contrato-simulado.png), [historial simulado](docs/18-pedidos-contrato-simulado.png) y [administración móvil simulada](docs/19-admin-movil-contrato-simulado.png).
- [Administración real](docs/20-supabase-admin-real.png), [compra real de demostración](docs/21-supabase-compra-real.png) e [historial persistido](docs/22-supabase-pedido-real.png).
- [Catálogo real con nueve modelos activos](docs/23-supabase-catalogo-real.png).

Se aprobaron diez pruebas Node/PostgreSQL, once de navegador local, cuatro de contrato HTTP simulado, una de navegador contra Supabase real y la comprobación directa remota de permisos y persistencia. El caso real creó, editó y retiró un modelo ficticio de Bs 289, confirmó Bs 314 con envío y verificó su historial. Las cuentas y pedidos de evidencia son sintéticos; el rol administrativo temporal fue retirado al terminar.

El asesor de Supabase no informó errores y dejó nueve advertencias sobre funciones privilegiadas y sesiones anónimas, revisadas en Resultados. Para usar Admin de forma cotidiana, autorizar una cuenta propia siguiendo la guía; las pruebas no entregan credenciales compartidas.

La publicación usa GitHub Actions y conserva la base `/Tenis-Urbano/`. Configurar variables públicas y compilar no demuestra que Pages ya esté actualizado.

# Plan de implementación de Supabase

**Objetivo:** conectar la SPA al modelo del PDF mediante Supabase CLI, con catálogo administrable, datos privados por propietario y confirmación transaccional.

**Arquitectura:** cliente SDK único y adaptadores de datos separados del renderizado. ShopProvider conserva su API y el modo local cuando no existe configuración; en modo remoto, las escrituras solo muestran éxito tras confirmarse. El PDF sigue siendo la especificación de tablas y permisos.

**Especificación:** ../ER-CRUD/ER-CRUD.pdf y PROMPT-INTEGRACION.md.

## Etapas

- [x] Comprobar CLI, acceso, proyecto existente y disponibilidad gratuita; no crear duplicados ni recursos de pago.
- [x] Preparar y validar migraciones de tablas, RLS, permisos por columna y RPC de confirmación/importación.
- [x] Agregar cliente y repositorio con mapeo de catálogo, sesión, favoritos, carrito y pedidos.
- [x] Integrar estado remoto, errores y administración del catálogo sin alterar el diseño ni las rutas existentes.
- [x] Probar adaptadores y permisos, ejecutar la suite de navegador y compilar.
- [x] Aplicar y verificar en el remoto; login completado, plan gratuito comprobado y pruebas reales aprobadas.

## Restricciones

Sin secretos en chat, Git, bundle o evidencias. Mantener HashRouter, las claves locales previas y el máximo de 10 por producto/talla. No reemplazar validaciones por éxito simulado. No eliminar recursos remotos. El rol administrativo proviene de metadatos confiables de Auth.

## Comprobaciones de revisión

Reintentos idempotentes; cambios en otra pestaña después de confirmar; pérdidas de red; productos inactivos; sesión expirada y ninguna lectura privada usando credenciales privilegiadas para fingir RLS.

## Registro

Se inicia la ejecución autorizada por el usuario. La conexión remota depende de comprobar la sesión CLI y un proyecto gratuito disponible. Se trabaja sobre el checkout actual con cambios previos conservados; no se reinicia ni se descarta trabajo existente.

## Avance verificado

- [x] CLI y SDK instalados; configuración creada. Login completado y proyecto gratuito enlazado.
- [x] Migraciones preparadas y ejecutadas en PostgreSQL local con pruebas de restricciones/RLS.
- [x] Cliente, repositorio, mapeo y protección de configuración implementados.
- [x] Proveedor remoto, administración, pedidos y formularios integrados y probados con contratos HTTP simulados.
- [x] Revisión fresca realizada; dos problemas importantes reproducidos y corregidos con regresiones: cambio de propietario y preferencias del recibo.
- [x] Aplicar y verificar el remoto. El bloqueo de login quedó resuelto; proyecto gratuito creado, enlazado y probado.

Las casillas de las etapas originales describían la entrega completa. El detalle local y los pendientes efectivos se mantienen en CHECKLIST.md; RESULTADOS.md diferencia los alcances.

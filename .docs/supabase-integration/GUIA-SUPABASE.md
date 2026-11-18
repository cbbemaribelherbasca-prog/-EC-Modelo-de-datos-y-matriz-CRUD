# Conectar Tenis Urbano con Supabase CLI

## Estado y requisitos

La integración ya está aplicada y verificada contra el proyecto gratuito `tenis-urbano`, referencia pública `luksbjtssyqckmmyooeg`, región `sa-east-1`. Ambas migraciones están aplicadas y Auth anónimo está habilitado. Instalada y comprobada: Supabase CLI 3.2.0. Se requiere Node.js 22.12+ de la línea 22 y Git. El uso del remoto no requiere Docker; un stack Supabase local completo sí lo necesita.

En otra máquina, reutilizar ese proyecto y su configuración pública; no crear otro ni volver a ejecutar init. Los pasos siguientes permiten reproducir o revisar la integración sin duplicar recursos. El bloqueo anterior de login está resuelto.

No subas archivos `.env*` salvo `.env.example`. No pegues tokens, contraseñas ni claves privadas en el chat. Ejecuta los comandos desde la raíz del repositorio. En PowerShell usa los ejecutables `.cmd` para evitar el bloqueo de scripts `.ps1`.

## 1. Instalar y autenticar

```powershell
npm.cmd ci
npx.cmd supabase --version
npx.cmd supabase login
npx.cmd supabase projects list
npx.cmd supabase orgs list
```

Completa el acceso en tu terminal y navegador. Consulta los proyectos antes de crear otro. No es necesario volver a ejecutar `supabase init`: la configuración ya existe.

Si hace falta crear un proyecto, confirma primero en la cuenta que la organización usa el plan gratuito y tiene capacidad disponible. Solo entonces usa el asistente `npx.cmd supabase projects create`; introduce las credenciales localmente y selecciona una región próxima. La CLI no ofrece un flag `--plan free`: no inventarlo ni habilitar ampliaciones o alta disponibilidad. Si no se puede confirmar el coste cero, dejar la creación pendiente.

## 2. Enlazar e inspeccionar

Reemplaza el marcador con la referencia pública del proyecto correcto:

```powershell
npx.cmd supabase link --project-ref REFERENCIA_DEL_PROYECTO
npx.cmd supabase migration list --remote
npx.cmd supabase db query --remote --read-only "select tablename from pg_tables where schemaname='public' order by tablename"
npx.cmd supabase db push --remote --skip-vault --dry-run
```

En la CLI 3.2.0, las operaciones de base de datos apuntan al entorno local por defecto: `--remote` es indispensable. Si existen tablas o migraciones previas, compararlas y adaptar la integración antes de aplicar: no borrar datos, ejecutar resets remotos ni alterar a mano el historial para silenciar conflictos. La migración del esquema no intenta sobrescribir tablas preexistentes; un conflicto detiene su aplicación.

## 3. Aplicar migraciones y verificar metadatos

Tras comprobar que el destino y el esquema son correctos:

```powershell
npx.cmd supabase db push --remote --skip-vault
npx.cmd supabase migration list --remote
npx.cmd supabase db query --remote --read-only --file supabase/verification.sql
npx.cmd supabase db advisors --remote --type all --fail-on error
```

Migraciones esperadas:

- `202611180001_model.sql`: cinco tablas, restricciones, permisos, RLS y RPC.
- `202611180002_catalog.sql`: nueve productos ficticios con IDs conservados. `ON CONFLICT DO NOTHING` conserva filas existentes; no implica que un catálogo anterior coincida automáticamente con el modelo.

`verification.sql` muestra solamente metadatos y un conteo público. No demuestra por sí solo aislamiento entre usuarios.

## 4. Habilitar Auth anónimo

La compra utiliza usuarios anónimos de Supabase Auth, no el rol público sin sesión. La configuración local ya declara su habilitación, pero ese archivo no cambia el servicio remoto automáticamente.

```powershell
npx.cmd supabase config diff
```

Revisa el resultado y conserva las URL y configuraciones existentes que correspondan al proyecto. Para producción, `auth.site_url` debe apuntar al sitio publicado. Cuando el diff contenga únicamente los cambios previstos y gratuitos:

```powershell
npx.cmd supabase config push
```

La CLI muestra el diff y solicita confirmación antes de escribir. No aprobar un diff que modifique otros servicios. Alternativamente habilita únicamente Anonymous Sign-Ins desde Auth en el panel del proyecto. Ten en cuenta sus límites de uso; no crear cuentas anónimas para visitantes que solo leen el catálogo.

## 5. Configuración pública del sitio

```powershell
Copy-Item -LiteralPath .env.example -Destination .env.local
```

Edita `.env.local` localmente con la URL del proyecto y su clave **publishable**. También se admite la clave `anon` heredada; nunca `service_role`, `sb_secret_*`, contraseña de base de datos o token de CLI. La URL y clave publicable se obtienen del apartado Connect/API del proyecto. No ejecutar comandos que revelen todas sus claves.

```text
VITE_SUPABASE_URL=URL_PUBLICA_DEL_PROYECTO
VITE_SUPABASE_PUBLISHABLE_KEY=CLAVE_PUBLICABLE
```

Estas dos variables se incluyen en el navegador y requieren RLS. Reinicia el servidor después de editarlas:

```powershell
npm.cmd run dev
```

Abre `http://127.0.0.1:5173/#/catalogo`. El indicador debe anunciar conexión y mostrar el catálogo remoto; un error no se convierte en una operación local exitosa. La compilación también valida variables para bloquear claves privadas reconocibles antes de generar el bundle. No sustituye una revisión de secretos ni justifica guardar claves privadas en archivos públicos.

## 6. Autorizar una cuenta para productos

Crea una cuenta de administración autorizada mediante Auth del proyecto, sin guardar sus credenciales en el repositorio. Desde una herramienta administrativa de confianza, asigna en `app_metadata` el campo `app_role` con valor `catalog_admin`. Puede hacerse en el editor SQL del proyecto sustituyendo el marcador localmente:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
  || '{"app_role":"catalog_admin"}'::jsonb
where id = '<UUID_DE_LA_CUENTA_AUTORIZADA>'::uuid;
```

Esta operación no pertenece a la aplicación pública. Nunca asignar el permiso desde `user_metadata` ni agregar una clave privilegiada al frontend. Cierra y vuelve a iniciar sesión para renovar los metadatos del token.

Abre `/#/admin`, inicia sesión y usa Nuevo producto, Editar o Retirar. Retirar realiza baja lógica: se preservan referencias e historial. Las imágenes admiten URL HTTPS o un archivo ya incluido en `assets/`; agregar una imagen local nueva requiere reconstruir y publicar el sitio. No se implementó subida a Storage. Para recuperar un producto retirado, edítalo y marca Visible en la colección.

## 7. Comprobar

```powershell
npm.cmd run test:unit
npm.cmd test
npm.cmd run test:remote-ui
npm.cmd run build
```

Las pruebas Node/PostgreSQL ejecutan políticas en PGlite. Las once pruebas originales fuerzan variables vacías para aislar la demostración de `.env.local`; no reutilizan un servidor existente en el puerto 5173. Si hay uno abierto, detenerlo antes de la regresión. Las cuatro pruebas de integración visual usan HTTP interceptado en el puerto 5174 y no necesitan cuenta.

Después de configurar el servicio remoto:

```powershell
npm.cmd run test:live
```

Esta última prueba **sí utiliza el remoto y ya fue aprobada**: crea dos usuarios anónimos sintéticos y dos pedidos ficticios. Comprueba CRUD privado, aislamiento, importación, límites, fecha/aceptación, totales, idempotencia y conflicto de limpieza. No imprime sesiones ni identificadores. Conserva los pedidos de demostración; si se decide retirar las cuentas sintéticas desde Auth, las cascadas eliminarán sus datos. No hacerlo sobre cuentas existentes o reales. Si faltan variables o permisos, termina con error.

La prueba de interfaz real también está disponible y fue aprobada:

```powershell
npm.cmd run test:live-ui
```

Requiere la CLI autenticada y permiso administrativo sobre el proyecto enlazado. Crea una cuenta sintética, le asigna temporalmente el rol mediante CLI, prueba altas/edición/retiro desde la interfaz y la compra/historial, y retira el rol al terminar. Usa el puerto 5175 y la clave publicable; no coloca el token CLI en el navegador. Deja el producto ficticio retirado y el pedido como evidencia. No ejecutar repetidamente: consume la cuota de Auth y crea datos de demostración adicionales. No activar trazas ni vídeos con sesiones de Auth.

Comprueba además manualmente el CRUD de catálogo con la cuenta administrativa y con otra cuenta sin ese permiso; intenta leer una fila privada ajena desde la API como usuario normal. Actualiza CHECKLIST.md solo después de verificarlo. No usar una clave privilegiada para fingir que RLS funciona.

## 8. Publicar en Pages

En GitHub, configura las variables de Actions `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` con sus valores públicos. El workflow ya las pasa a la compilación. No agregar secretos del servidor. Pages debe tener GitHub Actions como fuente. Subir a `main` o ejecutar el workflow manualmente, revisar su resultado y abrir el sitio publicado antes de declarar el despliegue verificado.

## Retomar sin repetir recursos

Revisar CHECKLIST.md, autenticar CLI, consultar proyectos existentes, enlazar el elegido, comprobar historial y esquema, aplicar solo migraciones pendientes y completar pruebas reales. Si la sesión ya existe, no volver a crear un proyecto o las tablas. No se creó un ZIP nuevo ni se hicieron commits/push durante esta actualización.

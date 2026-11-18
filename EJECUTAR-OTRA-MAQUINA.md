# Ejecutar Tenis Urbano en otra máquina

## Requisitos

- Node.js 22.12 o posterior de la línea 22, con npm. Verificado con Node 22.17.0.
- Navegador actualizado e Internet para instalar dependencias y utilizar Supabase.
- Git si vas a conservar el historial o subir cambios; no es necesario para abrir el sitio.

En Windows PowerShell, usa `npm.cmd` y `npx.cmd` para evitar el bloqueo de scripts `.ps1`.
En macOS/Linux usa `npm` y `npx`.

## 1. Extraer e instalar

Extrae `Tenis-Urbano-Supabase.zip` en una carpeta propia. Abre una terminal en esa
carpeta: debes ver `package.json`, `package-lock.json` e `index.html` al mismo nivel.

```powershell
node --version
npm.cmd ci
```

El ZIP incluye el código, imágenes, pruebas, documentación, evidencia y migraciones.
Las dependencias se recuperan desde el lockfile. Se excluyeron `.git`, `node_modules`,
`dist`, resultados temporales, `.env.local` y credenciales.

## 2. Abrir el sitio

```powershell
npm.cmd run dev
```

Abre `http://127.0.0.1:5173/#/`. Si el puerto está ocupado, usa la dirección que
muestre Vite. Mantén la terminal abierta; `Ctrl+C` detiene el servidor.

Sin configuración de Supabase funciona la demostración local: catálogo, favoritos,
carrito y formulario. Para consultar y guardar en la base remota, completa el paso 3.
React requiere el servidor Vite; no abrir `index.html` con doble clic o Live Server.

## 3. Conectar el mismo Supabase

El proyecto remoto ya existe y sus migraciones están aplicadas. Reutiliza
`tenis-urbano`, referencia pública `luksbjtssyqckmmyooeg`; no crees otro proyecto ni
reinicies la base para ejecutar la tienda en otra máquina.

Detén Vite y crea la configuración local:

```powershell
Copy-Item -LiteralPath .env.example -Destination .env.local
```

En macOS/Linux: `cp .env.example .env.local`. Edita `.env.local` en el editor:

```dotenv
VITE_SUPABASE_URL=https://luksbjtssyqckmmyooeg.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=PEGA_AQUI_LA_CLAVE_PUBLISHABLE
```

Obtén la clave **publishable** desde Connect/API Keys en el panel del proyecto.
La URL y esa clave son configuración pública del navegador y dependen de las
políticas RLS. No uses `service_role`, `sb_secret_*`, contraseña de base de datos
ni token de CLI. Conserva `.env.local` fuera del commit y de archivos ZIP públicos.

Vuelve a ejecutar:

```powershell
npm.cmd run dev
```

En Colección debe aparecer **Catálogo conectado a Supabase** y los nueve modelos
activos. El comprador obtiene una sesión anónima al necesitar guardar una selección.
En otra máquina se crea una sesión propia: el carrito del navegador anterior no se
transfiere automáticamente. Un error remoto debe mostrarse como error.

Para revisar el sitio basta con la configuración pública y el SDK instalado por npm.
La autenticación de Supabase CLI se utiliza para administrar el proyecto y ejecutar
pruebas privilegiadas, no para navegar como comprador.

## 4. Verificar la entrega

```powershell
npm.cmd run build
npm.cmd run preview
```

La vista previa normalmente abre en `http://127.0.0.1:4173/#/`.
Puedes revisar Inicio, Colección, Favoritos, Producto, Carrito y Checkout.
En modo remoto también está Mis pedidos. La compra es de demostración y no cobra.

Comprobaciones locales opcionales:

```powershell
npm.cmd run test:unit
npm.cmd run format:check
```

Las pruebas de navegador requieren Microsoft Edge instalado. Detén el servidor de
desarrollo antes de `npm.cmd test`, porque la suite usa el puerto 5173. Las pruebas
`test:live` y `test:live-ui` crean datos sintéticos en Supabase y consumen cuota:
consulta su alcance en `.docs/supabase-integration/GUIA-SUPABASE.md` antes de usarlas.

## 5. Administrar productos

Abre `http://127.0.0.1:5173/#/admin`. Para crear, editar o retirar modelos necesitas
una cuenta de Auth autorizada con `app_metadata.app_role = catalog_admin`.
El ZIP no contiene una cuenta ni contraseña compartida. Sigue el apartado 6 de
`.docs/supabase-integration/GUIA-SUPABASE.md` para autorizar tu cuenta desde una
herramienta de confianza. El inicio de sesión del panel Supabase y el de la tienda
son accesos diferentes.

## 6. Copiar sobre el repositorio HTML anterior

Primero conserva cualquier trabajo pendiente. Copia el contenido extraído a la raíz
del repositorio existente, donde está su `package.json`, conservando su carpeta
`.git`. La entrada React nueva es `index.html` y `src/main.jsx`; `app.js` se conserva
como referencia histórica. No copies `node_modules` de otra máquina.

Después ejecuta `npm.cmd ci` y configura `.env.local` según el paso 3.
Revisa `git status` antes de preparar un commit y comprueba que `.env.local`,
`node_modules` y `dist` no aparezcan entre los archivos agregados.

Este ZIP no publica GitHub Pages. Para publicar, sigue `.github/workflows/deploy.yml`
y configura las dos variables públicas de Supabase en GitHub Actions conforme a
la guía de integración.

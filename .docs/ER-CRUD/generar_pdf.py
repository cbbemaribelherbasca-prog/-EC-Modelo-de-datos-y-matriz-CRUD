from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Flowable
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.pagesizes import A4

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
OUT = HERE / 'ER-CRUD.pdf'
pdfmetrics.registerFont(TTFont('Segoe', 'C:/Windows/Fonts/segoeui.ttf'))
pdfmetrics.registerFont(TTFont('SegoeBold', 'C:/Windows/Fonts/segoeuib.ttf'))
pdfmetrics.registerFontFamily('Segoe', normal='Segoe', bold='SegoeBold', italic='Segoe', boldItalic='SegoeBold')
NAVY = colors.HexColor('#18252b'); GREEN = colors.HexColor('#526b39'); LIGHT = colors.HexColor('#edf1e6')
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='TitleTU', fontName='SegoeBold', fontSize=26, leading=31, textColor=NAVY, spaceAfter=15))
styles.add(ParagraphStyle(name='H2TU', fontName='SegoeBold', fontSize=13, leading=17, textColor=NAVY, spaceBefore=14, spaceAfter=8))
styles.add(ParagraphStyle(name='BodyTU', fontName='Segoe', fontSize=9.4, leading=14, textColor=NAVY, spaceAfter=9))
styles.add(ParagraphStyle(name='SmallTU', fontName='Segoe', fontSize=8.2, leading=11.5, textColor=NAVY, spaceAfter=7))
styles.add(ParagraphStyle(name='CellTU', fontName='Segoe', fontSize=8.1, leading=11.5, textColor=NAVY))
styles.add(ParagraphStyle(name='CellHeadTU', fontName='SegoeBold', fontSize=8.2, leading=11.5, textColor=colors.white))
styles.add(ParagraphStyle(name='KickerTU', fontName='SegoeBold', fontSize=8.5, leading=12, textColor=GREEN, spaceAfter=12))
W = A4[0] - 96
story=[]; markdown=[]

def p(text, style='BodyTU'):
    return Paragraph(text, styles[style])
def body(text):
    story.append(p(text)); markdown.append(text.replace('<b>','').replace('</b>',''))
def heading(text):
    story.append(p(text, 'H2TU')); markdown.append('\n## '+text)
def title(num, text, subtitle):
    if story: story.append(PageBreak())
    story.append(p(f'H4 / MODELO DE DATOS / {num:02d}', 'KickerTU'))
    story.append(p(text, 'TitleTU')); story.append(p(subtitle, 'BodyTU'))
    markdown.append(f'\n# Página {num}: {text}\n\n{subtitle}')
def table(headers, rows, widths):
    data=[[p(escape(str(v)), 'CellHeadTU') for v in headers]] + [[p(escape(str(v)), 'CellTU') for v in row] for row in rows]
    t=Table(data, colWidths=[W*x for x in widths], hAlign='LEFT', repeatRows=1)
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),NAVY),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,colors.HexColor('#f3f5f0')]),('LINEBELOW',(0,0),(-1,0),0.6,NAVY),('LINEBELOW',(0,1),(-1,-1),0.35,colors.HexColor('#e0e5da'))]))
    story.append(t); story.append(Spacer(1,9))
    markdown.extend(['\n| '+' | '.join(headers)+' |','| '+' | '.join(['---']*len(headers))+' |'])
    markdown.extend('| '+' | '.join(str(v).replace('\n',' ') for v in row)+' |' for row in rows)

class ERDiagram(Flowable):
    def __init__(self): Flowable.__init__(self); self.width=W; self.height=285
    def draw(self):
        c=self.canv
        boxes={'users':(0,205,145,66),'products':(W-145,205,145,66),'favorites':(0,105,145,66),'cart':((W-145)/2,105,145,66),'orders':(0,5,145,66),'items':(W-145,5,145,66)}
        c.setStrokeColor(colors.HexColor('#9eae91'));c.setLineWidth(1)
        def line(points,label,lx,ly):
            path=c.beginPath();path.moveTo(*points[0])
            for pt in points[1:]:path.lineTo(*pt)
            c.drawPath(path);c.setFont('SegoeBold',7);c.setFillColor(GREEN);c.drawString(lx,ly,label)
        line([(72,205),(72,171)],'1 : N',79,185)
        line([(145,238),(250,238),(250,171)],'1 : N',199,244)
        line([(0,238),(-12,238),(-12,39),(0,39)],'1 : N',2,83)
        line([(W-145,238),(320,238),(320,190),(130,190),(130,171)],'1 : N',197,193)
        line([(W-72,205),(W-72,187),(290,187),(290,171)],'1 : N',W-69,183)
        line([(W-72,205),(W-72,71)],'1 : N',W-69,92)
        line([(145,39),(W-145,39)],'1 : N',224,45)
        labels={
          'users':('auth.users','PK id (UUID)','Identidad gestionada'),
          'products':('products','PK id (bigint)','Catálogo y disponibilidad'),
          'favorites':('favorites','PK user_id + product_id','Relación usuario / producto'),
          'cart':('cart_items','PK usuario + producto + talla','qty: entero entre 1 y 10'),
          'orders':('orders','PK id; FK user_id','Confirmación de demostración'),
          'items':('order_items','PK pedido + producto + talla','Precio y nombre instantáneos')}
        for key,(x,y,w,h) in boxes.items():
            c.setFillColor(LIGHT);c.setStrokeColor(colors.HexColor('#d6dfce'));c.roundRect(x,y,w,h,7,fill=1,stroke=1)
            a,b,d=labels[key];c.setFillColor(NAVY);c.setFont('SegoeBold',10);c.drawString(x+10,y+h-18,a)
            c.setFont('Segoe',7.1);c.drawString(x+10,y+h-34,b);c.drawString(x+10,y+h-48,d)

# Page 1


title(1, 'Modelo de datos\ny matriz CRUD', 'Tenis Urbano / H4 - Evaluación continua / 18 de noviembre de 2026')
body('<b>Propósito.</b> Definir entidades, campos, relaciones y permisos del caso para una futura integración con Supabase. Este documento es un modelo objetivo, no evidencia de una base de datos remota ya desplegada.')
heading('Estado actual y alcance objetivo')
table(['Flujo','Hoy en la SPA','Destino propuesto'],[
('Catálogo','Nueve objetos locales en src/data/products.js.','products, conservando los identificadores 1 a 9.'),
('Favoritos','Lista de IDs en localStorage.','favorites, con propietario autenticado.'),
('Carrito','Líneas id, size, qty; reducer compartido.','cart_items, con unicidad y máximo de 10 pares por talla.'),
('Confirmación','Preferencias locales y modal; no existe pedido remoto.','orders y order_items: extensión propuesta para registrar la demostración.'),
('Identidad','No hay autenticación ni roles reales.','auth.users y RLS para aislar datos privados.')],[.17,.39,.44])
heading('Actores y minimización de datos')
body('<b>V:</b> visitante sin sesión. <b>P:</b> propietario con sesión Supabase válida. <b>A:</b> administrador de catálogo con rol asignado por un proceso confiable. <b>S:</b> servicio o función transaccional que actúa dentro de permisos limitados.')
body('Una sesión anónima de Supabase Auth puede representar a P sin solicitar nombre, correo o teléfono. No debe confundirse con el rol de base de datos anon, que corresponde a peticiones sin sesión de usuario. La sesión no garantiza recuperación desde otro dispositivo.')
heading('Decisiones que amplían el modelo actual')
body('Se proponen is_active y marcas de tiempo en catálogo, identidad de propietario e historial de pedidos de demostración. No se agregan stock, pagos reales, direcciones ni perfiles personales. Estas extensiones son requisitos de diseño para la integración futura y no describen funciones existentes.')

# Page 2
title(2, 'Entidades y relaciones', 'Notación: PK = clave primaria; FK = clave foránea; 1 : N = uno a muchos.')
story.append(ERDiagram());story.append(Spacer(1,10))
table(['Origen → destino','Cardinalidad','FK y eliminación'],[
('auth.users → favorites','1 a 0..N','user_id; ON DELETE CASCADE.'),
('auth.users → cart_items','1 a 0..N','user_id; ON DELETE CASCADE.'),
('auth.users → orders','1 a 0..N','user_id; CASCADE para esta demostración sin retención fiscal.'),
('products → favorites','1 a 0..N','product_id; RESTRICT. El producto se desactiva.'),
('products → cart_items','1 a 0..N','product_id; RESTRICT. Informar si está inactivo.'),
('products → order_items','1 a 0..N','product_id; RESTRICT. Conservar historial.'),
('orders → order_items','1 a 1..N','order_id; CASCADE. La función exige al menos una línea.')],[.34,.16,.5])
body('favorites resuelve la relación N : M entre usuarios y productos. cart_items diferencia selecciones por talla. order_items conserva el detalle del pedido. Desactivar un producto impide confirmaciones nuevas, pero mantiene las referencias; la interfaz debe permitir retirar las líneas no disponibles.')

# Page 3
title(3, 'Diccionario / catálogo', 'Tabla public.products. Nulabilidad: NN = NOT NULL; NULL = opcional.')
product_rows=[
('id','bigint','PK, NN','Identidad generada; conservar IDs existentes al importar.'),
('name','text','NN','Texto no vacío, hasta 120 caracteres.'),
('audience','text','NN','Hombre, Mujer o Niños.'),
('style','text','NN','Running, Urbano o Casual.'),
('color','text','NN','Texto no vacío, hasta 120 caracteres.'),
('price','numeric(10,2)','NN','Mayor que 0. Precio vigente en Bs.'),
('old_price','numeric(10,2)','NULL','Si existe, mayor que price. Por defecto NULL.'),
('image_path','text','NN','Ruta de un recurso público permitido; no incluir secretos.'),
('badge','text','NN','Por defecto texto vacío; máximo 40 caracteres.'),
('description','text','NN','Texto no vacío; hasta 1500 caracteres.'),
('is_active','boolean','NN','Por defecto true. Baja lógica, sin borrar referencias.'),
('created_at','timestamptz','NN','Por defecto now(); no editable desde el cliente.')]
table(['Campo','PostgreSQL','Clave / nulo','Regla / valor por defecto'],product_rows,[.18,.22,.15,.45])
heading('Correspondencia con React')
body('oldPrice se corresponde con old_price; image con image_path. Los demás campos de producto mantienen su significado. El adaptador debe resolver imágenes locales con Vite o usar URLs públicas permitidas. El precio nunca se recupera desde una propiedad agregada al carrito por el cliente.')
body('is_active y created_at son extensiones propuestas. El público ve productos activos; A puede consultar y editar el catálogo completo. No hay DELETE físico expuesto por la API: la baja se realiza actualizando is_active.')

# Page 4
title(4, 'Diccionario / selección privada', 'Supabase administra auth.users. No crear una copia pública de correos, contraseñas ni tokens.')
table(['Entidad / campo','Tipo','Clave / nulo','Regla / valor por defecto'],[
('auth.users.id','uuid','PK, NN','Identificador gestionado por Auth; no escribir directamente.'),
('favorites.user_id','uuid','PK, FK, NN','Propietario: auth.users.id; obtenerlo de la sesión.'),
('favorites.product_id','bigint','PK, FK, NN','Referencia a products.id.'),
('favorites.created_at','timestamptz','NN','Por defecto now(); generado por servidor.'),
('cart_items.user_id','uuid','PK, FK, NN','Propietario: auth.users.id.'),
('cart_items.product_id','bigint','PK, FK, NN','Referencia a products.id.'),
('cart_items.size','smallint','PK, NN','Valor entero entre 35 y 42.'),
('cart_items.qty','smallint','NN','Por defecto 1; CHECK entre 1 y 10.'),
('cart_items.updated_at','timestamptz','NN','now() al crear; trigger confiable al actualizar.')],[.29,.19,.17,.35])
heading('Integridad e índices')
body('PK favorites = (user_id, product_id). PK cart_items = (user_id, product_id, size). Estas claves evitan duplicados por propietario. Añadir índices en product_id para las referencias y en orders(user_id, created_at) para el historial. La FK de cada relación se detalla en la página 2.')
heading('Reglas al sincronizar')
body('La lectura remota solo devuelve filas propias. La importación de una selección local se ejecuta una vez por sesión/estado importado y mediante upsert idempotente; reintentar no debe sumar unidades de nuevo. Normalizar cantidades y duplicados antes de importar, y volver a validar en la base de datos.')
body('P puede modificar únicamente qty en una línea existente. Cambiar la talla significa eliminar la línea original y crear otra dentro de la misma operación controlada. Los identificadores y marcas de tiempo no se reasignan con un UPDATE del navegador.')

# Page 5
title(5, 'Diccionario / pedido de demostración', 'Extensión propuesta: registrar la confirmación sin cobrar ni solicitar información personal.')
order_rows=[
('orders.id','uuid','PK, NN; gen_random_uuid().'),
('orders.user_id','uuid','FK, NN; identidad de la sesión, nunca del cuerpo de la petición.'),
('orders.request_id','uuid','NN; UNIQUE(user_id, request_id) para reintentos idempotentes.'),
('orders.department','text','NN; uno de los nueve departamentos del formulario.'),
('orders.delivery_method','text','NN; pickup o delivery.'),
('orders.preferred_date','date','NN; validar mañana..30 días al crear, en America/La_Paz.'),
('orders.demo_ack','boolean','NN; exigir true, sin aceptación implícita.'),
('orders.subtotal','numeric(10,2)','NN; suma del detalle, calculada en servidor.'),
('orders.shipping','numeric(10,2)','NN; 0 o 25 según modalidad y subtotal.'),
('orders.total','numeric(10,2)','NN; subtotal + shipping, calculado en servidor.'),
('orders.created_at','timestamptz','NN; now().'),
('order_items.order_id','uuid','PK, FK, NN; referencia a orders.id.'),
('order_items.product_id','bigint','PK, FK, NN; referencia a products.id.'),
('order_items.size','smallint','PK, NN; 35..42.'),
('order_items.qty','smallint','NN; CHECK entre 1 y 10.'),
('order_items.unit_price','numeric(10,2)','NN; instantánea del precio del catálogo, mayor que 0.'),
('order_items.product_name','text','NN; instantánea del nombre para el historial.')]
table(['Campo','PostgreSQL','Restricción / valor por defecto'],order_rows,[.32,.22,.46])
body('Los nueve departamentos son Beni, Chuquisaca, Cochabamba, La Paz, Oruro, Pando, Potosí, Santa Cruz y Tarija. La validación de fechas se ejecuta al crear el pedido; no usar un CHECK dependiente del paso del tiempo como única defensa.')

# Page 6
title(6, 'Matriz CRUD por actor y dato', 'V = visitante; P = propietario autenticado; A = administrador de catálogo; S = función de servidor.')
crud_rows=[
('products: datos comerciales','A','V/P: activos; A: todos','A','A: baja lógica'),
('products.id y created_at','S al alta de A','Igual al producto','Nadie','Sin DELETE físico'),
('products.is_active','S: true al alta','Igual al producto','Solo A','No aplica'),
('favorites: claves y fecha','P, solo propia','P, solo propia','No aplica; D + C','P, solo propia'),
('cart_items: claves y fecha','P, solo propia','P, solo propia','Identidad no; fecha S','P, solo propia'),
('cart_items.qty','P, de 1 a 10','P, solo propia','P, de 1 a 10','P, eliminando línea'),
('orders: preferencias / dueño','P vía RPC; S valida','P: propios','Nadie desde cliente','Sin borrado directo'),
('orders: IDs, totales y fecha','S dentro de RPC','P: propios','Nadie desde cliente','Sin borrado directo'),
('order_items: todos los datos','S dentro de RPC','P: detalle propio','Nadie desde cliente','Sin borrado directo'),
('auth.users','Solo mecanismo Auth','Solo identidad de sesión','Solo mecanismo Auth','Flujo privilegiado de cuenta')]
table(['Dato','Crear','Leer','Actualizar','Eliminar'],crud_rows,[.32,.18,.2,.16,.14])
heading('Notas de autorización')
body('Las filas privadas de un usuario no son legibles por V ni por otro P. A administra catálogo, pero no recibe acceso general a carritos, favoritos o pedidos de terceros. Las operaciones sin permiso se deniegan por defecto. Las cascadas por eliminación de cuenta no conceden DELETE directo a la aplicación.')
heading('Confirmación transaccional')
body('Una RPC de confirmación verifica sesión, aceptación, fecha, catálogo activo y líneas 1..10; consulta precios vigentes y genera cabecera y detalle en una transacción. Un request_id repetido devuelve el mismo pedido. Envío: retiro gratis; delivery Bs 25 si subtotal es menor que Bs 500, gratis desde Bs 500. Rechazar carrito vacío y productos no disponibles.')
body('La RPC no vacía la selección al abrir el modal. Mantener el contrato de la SPA: Volver al catálogo elimina las líneas propias después del éxito; X o Escape conserva la selección. No afirmar que se recibió un pedido si falla la solicitud remota.')

# Page 7
title(7, 'Seguridad, riesgo y verificación', 'Regla prioritaria: aislar datos por propietario y no confiar en valores de autoridad enviados por el navegador.')
heading('Regla indispensable y justificación')
body('<b>RLS en todas las tablas expuestas</b>, junto con GRANT mínimos. En favorites y cart_items, leer y modificar exige user_id = auth.uid(); INSERT debe comprobar el propietario y UPDATE verificar la fila original y la resultante. El dueño de un pedido se valida en orders; el acceso a order_items deriva del pedido, no de un user_id proporcionado por el cliente. [S1]')
body('La finalidad es impedir que cambiar un identificador revele o altere datos ajenos. Ocultar botones no aplica esta defensa. A se reconoce con un rol confiable asignado fuera del cliente, por ejemplo app_metadata gestionado de forma privilegiada; nunca mediante user_metadata editable. Las claves secretas o service_role no van al frontend. [S1, S2]')
heading('Riesgos y mitigación')
table(['Riesgo','Mitigación propuesta'],[
('Leer o modificar la selección de otro usuario.','RLS por propietario, políticas por operación y pruebas con dos sesiones aisladas.'),
('Modificar precio, total, dueño o rol desde DevTools.','RPC obtiene dueño y precios desde fuentes confiables; limitar columnas actualizables; no confiar en estado local.'),
('Pedido duplicado por doble envío o reintento de red.','Transacción y request_id único por propietario; mismo resultado para el mismo intento.'),
('Exponer una clave privada en Vite, Git o capturas.','Solo URL y clave publicable en cliente; secretos fuera de VITE_* y del repositorio; evidencia redactada.')],[.42,.58])
heading('Prueba de aceptación y duda técnica')
body('<b>Prueba futura:</b> P1 crea una línea; P2 intenta leerla, cambiar qty, transferir user_id y eliminarla. Todas las operaciones ajenas deben quedar sin acceso o sin efecto y la fila debe conservarse. Como propietario, qty = 11 debe rechazarse. A puede desactivar un producto, pero no consultar carritos privados. Estas pruebas remotas aún no fueron ejecutadas.')
body('<b>Duda:</b> si otra pestaña cambia el carrito después de confirmar el pedido, ¿se debe advertir antes de vaciarlo o eliminar solo las líneas que siguen coincidiendo con la instantánea confirmada? La sincronización entre pestañas queda fuera del modelo actual y debe resolverse antes de una compra real.')
heading('Fuentes y estado de la entrega')
for text,url in [('S1 - RLS y políticas','https://supabase.com/docs/guides/database/postgres/row-level-security'),('S2 - Claves publicables y privadas','https://supabase.com/docs/guides/getting-started/api-keys'),('S3 - Sesiones anónimas de Auth','https://supabase.com/docs/guides/auth/auth-anonymous'),('S4 - CLI y proyecto remoto','https://supabase.com/docs/guides/local-development/cli/getting-started')]:
    story.append(p(f'<b>{text}:</b> <link href="{url}" color="#526b39">documentación oficial</link>', 'SmallTU'))

def footer(c,doc):
    c.saveState();c.setStrokeColor(colors.HexColor('#dce2d5'));c.line(48,44,A4[0]-48,44)
    c.setFont('Segoe',8);c.setFillColor(colors.HexColor('#66706d'));c.drawString(48,29,'TENIS URBANO / MODELO OBJETIVO / EVIDENCIA SEGURA')
    c.drawRightString(A4[0]-48,29,f'{doc.page} / 7');c.restoreState()

doc=SimpleDocTemplate(str(OUT),pagesize=A4,rightMargin=48,leftMargin=48,topMargin=40,bottomMargin=60,title='H4 - Modelo de datos y matriz CRUD - Tenis Urbano',author='Tenis Urbano',subject='Modelo objetivo y permisos para integración futura con Supabase')
doc.build(story,onFirstPage=footer,onLaterPages=footer)
markdown.extend([
    '\n## Fuentes oficiales',
    '- S1: https://supabase.com/docs/guides/database/postgres/row-level-security',
    '- S2: https://supabase.com/docs/guides/getting-started/api-keys',
    '- S3: https://supabase.com/docs/guides/auth/auth-anonymous',
    '- S4: https://supabase.com/docs/guides/local-development/cli/getting-started',
])
(HERE/'MODELO.md').write_text('\n\n'.join(markdown)+'\n',encoding='utf-8')
print(OUT)


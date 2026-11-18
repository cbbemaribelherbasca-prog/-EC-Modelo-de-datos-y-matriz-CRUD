-- Catálogo sintético, IDs estables; no sobreescribir productos existentes.
insert into public.products(id,name,audience,style,color,price,old_price,image_path,badge,description) values
(1,'Órbita Cobalto','Niños','Running','Blanco / Cobalto',429,529,'assets/zapatillas neon.png','-19%','Tenis ligero con amortiguación suave y malla respirable para acompañar tus recorridos diarios.'),
(2,'Pulso Negro','Hombre','Running','Negro / Crema',389,469,'assets/tenis-negro.png','-17%','Silueta robusta con suela de gran tracción y soporte estable para moverte con seguridad.'),
(3,'Arena Club','Mujer','Casual','Arena / Goma',349,null,'assets/botin-cafe.png','Nuevo','Perfil casual, tonos neutros y plantilla acolchada para combinar comodidad y estilo todos los días.'),
(4,'Vector Azul','Hombre','Urbano','Blanco / Azul',419,null,'assets/tenis-cobalto.png','Nuevo','Una propuesta urbana limpia con detalles azules y una suela flexible pensada para la ciudad.'),
(5,'Noche Uno','Niños','Urbano','Negro / Marfil',359,449,'assets/zapatillas princesa.png','-20%','Volumen contemporáneo y contraste sutil para llevar desde la mañana hasta la noche.'),
(6,'Duna 02','Hombre','Casual','Beige / Goma',329,null,'assets/tenis-arena.png','Esencial','Tenis versátil con acabado suave, suela de goma y una estética minimalista fácil de combinar.'),
(7,'Cima Pro','Mujer','Running','Blanco / Cobalto',459,549,'assets/botas cafe.png','-16%','Respuesta ágil, ajuste cómodo y una base estable para entrenamientos y días de mucho movimiento.'),
(8,'Distrito','Mujer','Urbano','Negro / Crema',379,null,'assets/tenis beige.png','Nuevo','Diseño urbano de líneas marcadas con comodidad interior para recorrer la ciudad sin pausa.'),
(9,'Lino Natural','Niños','Casual','Arena / Miel',319,379,'assets/zapatillas drew.png','-16%','Texturas naturales y tonos cálidos en una silueta relajada para tus planes de fin de semana.')
on conflict (id) do nothing;
select setval(pg_get_serial_sequence('public.products','id'),greatest((select max(id) from public.products),1),true);

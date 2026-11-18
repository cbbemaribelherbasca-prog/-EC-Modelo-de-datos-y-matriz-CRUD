export function validateProduct(values) {
  const errors = {};
  for (const [key, limit] of [
    ['name', 120],
    ['color', 120],
    ['description', 1500],
  ]) {
    if (!values[key]?.trim() || values[key].trim().length > limit)
      errors[key] = `Escribe entre 1 y ${limit} caracteres.`;
  }
  if (!['Hombre', 'Mujer', 'Niños'].includes(values.audience))
    errors.audience = 'Selecciona una categoría válida.';
  if (!['Running', 'Urbano', 'Casual'].includes(values.style))
    errors.style = 'Selecciona un estilo válido.';
  const validPrice = (value) =>
    /^\d+(\.\d{1,2})?$/.test(String(value)) &&
    Number(value) > 0 &&
    Number(value) <= 99999999.99;
  if (!validPrice(values.price))
    errors.price = 'Ingresa un precio positivo con hasta dos decimales.';
  if (
    values.old_price &&
    (!validPrice(values.old_price) || Number(values.old_price) <= Number(values.price))
  )
    errors.old_price = 'El precio anterior debe ser mayor que el precio actual.';
  const image = values.image_path?.trim() || '';
  let validImage =
    /^assets\/[a-zA-Z0-9_ ./-]+\.(png|jpe?g|webp|avif)$/i.test(image) &&
    !image.includes('..');
  try {
    const url = new URL(image);
    validImage = url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    /* También se aceptan recursos locales. */
  }
  if (!validImage || image.length > 500)
    errors.image_path = 'Usa una imagen HTTPS o una ruta de assets válida.';
  if ((values.badge || '').length > 40) errors.badge = 'Usa como máximo 40 caracteres.';
  return errors;
}

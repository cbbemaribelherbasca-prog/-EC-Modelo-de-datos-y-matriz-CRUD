import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProduct } from '../src/data/productValidation.js';

test('product form rejects unsafe images, empty values and invalid prices', () => {
  const errors = validateProduct({
    name: '',
    price: '-1',
    old_price: '0',
    image_path: 'javascript:alert(1)',
  });
  assert.ok(errors.name);
  assert.ok(errors.price);
  assert.ok(errors.image_path);
});

test('product form accepts a complete product with an optional previous price', () => {
  assert.deepEqual(
    validateProduct({
      name: 'Modelo de prueba',
      audience: 'Hombre',
      style: 'Casual',
      color: 'Azul',
      price: '350.25',
      old_price: '',
      image_path: 'assets/tenis-cobalto.png',
      description: 'Descripción de demostración',
      badge: '',
    }),
    {}
  );
});

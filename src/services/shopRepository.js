function unwrap(result) {
  if (result.error) {
    const message = result.error.message || '';
    const permitted = [
      '10 pares',
      'Producto no disponible',
      'Retira el producto',
      'El carrito cambió',
      'Fecha de entrega inválida',
      'El carrito está vacío',
    ];
    throw new Error(
      permitted.some((text) => message.includes(text))
        ? message
        : 'No pudimos completar la operación remota. Revisa la conexión o los permisos y vuelve a intentarlo.'
    );
  }
  return result.data;
}

export function createShopRepository(client) {
  return {
    async catalog(admin = false) {
      let query = client.from('products').select('*').order('id');
      if (!admin) query = query.eq('is_active', true);
      return unwrap(await query);
    },
    async selection(userId) {
      const [favorites, cart] = await Promise.all([
        client.from('favorites').select('product_id').eq('user_id', userId),
        client.from('cart_items').select('product_id,size,qty').eq('user_id', userId),
      ]);
      return {
        favorites: unwrap(favorites).map((row) => row.product_id),
        cart: unwrap(cart).map((row) => ({
          id: row.product_id,
          size: row.size,
          qty: row.qty,
        })),
      };
    },
    async importSelection(favorites, cart) {
      unwrap(
        await client.rpc('import_selection', { p_favorites: favorites, p_cart: cart })
      );
    },
    async adjustCart(id, size, delta) {
      unwrap(
        await client.rpc('adjust_cart_item', {
          p_product_id: id,
          p_size: size,
          p_delta: delta,
        })
      );
    },
    async favorite(userId, id, exists) {
      unwrap(
        exists
          ? await client
              .from('favorites')
              .delete()
              .eq('user_id', userId)
              .eq('product_id', id)
          : await client.from('favorites').insert({ user_id: userId, product_id: id })
      );
    },
    async confirmOrder(requestId, values) {
      return unwrap(
        await client.rpc('confirm_order', {
          p_request_id: requestId,
          p_department: values.department,
          p_method: values.method,
          p_date: values.date,
          p_ack: values.accepted,
        })
      );
    },
    async orders(userId) {
      return unwrap(
        await client
          .from('orders')
          .select(
            'id,department,delivery_method,preferred_date,total,created_at,order_items(product_name,size,qty,unit_price)'
          )
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
      );
    },
    async clearConfirmed(orderId) {
      unwrap(await client.rpc('clear_confirmed_cart', { p_order_id: orderId }));
    },
    async saveProduct(values, id) {
      const allowed = [
        'name',
        'audience',
        'style',
        'color',
        'price',
        'old_price',
        'image_path',
        'badge',
        'description',
        'is_active',
      ];
      const data = Object.fromEntries(
        allowed
          .filter((field) => Object.hasOwn(values, field))
          .map((field) => [field, values[field]])
      );
      return unwrap(
        id
          ? await client.from('products').update(data).eq('id', id).select().single()
          : await client.from('products').insert(data).select().single()
      );
    },
    async deactivate(id) {
      unwrap(
        await client
          .from('products')
          .update({ is_active: false })
          .eq('id', id)
          .select()
          .single()
      );
    },
  };
}

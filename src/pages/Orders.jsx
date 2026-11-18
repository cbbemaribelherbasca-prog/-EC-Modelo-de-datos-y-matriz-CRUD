import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useShop } from '../context/ShopContext';
import { money } from '../data/products';

export default function Orders() {
  const { remote, user, status, loadOrders } = useShop();
  const [result, setResult] = useState({ owner: null, items: [] });
  const orders = user && result.owner === user.id ? result.items : [];
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    setResult({ owner: null, items: [] });
    setError('');
    if (remote && user && status === 'ready') {
      setLoading(true);
      loadOrders()
        .then((data) => {
          if (current) {
            setResult({ owner: user.id, items: data });
            setError('');
          }
        })
        .catch((failure) => {
          if (current) setError(failure.message);
        })
        .finally(() => {
          if (current) setLoading(false);
        });
    }
    return () => {
      current = false;
    };
  }, [remote, user?.id, status, attempt]);
  return (
    <section className="catalog">
      <p className="eyebrow">Tu historial de demostración</p>
      <h1>Mis pedidos</h1>
      <p>Solo se muestran los pedidos de esta sesión. No se realizaron cobros.</p>
      {loading && <p role="status">Cargando pedidos…</p>}
      {error && (
        <p role="alert" className="field-error">
          {error}{' '}
          <button
            className="text-button"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Reintentar
          </button>
        </p>
      )}
      {!loading && !error && !orders.length && (
        <p>
          Todavía no hay pedidos disponibles en esta sesión.{' '}
          <Link to="/catalogo">Explorar colección</Link>
        </p>
      )}
      <div className="orders-list">
        {orders.map((order) => (
          <article className="order-record" key={order.id}>
            <h2>Pedido de demostración</h2>
            <p>
              {order.department} ·{' '}
              {order.delivery_method === 'pickup' ? 'Retiro en tienda' : 'Envío nacional'}{' '}
              · {order.preferred_date}
            </p>
            <ul>
              {order.order_items.map((item) => (
                <li key={`${item.product_name}-${item.size}`}>
                  {item.product_name} · Talla {item.size} · {item.qty}{' '}
                  {item.qty === 1 ? 'par' : 'pares'} ·{' '}
                  {money(Number(item.unit_price) * item.qty)}
                </li>
              ))}
            </ul>
            <strong>Total confirmado: {money(Number(order.total))}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}

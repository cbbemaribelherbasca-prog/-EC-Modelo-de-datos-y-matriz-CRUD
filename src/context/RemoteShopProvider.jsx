import { useEffect, useRef, useState } from 'react';
import { ShopContext } from './ShopContextValue';
import { loadSupabase } from '../lib/supabase';
import { createShopRepository } from '../services/shopRepository';
import { fromRemoteProduct } from '../data/products';
import { normalizeCart } from '../data/cart';

function cached(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}
function cacheOwner() {
  try {
    return localStorage.getItem('tenis-supabase-owner') || '';
  } catch {
    return '';
  }
}

export default function RemoteShopProvider({ children }) {
  const [catalog, setCatalog] = useState([]);
  const [selection, setSelection] = useState({ favorites: [], cart: [] });
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const client = useRef(null);
  const repository = useRef(null);
  const sessionUser = useRef(null);
  const queue = useRef(Promise.resolve());
  const legacy = useRef({
    favorites: cached('tenis-favoritos'),
    cart: cached('tenis-carrito'),
    owner: cacheOwner(),
  });
  const alive = useRef(true);
  const isAdmin = (account) => account?.app_metadata?.app_role === 'catalog_admin';

  function persist(next, account) {
    setSelection({ ...next, owner: account.id });
    try {
      localStorage.setItem('tenis-favoritos', JSON.stringify(next.favorites));
      localStorage.setItem('tenis-carrito', JSON.stringify(next.cart));
      localStorage.setItem(
        'tenis-supabase-owner',
        `${client.current.supabaseUrl}:${account.id}`
      );
    } catch {
      /* La base remota sigue siendo la fuente de verdad. */
    }
  }

  function changeUser(account) {
    const changed = sessionUser.current?.id !== account?.id;
    if (changed || (!account && legacy.current.owner)) {
      if (sessionUser.current)
        legacy.current = { favorites: [], cart: [], owner: 'account-switch' };
      persist({ favorites: [], cart: [] }, account || { id: 'signed-out' });
      setFeedback(null);
    }
    sessionUser.current = account;
    setUser(account);
    if (!isAdmin(account))
      setCatalog((current) => current.filter((product) => product.is_active));
  }

  async function refresh(account = sessionUser.current) {
    const rows = await repository.current.catalog(isAdmin(account));
    if (!alive.current || account?.id !== sessionUser.current?.id) return;
    const nextCatalog = rows.map(fromRemoteProduct);
    setCatalog(nextCatalog);
    if (account) {
      // Importar una sola vez la selección local anterior; nunca copiar entre cuentas.
      const owner = `${client.current.supabaseUrl}:${account.id}`;
      if (!legacy.current.owner) {
        const validFavorites = legacy.current.favorites.filter((id) =>
          nextCatalog.some((p) => p.id === id && p.is_active)
        );
        const validCart = normalizeCart(
          legacy.current.cart,
          nextCatalog.filter((p) => p.is_active)
        ).items;
        if (validFavorites.length || validCart.length)
          await repository.current.importSelection(validFavorites, validCart);
        legacy.current.owner = owner;
      }
      const next = await repository.current.selection(account.id);
      if (alive.current && account.id === sessionUser.current?.id) persist(next, account);
    } else setSelection({ favorites: [], cart: [] });
    if (alive.current && account?.id === sessionUser.current?.id) {
      setStatus('ready');
      setError('');
    }
  }

  async function initialize() {
    setStatus('loading');
    try {
      client.current = await loadSupabase();
      repository.current = createShopRepository(client.current);
      const result = await client.current.auth.getSession();
      if (result.error)
        throw new Error('No pudimos recuperar la sesión. Vuelve a iniciar sesión.');
      if (!alive.current) return;
      changeUser(result.data.session?.user || null);
      await refresh();
    } catch (failure) {
      if (alive.current) {
        setStatus('error');
        setError(failure.message);
      }
    }
  }

  useEffect(() => {
    alive.current = true;
    initialize();
    const onFocus = () => {
      queue.current = queue.current
        .then(async () => {
          if (!client.current || !repository.current) return;
          const { data, error: sessionError } = await client.current.auth.getSession();
          if (sessionError) throw new Error('No pudimos recuperar la sesión.');
          changeUser(data.session?.user || null);
          await refresh();
        })
        .catch(() =>
          setError(
            'No pudimos actualizar tu selección. Revisa la conexión y vuelve a intentarlo.'
          )
        );
    };
    window.addEventListener('focus', onFocus);
    return () => {
      alive.current = false;
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  useEffect(() => {
    if (status !== 'ready' || !client.current) return;
    const {
      data: { subscription },
    } = client.current.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION' || !alive.current) return;
      const next = session?.user || null;
      const changed = next?.id !== sessionUser.current?.id;
      if (!changed && !['TOKEN_REFRESHED', 'USER_UPDATED'].includes(event)) return;
      changeUser(next);
      // El callback de Auth debe terminar antes de invocar métodos del SDK.
      setTimeout(() => {
        if (alive.current) window.dispatchEvent(new Event('focus'));
      }, 0);
    });
    return () => subscription.unsubscribe();
  }, [status === 'ready']);

  function perform(action) {
    const task = queue.current.then(async () => {
      setBusy(true);
      setError('');
      try {
        if (!repository.current || status !== 'ready')
          throw new Error('Espera a que se conecte el catálogo o vuelve a intentarlo.');
        if (!sessionUser.current) {
          const result = await client.current.auth.signInAnonymously();
          if (result.error)
            throw new Error(
              'No pudimos iniciar tu sesión de demostración. Comprueba que el acceso anónimo esté habilitado.'
            );
          changeUser(result.data.user);
          await refresh();
        }
        const account = sessionUser.current;
        const result = await action(repository.current, account);
        if (account.id !== sessionUser.current?.id)
          throw new Error('La sesión cambió. Revisa tu selección antes de continuar.');
        return result;
      } catch (failure) {
        setError(failure.message);
        throw failure;
      } finally {
        setBusy(false);
      }
    });
    queue.current = task.catch(() => {});
    return task;
  }

  function adjust(id, size, delta) {
    setFeedback(null);
    return perform(async (repo) => {
      await repo.adjustCart(id, size, delta);
      await refresh();
      setFeedback({
        id,
        size,
        error: false,
        message: delta === 1 ? 'Producto agregado al carrito.' : 'Cantidad actualizada.',
      });
    }).catch((failure) =>
      setFeedback({ id, size, error: true, message: failure.message })
    );
  }

  async function signIn(email, password) {
    if (!client.current || status !== 'ready')
      throw new Error('Primero conecta el catálogo.');
    await queue.current;
    const result = await client.current.auth.signInWithPassword({ email, password });
    if (result.error)
      throw new Error('No pudimos iniciar sesión. Revisa tus credenciales.');
    legacy.current = { favorites: [], cart: [], owner: 'account-switch' };
    changeUser(result.data.user);
    await refresh();
  }

  const privateSelection =
    user && selection.owner === user.id ? selection : { favorites: [], cart: [] };
  const missing = [
    ...new Set([
      ...privateSelection.cart.map((item) => item.id),
      ...privateSelection.favorites,
    ]),
  ]
    .filter((id) => !catalog.some((p) => p.id === id))
    .map((id) => ({
      ...fromRemoteProduct({ id, price: 0, image_path: '' }),
      name: 'Producto no disponible',
      is_active: false,
    }));

  return (
    <ShopContext.Provider
      value={{
        products: [...catalog, ...missing],
        favorites: privateSelection.favorites,
        cart: privateSelection.cart,
        remote: true,
        status,
        busy,
        remoteError: error,
        retryConnection: initialize,
        user,
        isCatalogAdmin: isAdmin(user),
        cartNotice: error,
        cartFeedback: feedback,
        addToCart: (id, size) => adjust(id, size, 1),
        changeQuantity: adjust,
        toggleFavorite: (id) =>
          perform(async (repo, account) => {
            const current = await repo.selection(account.id);
            await repo.favorite(account.id, id, current.favorites.includes(id));
            await refresh();
          }).catch(() => {}),
        confirmPurchase: (values, requestId) =>
          perform((repo) => repo.confirmOrder(requestId, values)),
        completePurchase: (orderId) =>
          perform(async (repo) => {
            await repo.clearConfirmed(orderId);
            await refresh();
          }),
        saveProduct: (values, id) =>
          perform(async (repo) => {
            await repo.saveProduct(values, id);
            await refresh();
          }),
        deactivateProduct: (id) =>
          perform(async (repo) => {
            await repo.deactivate(id);
            await refresh();
          }),
        loadOrders: () => perform((repo, account) => repo.orders(account.id)),
        signIn,
        signOut: async () => {
          await queue.current;
          const { error: signOutError } = await client.current.auth.signOut();
          if (signOutError) throw new Error('No pudimos cerrar la sesión.');
          legacy.current = { favorites: [], cart: [], owner: 'signed-out' };
          changeUser(null);
          await refresh(null);
        },
      }}
    >
      {children}
    </ShopContext.Provider>
  );
}

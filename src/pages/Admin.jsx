import { useRef, useState } from 'react';
import { useShop } from '../context/ShopContext';
import { money } from '../data/products';
import { validateProduct } from '../data/productValidation';
import FormField from '../components/FormField';
import Dropdown from '../components/Dropdown';
import Modal from '../components/Modal';

const empty = {
  name: '',
  audience: 'Hombre',
  style: 'Urbano',
  color: '',
  price: '',
  old_price: '',
  image_path: 'assets/tenis-cobalto.png',
  badge: '',
  description: '',
  is_active: true,
};
const labels = {
  name: 'Nombre',
  color: 'Color',
  price: 'Precio (Bs)',
  old_price: 'Precio anterior (opcional)',
  image_path: 'Imagen',
  badge: 'Etiqueta (opcional)',
  description: 'Descripción',
  audience: 'Categoría',
  style: 'Estilo',
};

export default function Admin() {
  const {
    remote,
    status,
    user,
    isCatalogAdmin,
    products,
    saveProduct,
    deactivateProduct,
    signIn,
    signOut,
    busy,
  } = useShop();
  const [values, setValues] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [failure, setFailure] = useState('');
  const [pending, setPending] = useState(false);
  const [removing, setRemoving] = useState(null);
  const errorSummary = useRef(null);
  const heading = useRef(null);

  async function execute(action, success) {
    setFailure('');
    setMessage('');
    setPending(true);
    try {
      await action();
      setMessage(success);
      return true;
    } catch (error) {
      setFailure(error.message);
      return false;
    } finally {
      setPending(false);
    }
  }

  function edit(product) {
    setEditing(product.id);
    setValues({
      name: product.name,
      audience: product.audience,
      style: product.style,
      color: product.color,
      price: String(product.price),
      old_price: product.oldPrice == null ? '' : String(product.oldPrice),
      image_path: product.imagePath,
      badge: product.badge,
      description: product.description,
      is_active: product.is_active,
    });
    setErrors({});
    setFailure('');
    setMessage('');
    heading.current?.focus();
    heading.current?.scrollIntoView({ block: 'center' });
  }

  async function submit(event) {
    event.preventDefault();
    if (pending || busy) return;
    const next = validateProduct(values);
    setErrors(next);
    if (Object.keys(next).length) {
      requestAnimationFrame(() => errorSummary.current?.focus());
      return;
    }
    const saved = await execute(
      () =>
        saveProduct(
          {
            ...values,
            name: values.name.trim(),
            color: values.color.trim(),
            description: values.description.trim(),
            image_path: values.image_path.trim(),
            price: Number(values.price),
            old_price: values.old_price ? Number(values.old_price) : null,
          },
          editing
        ),
      editing
        ? 'Producto actualizado.'
        : 'Producto creado. Ya está disponible en la colección.'
    );
    if (saved) {
      setValues(empty);
      setEditing(null);
    }
  }

  return (
    <section className="catalog admin-page">
      <p className="eyebrow">Gestión de la colección</p>
      <h1>Administrar productos</h1>
      {!remote ? (
        <p>
          La administración requiere conectar el proyecto a Supabase. Consulta la guía de
          integración.
        </p>
      ) : status !== 'ready' ? (
        <p>
          La conexión al catálogo debe estar disponible antes de administrar productos.
        </p>
      ) : (
        <>
          {failure && (
            <p className="field-error" role="alert">
              {failure}
            </p>
          )}
          {message && <p role="status">{message}</p>}
          {!isCatalogAdmin ? (
            <div className="admin-login checkout-form">
              <h2>Acceso de administración</h2>
              <p>Solo una cuenta autorizada puede modificar la colección.</p>
              {user && !user.is_anonymous && (
                <p role="status">Tu cuenta no tiene permisos de administración.</p>
              )}
              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  const form = event.currentTarget;
                  const email = form.elements.email.value;
                  const password = form.elements.password.value;
                  form.elements.password.value = '';
                  await execute(() => signIn(email, password), 'Sesión iniciada.');
                }}
              >
                <FormField id="admin-email" label="Correo de la cuenta autorizada">
                  <input
                    id="admin-email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    required
                  />
                </FormField>
                <FormField id="admin-password" label="Contraseña">
                  <input
                    id="admin-password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                  />
                </FormField>
                <button className="primary-button" disabled={pending} type="submit">
                  {pending ? 'Ingresando…' : 'Iniciar sesión'}
                </button>
              </form>
            </div>
          ) : (
            <>
              <div className="panel-heading">
                <p>
                  Publica, edita o retira modelos sin eliminar el historial de pedidos.
                </p>
                <button
                  className="text-button"
                  onClick={() => execute(signOut, 'Sesión cerrada.')}
                  disabled={pending || busy}
                >
                  Cerrar sesión
                </button>
              </div>
              <div className="admin-layout">
                <form className="checkout-form" onSubmit={submit} noValidate>
                  <h2 tabIndex={-1} ref={heading}>
                    {editing ? 'Editar producto' : 'Nuevo producto'}
                  </h2>
                  {Object.keys(errors).length > 0 && (
                    <div
                      className="form-error-summary"
                      role="alert"
                      ref={errorSummary}
                      tabIndex={-1}
                    >
                      <strong>Revisa el producto</strong>
                      <ul>
                        {Object.entries(errors).map(([key, text]) => (
                          <li key={key}>
                            <button
                              type="button"
                              onClick={() =>
                                document.getElementById(`product-${key}`)?.focus()
                              }
                            >
                              {labels[key]}: {text}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {Object.keys(labels).map((key) => (
                    <FormField
                      key={key}
                      id={`product-${key}`}
                      label={labels[key]}
                      required={!['old_price', 'badge'].includes(key)}
                      error={errors[key]}
                      help={
                        key === 'image_path'
                          ? 'Usa una URL HTTPS o una imagen incluida en assets/.'
                          : undefined
                      }
                    >
                      {['audience', 'style'].includes(key) ? (
                        <Dropdown
                          inputId={`product-${key}`}
                          label={labels[key]}
                          value={values[key]}
                          options={(key === 'audience'
                            ? ['Hombre', 'Mujer', 'Niños']
                            : ['Running', 'Urbano', 'Casual']
                          ).map((value) => ({ value, label: value }))}
                          onChange={(value) =>
                            setValues((current) => ({ ...current, [key]: value }))
                          }
                          invalid={Boolean(errors[key])}
                          describedBy={errors[key] ? `product-${key}-error` : undefined}
                        />
                      ) : key === 'description' ? (
                        <textarea
                          id={`product-${key}`}
                          rows={4}
                          maxLength={1500}
                          value={values[key]}
                          onChange={(event) =>
                            setValues((current) => ({
                              ...current,
                              [key]: event.target.value,
                            }))
                          }
                          aria-invalid={Boolean(errors[key])}
                          aria-describedby={
                            errors[key] ? `product-${key}-error` : undefined
                          }
                        />
                      ) : (
                        <input
                          id={`product-${key}`}
                          type="text"
                          inputMode={
                            ['price', 'old_price'].includes(key) ? 'decimal' : undefined
                          }
                          value={values[key]}
                          onChange={(event) =>
                            setValues((current) => ({
                              ...current,
                              [key]: event.target.value,
                            }))
                          }
                          aria-invalid={Boolean(errors[key])}
                          aria-describedby={
                            [
                              key === 'image_path' && 'product-image_path-help',
                              errors[key] && `product-${key}-error`,
                            ]
                              .filter(Boolean)
                              .join(' ') || undefined
                          }
                        />
                      )}
                    </FormField>
                  ))}
                  <label className="admin-active">
                    <input
                      type="checkbox"
                      checked={values.is_active}
                      onChange={(event) =>
                        setValues((current) => ({
                          ...current,
                          is_active: event.target.checked,
                        }))
                      }
                    />{' '}
                    Visible en la colección
                  </label>
                  <div className="form-actions">
                    <button
                      className="primary-button"
                      disabled={busy || pending}
                      type="submit"
                    >
                      {busy || pending
                        ? 'Guardando…'
                        : editing
                          ? 'Guardar cambios'
                          : 'Crear producto'}
                    </button>
                    {editing && (
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => {
                          setValues(empty);
                          setEditing(null);
                          setErrors({});
                        }}
                      >
                        Cancelar edición
                      </button>
                    )}
                  </div>
                </form>
                <div className="admin-products" aria-label="Productos del catálogo">
                  {products.map((product) => (
                    <article className="admin-product" key={product.id}>
                      <img src={product.image} alt="" />
                      <div>
                        <h2>{product.name}</h2>
                        <p>
                          {money(product.price)} ·{' '}
                          {product.is_active ? 'Visible' : 'Retirado'}
                        </p>
                        <div className="admin-row-actions">
                          <button
                            className="text-button"
                            disabled={busy || pending}
                            onClick={() => edit(product)}
                            aria-label={`Editar ${product.name}`}
                          >
                            Editar
                          </button>
                          {product.is_active && (
                            <button
                              className="text-button"
                              disabled={busy || pending}
                              onClick={() => setRemoving(product)}
                              aria-label={`Retirar ${product.name}`}
                            >
                              Retirar
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}
      {removing && (
        <Modal
          className="checkout-modal"
          labelledBy="remove-title"
          describedBy="remove-description"
          closeLabel="Cancelar retiro"
          onClose={() => {
            if (!pending) setRemoving(null);
          }}
        >
          <h2 id="remove-title">¿Retirar este modelo?</h2>
          <p id="remove-description">
            {removing.name} dejará de mostrarse en la colección. Puedes volver a
            publicarlo desde Editar.
          </p>
          <button
            className="primary-button"
            disabled={pending}
            onClick={async () => {
              if (
                await execute(
                  () => deactivateProduct(removing.id),
                  'Producto retirado de la colección.'
                )
              )
                setRemoving(null);
            }}
          >
            Retirar producto
          </button>
          {failure && (
            <p className="field-error" role="alert">
              {failure}
            </p>
          )}
        </Modal>
      )}
    </section>
  );
}

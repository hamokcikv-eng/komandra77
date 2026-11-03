import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getProduct, type Product } from '../lib/api';
import { formatMoney } from '../lib/format';
import { usePageMeta } from '../lib/seo';
import { useCart } from '../store/CartContext';
import { useSettings } from '../store/SettingsContext';
import { useUI } from '../store/UIContext';
import { ArrowRight, ArrowUpRight, Check, Minus, Plus } from '../components/Icons';
import { EditorialMenu } from '../components/EditorialMenu';
import { EmptyState, Magnetic, ProductImage, Spinner } from '../components/ui';

export function ProductPage() {
  const { slug = '' } = useParams();
  const { settings } = useSettings();
  const cart = useCart();
  const { notify } = useUI();
  const [data, setData] = useState<{ product: Product; related: Product[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [sizeId, setSizeId] = useState<number | null>(null);
  const [addons, setAddons] = useState<number[]>([]);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);

  usePageMeta(
    data ? data.product.name : 'Menu',
    data ? data.product.tagline || data.product.description.slice(0, 150) : 'View this dish on the KOMANDRA menu.',
  );

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setMissing(false);
    getProduct(slug)
      .then((result) => {
        if (!alive) return;
        setData(result);
        const defaultSize = result.product.sizes.find((size) => size.isDefault) ?? result.product.sizes[0];
        setSizeId(defaultSize?.id ?? null);
        setAddons([]);
        setQty(1);
      })
      .catch(() => alive && setMissing(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [slug]);

  const product = data?.product;

  const unitPrice = useMemo(() => {
    if (!product) return 0;
    const base = product.offer ? product.offer.offerCents : product.priceCents;
    const size = product.sizes.find((entry) => entry.id === sizeId);
    const addonTotal = addons.reduce((sum, id) => sum + (product.addons.find((addon) => addon.id === id)?.priceCents ?? 0), 0);
    return base + (size?.priceDeltaCents ?? 0) + addonTotal;
  }, [product, sizeId, addons]);

  if (loading) {
    return (
      <div className="shell">
        <Spinner label="Loading dish" />
      </div>
    );
  }

  if (missing || !product) {
    return (
      <div className="shell page-head">
        <EmptyState
          title="That dish is not on the menu"
          body="It may have sold out or been retired. The full menu is one tap away."
          action={
            <Link to="/menu" className="btn btn--gold btn--sm">
              Back to the menu
            </Link>
          }
        />
      </div>
    );
  }

  const soldOut = !product.available || product.stock <= 0;
  const compareAt = product.offer ? product.offer.originalCents : product.compareAtCents;

  const addToCart = () => {
    if (soldOut) return;
    setAdding(true);
    cart.addItem(product, { sizeId, addonIds: addons, qty, offerSlug: product.offer?.slug ?? null });
    notify(`${qty} × ${product.name} added to your order.`, 'success');
    cart.openCart();
    window.setTimeout(() => setAdding(false), 450);
  };

  return (
    <>
      <div className="shell">
        <nav className="crumbs" aria-label="Breadcrumb" style={{ paddingTop: '6.5rem' }}>
          <Link to="/">Home</Link>
          <span aria-hidden="true">/</span>
          <Link to="/menu">Menu</Link>
          <span aria-hidden="true">/</span>
          <span style={{ color: 'var(--ink)' }}>{product.name}</span>
        </nav>

        <div className="product">
          <div>
            <div className="product__media">
              {product.badge ? <span className="badge product__badge">{product.badge}</span> : null}
              <ProductImage
                src={product.image}
                alt={product.name}
                sizes="(min-width: 1024px) 560px, 92vw"
                eager
              />
              <div className="product__media-meta">
                <span>{product.category.name}</span>
                <span>REF · {String(product.id).padStart(3, '0')}</span>
              </div>
            </div>
          </div>

          <div>
            <span className="eyebrow">{product.category.name}</span>
            <h1 className="product__title">{product.name}</h1>
            {product.tagline ? <p className="product__tagline">{product.tagline}</p> : null}

            <div className="product__price-row">
              <span className="product__price">{formatMoney(unitPrice, settings.currency)}</span>
              {compareAt ? <span className="product__was">{formatMoney(compareAt, settings.currency)}</span> : null}
              {product.offer ? <span className="product__save">Offer applied at checkout</span> : null}
            </div>

            <p className="product__desc">{product.description}</p>

            {product.ingredients.length > 0 ? (
              <>
                <div className="option-group__title" style={{ marginTop: '1.4rem', marginBottom: '0.7rem' }}>
                  <span>Inside the build</span>
                </div>
                <div className="ingredients">
                  {product.ingredients.map((ingredient) => (
                    <span className="ingredient" key={ingredient}>
                      {ingredient}
                    </span>
                  ))}
                </div>
              </>
            ) : null}

            {product.sizes.length > 0 ? (
              <div className="option-group">
                <div className="option-group__title">
                  <span>Portion</span>
                  <span>{product.sizes.length} options</span>
                </div>
                <div className="size-grid">
                  {product.sizes.map((size) => (
                    <label key={size.id} className={`size-option ${sizeId === size.id ? 'is-selected' : ''}`}>
                      <input
                        type="radio"
                        name="size"
                        value={size.id}
                        checked={sizeId === size.id}
                        onChange={() => setSizeId(size.id)}
                      />
                      {size.name}
                      <span className="size-option__delta">
                        {size.priceDeltaCents > 0 ? `+${formatMoney(size.priceDeltaCents, settings.currency)}` : 'included'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            {product.addons.length > 0 ? (
              <div className="option-group">
                <div className="option-group__title">
                  <span>Extras</span>
                  <span>optional</span>
                </div>
                <div className="addon-list">
                  {product.addons.map((addon) => {
                    const selected = addons.includes(addon.id);
                    return (
                      <label key={addon.id} className={`addon ${selected ? 'is-selected' : ''}`}>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() =>
                            setAddons((current) =>
                              selected ? current.filter((id) => id !== addon.id) : [...current, addon.id],
                            )
                          }
                        />
                        <span className="addon__check">{selected ? <Check size={11} /> : null}</span>
                        {addon.name}
                        <span className="addon__price">+{formatMoney(addon.priceCents, settings.currency)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="buy-row">
              <div className="qty">
                <button type="button" onClick={() => setQty((value) => Math.max(1, value - 1))} disabled={qty <= 1} aria-label="Decrease quantity">
                  <Minus size={14} />
                </button>
                <span aria-live="polite">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty((value) => Math.min(20, value + 1))}
                  disabled={qty >= 20}
                  aria-label="Increase quantity"
                >
                  <Plus size={14} />
                </button>
              </div>
              <Magnetic strength={6}>
                <button type="button" className="btn btn--gold btn--lg" onClick={addToCart} disabled={soldOut || adding}>
                  {soldOut ? 'Sold out' : adding ? 'Added' : `Add · ${formatMoney(unitPrice * qty, settings.currency)}`}
                  {!soldOut && !adding ? <ArrowUpRight size={16} className="btn__arrow" /> : null}
                </button>
              </Magnetic>
            </div>
            <p className="form-note" style={{ marginTop: '0.7rem' }}>
              {soldOut
                ? 'This dish is resting. Check the menu for what is available right now.'
                : `Available now · ${Math.min(product.stock, 99)} in stock · ready in ${product.prepMinutes} minutes.`}
            </p>

            <div className="meta-grid">
              <div>
                <span>Calories</span>
                <strong>{product.calories ? `${product.calories} kcal` : '—'}</strong>
              </div>
              <div>
                <span>Prep time</span>
                <strong>{product.prepMinutes} min</strong>
              </div>
              <div>
                <span>Category</span>
                <strong>{product.category.name}</strong>
              </div>
            </div>

            <div className="panel" style={{ marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-start' }}>
                <Check size={16} style={{ color: 'var(--gold)', flex: 'none', marginTop: '0.15rem' }} />
                <p className="form-note" style={{ margin: 0 }}>
                  Customisations are stored with your order and confirmed by the kitchen. Allergens? Message us on{' '}
                  <a className="gold" href={`https://wa.me/${settings.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer">
                    WhatsApp
                  </a>{' '}
                  before ordering.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {data.related.length > 0 ? (
        <section className="section section--line">
          <div className="shell">
            <div className="section-head">
              <div>
                <span className="eyebrow">Pairs well with</span>
                <h2 className="h2 section-head__title">
                  Keep it <em>going.</em>
                </h2>
              </div>
              <Link to="/menu" className="link-arrow">
                Full menu <ArrowRight size={14} />
              </Link>
            </div>
            <EditorialMenu products={data.related} />
          </div>
        </section>
      ) : null}
    </>
  );
}

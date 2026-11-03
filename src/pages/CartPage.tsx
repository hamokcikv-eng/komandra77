import { Link } from 'react-router-dom';
import { useCart } from '../store/CartContext';
import { useSettings } from '../store/SettingsContext';
import { formatMoney } from '../lib/format';
import { usePageMeta } from '../lib/seo';
import { ArrowRight, BagIcon, Minus, Plus, Trash } from '../components/Icons';
import { EmptyState, ProductImage } from '../components/ui';

export function CartPage() {
  usePageMeta('Your Order', 'Review your KOMANDRA order before checkout.');
  const cart = useCart();
  const { settings } = useSettings();

  const deliveryFee = cart.subtotalCents >= settings.freeDeliveryThresholdCents ? 0 : settings.deliveryFeeCents;
  const total = cart.subtotalCents + deliveryFee;

  return (
    <>
      <div className="page-head">
        <div className="shell">
          <span className="eyebrow">Your order</span>
          <h1 className="display page-head__title" style={{ fontSize: 'clamp(2.4rem, 6vw, 4.6rem)' }}>
            Review the <em>basket.</em>
          </h1>
        </div>
      </div>

      <section className="section--tight" style={{ paddingBottom: 'clamp(3rem, 6vw, 5rem)' }}>
        <div className="shell">
          {cart.items.length === 0 ? (
            <EmptyState
              icon={<BagIcon size={22} />}
              title="Your basket is empty"
              body="Start with a signature build — or browse the full menu for something new."
              action={
                <Link to="/menu" className="btn btn--gold btn--sm">
                  Browse the menu
                </Link>
              }
            />
          ) : (
            <div className="cart-page" style={{ paddingTop: 0 }}>
              <div>
                <div className="cart-list">
                  {cart.items.map((item) => (
                    <div className="cart-row" key={item.key}>
                      <ProductImage src={item.image} alt={item.name} sizes="84px" />
                      <div>
                        <Link to={`/menu/${item.slug}`} className="cart-row__title">
                          {item.name}
                        </Link>
                        <div className="cart-row__opts">
                          {[item.sizeName, item.addonNames.join(', ')].filter(Boolean).join(' · ') || 'Standard build'}
                          {item.offerSlug ? ' · Offer applied' : ''}
                        </div>
                        <div className="cart-row__actions">
                          <div className="qty-mini">
                            <button
                              type="button"
                              onClick={() => cart.setQty(item.key, item.qty - 1)}
                              aria-label={`Reduce ${item.name}`}
                            >
                              <Minus size={13} />
                            </button>
                            <span>{item.qty}</span>
                            <button
                              type="button"
                              onClick={() => cart.setQty(item.key, item.qty + 1)}
                              aria-label={`Add another ${item.name}`}
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                          <button
                            type="button"
                            className="btn btn--quiet"
                            onClick={() => cart.removeItem(item.key)}
                            aria-label={`Remove ${item.name}`}
                          >
                            <Trash size={14} /> Remove
                          </button>
                        </div>
                      </div>
                      <div className="cart-row__price">
                        {formatMoney(item.unitPriceCents * item.qty, settings.currency)}
                        <div className="muted" style={{ fontSize: '0.72rem', marginTop: '0.2rem' }}>
                          {formatMoney(item.unitPriceCents, settings.currency)} each
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                  <Link to="/menu" className="btn btn--ghost btn--sm">
                    Add more items
                  </Link>
                  <button type="button" className="btn btn--quiet" onClick={cart.clear}>
                    Clear basket
                  </button>
                </div>
              </div>

              <aside className="sticky-summary">
                <div className="panel">
                  <h2 className="panel__title">Summary</h2>
                  <div className="totals" style={{ marginTop: '1rem' }}>
                    <div className="totals__row">
                      <span>Subtotal</span>
                      <span>{formatMoney(cart.subtotalCents, settings.currency)}</span>
                    </div>
                    <div className="totals__row">
                      <span>Delivery</span>
                      <span>{deliveryFee === 0 ? 'Free' : formatMoney(deliveryFee, settings.currency)}</span>
                    </div>
                    <div className="totals__row totals__row--total">
                      <span>Total</span>
                      <span>{formatMoney(total, settings.currency)}</span>
                    </div>
                  </div>
                  <Link to="/checkout" className="btn btn--gold btn--block btn--lg" style={{ marginTop: '1rem' }}>
                    Continue to checkout <ArrowRight size={16} className="btn__arrow" />
                  </Link>
                  <p className="form-note" style={{ marginTop: '0.7rem' }}>
                    Delivery is free over {formatMoney(settings.freeDeliveryThresholdCents, settings.currency)}. Minimum
                    delivery order {formatMoney(settings.minOrderCents, settings.currency)}.
                  </p>
                </div>
              </aside>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

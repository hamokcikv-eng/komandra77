import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../store/CartContext';
import { useSettings } from '../store/SettingsContext';
import { formatMoney } from '../lib/format';
import { ArrowRight, BagIcon, Close, Minus, Plus, Trash } from './Icons';
import { ProductImage } from './ui';

export function CartDrawer() {
  const cart = useCart();
  const { settings } = useSettings();

  useEffect(() => {
    if (!cart.isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cart.closeCart();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [cart]);

  if (!cart.isOpen) return null;

  return (
    <>
      <div className="drawer-backdrop" onClick={cart.closeCart} aria-hidden="true" />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Your order">
        <div className="drawer__head">
          <div>
            <h2 className="drawer__title">Your Order</h2>
            <span className="drawer__count">
              {cart.count} {cart.count === 1 ? 'item' : 'items'}
            </span>
          </div>
          <button type="button" className="icon-btn" onClick={cart.closeCart} aria-label="Close cart" autoFocus>
            <Close size={18} />
          </button>
        </div>

        <div className="drawer__body">
          {cart.items.length === 0 ? (
            <div className="empty">
              <span className="empty__icon">
                <BagIcon size={22} />
              </span>
              <h3>Nothing here yet</h3>
              <p>Your cart is waiting for something flame-grilled.</p>
              <Link to="/menu" className="btn btn--ghost btn--sm" onClick={cart.closeCart}>
                Browse the menu
              </Link>
            </div>
          ) : (
            cart.items.map((item) => (
              <div className="cart-line" key={item.key}>
                <ProductImage src={item.image} alt={item.name} sizes="62px" />
                <div>
                  <div className="cart-line__name">{item.name}</div>
                  <div className="cart-line__opts">
                    {[item.sizeName, item.addonNames.join(', ')].filter(Boolean).join(' · ')}
                    {item.offerSlug ? ' · Offer price' : ''}
                  </div>
                  <div className="cart-line__controls">
                    <div className="qty-mini">
                      <button type="button" onClick={() => cart.setQty(item.key, item.qty - 1)} aria-label={`Reduce ${item.name}`}>
                        <Minus size={13} />
                      </button>
                      <span aria-live="polite">{item.qty}</span>
                      <button type="button" onClick={() => cart.setQty(item.key, item.qty + 1)} aria-label={`Add another ${item.name}`}>
                        <Plus size={13} />
                      </button>
                    </div>
                    <button
                      type="button"
                      className="icon-btn icon-btn--sm"
                      onClick={() => cart.removeItem(item.key)}
                      aria-label={`Remove ${item.name}`}
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                </div>
                <div className="cart-line__right">
                  <span className="cart-line__price">{formatMoney(item.unitPriceCents * item.qty, settings.currency)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.items.length > 0 ? (
          <div className="drawer__foot">
            <div className="totals">
              <div className="totals__row">
                <span>Subtotal</span>
                <span>{formatMoney(cart.subtotalCents, settings.currency)}</span>
              </div>
              <div className="totals__row">
                <span>Delivery</span>
                <span>
                  {cart.subtotalCents >= settings.freeDeliveryThresholdCents
                    ? 'Free'
                    : formatMoney(settings.deliveryFeeCents, settings.currency)}
                </span>
              </div>
            </div>
            <Link to="/checkout" className="btn btn--gold btn--block btn--lg" onClick={cart.closeCart}>
              Checkout <ArrowRight size={16} className="btn__arrow" />
            </Link>
            <Link to="/cart" className="btn btn--ghost btn--block" onClick={cart.closeCart}>
              View full basket
            </Link>
          </div>
        ) : null}
      </aside>
    </>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { formatMoney } from '../lib/format';
import { usePageMeta } from '../lib/seo';
import { useAuth } from '../store/AuthContext';
import { useCart } from '../store/CartContext';
import { useSettings } from '../store/SettingsContext';
import { useUI } from '../store/UIContext';
import { ArrowRight, BagIcon, Check } from '../components/Icons';
import { EmptyState, ProductImage } from '../components/ui';

type Fulfillment = 'delivery' | 'pickup';

export function CheckoutPage() {
  usePageMeta('Checkout', 'Complete your KOMANDRA order — delivery or pickup, cash or card, with live totals.');
  const cart = useCart();
  const { settings } = useSettings();
  const { user, addresses, addAddress } = useAuth();
  const { notify } = useUI();
  const navigate = useNavigate();

  const [fulfillment, setFulfillment] = useState<Fulfillment>('delivery');
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    line1: '',
    line2: '',
    city: '',
    notes: '',
    coupon: '',
  });
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [coupon, setCoupon] = useState<{ code: string; discountCents: number } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [saveAddress, setSaveAddress] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm((current) => ({
      ...current,
      name: current.name || user.name,
      phone: current.phone || user.phone || '',
      email: current.email || user.email,
    }));
  }, [user]);

  useEffect(() => {
    const preferred = addresses.find((address) => address.isDefault) ?? addresses[0];
    if (!preferred) return;
    setForm((current) => ({
      ...current,
      line1: current.line1 || preferred.line1,
      line2: current.line2 || preferred.line2 || '',
      city: current.city || preferred.city,
      notes: current.notes || preferred.notes || '',
    }));
  }, [addresses]);

  const cartSignature = cart.items.map((item) => `${item.key}x${item.qty}`).join('|');
  const previousSignature = useRef(cartSignature);
  useEffect(() => {
    if (previousSignature.current === cartSignature) return;
    previousSignature.current = cartSignature;
    if (coupon) {
      setCoupon(null);
      setCouponError('Basket changed — apply the code again to refresh the discount.');
    }
  }, [cartSignature, coupon]);

  const deliveryFee = useMemo(() => {
    if (fulfillment === 'pickup') return 0;
    return cart.subtotalCents >= settings.freeDeliveryThresholdCents ? 0 : settings.deliveryFeeCents;
  }, [fulfillment, cart.subtotalCents, settings]);

  const discount = coupon?.discountCents ?? 0;
  const total = Math.max(0, cart.subtotalCents - discount + deliveryFee);
  const belowMinimum = fulfillment === 'delivery' && cart.subtotalCents < settings.minOrderCents;

  const itemsPayload = cart.items.map((item) => ({
    productId: item.productId,
    qty: item.qty,
    sizeId: item.sizeId,
    addonIds: item.addonIds,
    offerSlug: item.offerSlug,
  }));

  if (cart.items.length === 0 && !submitting) {
    return (
      <div className="shell page-head">
        <EmptyState
          icon={<BagIcon size={22} />}
          title="Nothing to check out"
          body="Add a dish to your basket and come back — your cart is saved on this device."
          action={
            <Link to="/menu" className="btn btn--gold btn--sm">
              Open the menu
            </Link>
          }
        />
      </div>
    );
  }

  const applyCoupon = async () => {
    const code = form.coupon.trim();
    if (!code) return;
    setCouponLoading(true);
    setCouponError('');
    try {
      const data = await api<{ code: string; discountCents: number }>('/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({ code, items: itemsPayload }),
      });
      setCoupon({ code: data.code, discountCents: data.discountCents });
      notify(`Promo ${data.code} applied.`, 'success');
    } catch (issue) {
      setCoupon(null);
      setCouponError(issue instanceof ApiError ? issue.message : 'Could not validate that code.');
    } finally {
      setCouponLoading(false);
    }
  };

  const placeOrder = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        items: itemsPayload,
        fulfillment,
        name: form.name,
        phone: form.phone,
        email: form.email,
        address: fulfillment === 'delivery' ? { line1: form.line1, line2: form.line2, city: form.city, notes: form.notes } : undefined,
        notes: form.notes,
        couponCode: coupon?.code ?? '',
        paymentMethod,
      };
      const data = await api<{
        order: { code: string; totalCents: number };
        checkoutUrl: string | null;
      }>('/orders', { method: 'POST', body: JSON.stringify(payload) });

      if (saveAddress && user && fulfillment === 'delivery' && form.line1) {
        try {
          await addAddress({
            label: 'Home',
            line1: form.line1,
            line2: form.line2 || null,
            city: form.city,
            notes: form.notes || null,
            isDefault: false,
          });
        } catch {
          /* address saving is optional */
        }
      }

      cart.clear();

      if (data.checkoutUrl) {
        window.location.assign(data.checkoutUrl);
        return;
      }
      navigate(`/orders/${data.order.code}?new=1`);
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Could not place your order. Please try again.');
      setSubmitting(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <>
      <div className="page-head">
        <div className="shell">
          <span className="eyebrow">Checkout</span>
          <h1 className="display page-head__title" style={{ fontSize: 'clamp(2.4rem, 6vw, 4.6rem)' }}>
            Finish the <em>order.</em>
          </h1>
        </div>
      </div>

      <form className="checkout" style={{ paddingTop: 0 }} onSubmit={placeOrder}>
        <div className="shell">
          <div>
            {error ? (
              <div className="form-error" role="alert">
                {error}
              </div>
            ) : null}

            <div className="panel">
              <h2 className="panel__title">1 — How are we getting it to you?</h2>
              <div className="segmented" role="group" aria-label="Fulfilment method">
                <button
                  type="button"
                  className={fulfillment === 'delivery' ? 'is-active' : ''}
                  onClick={() => setFulfillment('delivery')}
                  aria-pressed={fulfillment === 'delivery'}
                >
                  Delivery
                </button>
                <button
                  type="button"
                  className={fulfillment === 'pickup' ? 'is-active' : ''}
                  onClick={() => setFulfillment('pickup')}
                  aria-pressed={fulfillment === 'pickup'}
                >
                  Pickup
                </button>
              </div>
              <p className="form-note" style={{ marginTop: '0.7rem' }}>
                {fulfillment === 'delivery'
                  ? `Delivered in ${settings.prepTime}. Free over ${formatMoney(settings.freeDeliveryThresholdCents, settings.currency)}.`
                  : `Collect from ${settings.address}. Ready in about 20 minutes.`}
              </p>

              {fulfillment === 'delivery' ? (
                <div style={{ marginTop: '1rem' }}>
                  <div className="field">
                    <label htmlFor="line1">Street address</label>
                    <input
                      id="line1"
                      value={form.line1}
                      onChange={(event) => setForm({ ...form, line1: event.target.value })}
                      required
                      autoComplete="address-line1"
                      placeholder="Building, street, district"
                    />
                  </div>
                  <div className="field-row field-row--2">
                    <div className="field">
                      <label htmlFor="line2">Building / apartment</label>
                      <input
                        id="line2"
                        value={form.line2}
                        onChange={(event) => setForm({ ...form, line2: event.target.value })}
                        autoComplete="address-line2"
                        placeholder="Optional"
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="city">City</label>
                      <input
                        id="city"
                        value={form.city}
                        onChange={(event) => setForm({ ...form, city: event.target.value })}
                        required
                        autoComplete="address-level2"
                        placeholder="Riyadh"
                      />
                    </div>
                  </div>
                  {user ? (
                    <label className="checkbox" style={{ marginTop: '0.2rem' }}>
                      <input type="checkbox" checked={saveAddress} onChange={(event) => setSaveAddress(event.target.checked)} />
                      Save this address to my account
                    </label>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="panel" style={{ marginTop: '1rem' }}>
              <h2 className="panel__title">2 — Contact details</h2>
              <div className="field-row field-row--2">
                <div className="field">
                  <label htmlFor="checkout-name">Full name</label>
                  <input
                    id="checkout-name"
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    required
                    autoComplete="name"
                  />
                </div>
                <div className="field">
                  <label htmlFor="checkout-phone">Phone</label>
                  <input
                    id="checkout-phone"
                    value={form.phone}
                    onChange={(event) => setForm({ ...form, phone: event.target.value })}
                    required
                    autoComplete="tel"
                    placeholder="+966 5X XXX XXXX"
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="checkout-email">Email (for the receipt)</label>
                <input
                  id="checkout-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  autoComplete="email"
                  placeholder="Optional"
                />
              </div>
              {!user ? (
                <p className="form-note">
                  Ordering as a guest. <Link to="/account" className="gold">Sign in</Link> to save addresses and track
                  orders in one place.
                </p>
              ) : null}
            </div>

            <div className="panel" style={{ marginTop: '1rem' }}>
              <h2 className="panel__title">3 — Payment</h2>
              <label className={`choice ${paymentMethod === 'cash' ? 'is-selected' : ''}`}>
                <input
                  type="radio"
                  name="payment"
                  value="cash"
                  checked={paymentMethod === 'cash'}
                  onChange={() => setPaymentMethod('cash')}
                />
                <span>
                  <span className="choice__title">{fulfillment === 'delivery' ? 'Cash on delivery' : 'Pay at pickup'}</span>
                  <span className="choice__sub">Pay the rider or the counter when it arrives.</span>
                </span>
              </label>
              {settings.cardPayments ? (
                <label className={`choice ${paymentMethod === 'card' ? 'is-selected' : ''}`}>
                  <input
                    type="radio"
                    name="payment"
                    value="card"
                    checked={paymentMethod === 'card'}
                    onChange={() => setPaymentMethod('card')}
                  />
                  <span>
                    <span className="choice__title">Card — secure hosted checkout</span>
                    <span className="choice__sub">
                      You will be redirected to our payment provider. KOMANDRA never sees or stores card details.
                    </span>
                  </span>
                </label>
              ) : (
                <p className="form-note" style={{ marginTop: '0.6rem' }}>
                  Card payments can be enabled by the restaurant; cash is always available.
                </p>
              )}
              <div className="field" style={{ marginTop: '0.9rem', marginBottom: 0 }}>
                <label htmlFor="checkout-notes">Notes for the kitchen</label>
                <textarea
                  id="checkout-notes"
                  value={form.notes}
                  onChange={(event) => setForm({ ...form, notes: event.target.value })}
                  placeholder="Allergies, gate codes, extra napkins…"
                  style={{ minHeight: '80px' }}
                />
              </div>
            </div>
          </div>

          <aside className="sticky-summary">
            <div className="panel">
              <div className="panel__head">
                <h2 className="panel__title">Your order</h2>
                <span className="drawer__count">
                  {cart.count} {cart.count === 1 ? 'item' : 'items'}
                </span>
              </div>

              <div style={{ display: 'grid', gap: '0.6rem', maxHeight: '260px', overflowY: 'auto', paddingRight: '0.2rem' }}>
                {cart.items.map((item) => (
                  <div key={item.key} style={{ display: 'grid', gridTemplateColumns: '44px 1fr auto', gap: '0.6rem', alignItems: 'center' }}>
                    <ProductImage src={item.image} alt={item.name} sizes="44px" />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.84rem', lineHeight: 1.3 }}>
                        {item.qty} × {item.name}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                        {[item.sizeName, item.addonNames.join(', ')].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.82rem', fontVariantNumeric: 'tabular-nums' }}>
                      {formatMoney(item.unitPriceCents * item.qty, settings.currency)}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '1rem', borderTop: '1px solid var(--line)', paddingTop: '0.9rem' }}>
                <div className="field" style={{ marginBottom: '0.5rem' }}>
                  <label htmlFor="coupon">Promo code</label>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <input
                      id="coupon"
                      value={form.coupon}
                      onChange={(event) => setForm({ ...form, coupon: event.target.value.toUpperCase() })}
                      placeholder="KOMANDRA10"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={applyCoupon}
                      disabled={couponLoading || !form.coupon.trim()}
                    >
                      {couponLoading ? <span className="spinner" /> : 'Apply'}
                    </button>
                  </div>
                </div>
                {couponError ? (
                  <p className="field__error" style={{ marginBottom: '0.5rem' }} role="alert">
                    {couponError}
                  </p>
                ) : null}
                {coupon ? (
                  <p className="avail" style={{ marginBottom: '0.6rem' }}>
                    <Check size={12} /> {coupon.code} applied
                  </p>
                ) : null}
              </div>

              <div className="totals">
                <div className="totals__row">
                  <span>Subtotal</span>
                  <span>{formatMoney(cart.subtotalCents, settings.currency)}</span>
                </div>
                {discount > 0 ? (
                  <div className="totals__row totals__row--discount">
                    <span>Discount</span>
                    <span>- {formatMoney(discount, settings.currency)}</span>
                  </div>
                ) : null}
                <div className="totals__row">
                  <span>{fulfillment === 'delivery' ? 'Delivery' : 'Pickup'}</span>
                  <span>{deliveryFee === 0 ? 'Free' : formatMoney(deliveryFee, settings.currency)}</span>
                </div>
                <div className="totals__row totals__row--total">
                  <span>Total</span>
                  <span>{formatMoney(total, settings.currency)}</span>
                </div>
              </div>

              {belowMinimum ? (
                <p className="field__error" style={{ marginTop: '0.7rem' }}>
                  Minimum delivery order is {formatMoney(settings.minOrderCents, settings.currency)} — add{' '}
                  {formatMoney(settings.minOrderCents - cart.subtotalCents, settings.currency)} more or choose pickup.
                </p>
              ) : null}

              <button
                type="submit"
                className="btn btn--gold btn--block btn--lg"
                style={{ marginTop: '0.9rem' }}
                disabled={submitting || belowMinimum}
              >
                {submitting ? <span className="spinner" /> : null}
                {submitting ? 'Placing order' : `Place order · ${formatMoney(total, settings.currency)}`}
                {!submitting ? <ArrowRight size={16} className="btn__arrow" /> : null}
              </button>
              <p className="form-note" style={{ marginTop: '0.7rem', textAlign: 'center' }}>
                Totals are recalculated on the server before your order is accepted.
              </p>
            </div>
          </aside>
        </div>
      </form>
    </>
  );
}

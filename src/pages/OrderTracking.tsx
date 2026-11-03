import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api, getOrder, type Order } from '../lib/api';
import { formatDate, formatMoney, statusLabel, statusTone } from '../lib/format';
import { usePageMeta } from '../lib/seo';
import { useAuth } from '../store/AuthContext';
import { useSettings } from '../store/SettingsContext';
import { useUI } from '../store/UIContext';
import { ArrowUpRight, Check, Clock, Whatsapp } from '../components/Icons';
import { EmptyState, ProductImage, Spinner } from '../components/ui';

export function OrderTrackingPage() {
  const { code = '' } = useParams();
  const [params] = useSearchParams();
  const { settings } = useSettings();
  const { user } = useAuth();
  const { notify } = useUI();
  const [order, setOrder] = useState<Order | null>(null);
  const [whatsappUrl, setWhatsappUrl] = useState('');
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [cancelling, setCancelling] = useState(false);

  usePageMeta(`Order ${code}`, 'Track your KOMANDRA order from the kitchen to your door.');

  const load = useCallback(async () => {
    try {
      const data = await getOrder(code);
      setOrder(data.order);
      setWhatsappUrl(data.whatsappUrl);
      setState('ready');
    } catch {
      setState('missing');
    }
  }, [code]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (params.get('paid') !== '1') return;
    api(`/orders/${code}/verify-payment`, { method: 'POST' })
      .then(() => {
        notify('Payment confirmed — the kitchen has your order.', 'success');
        void load();
      })
      .catch(() => notify('We could not confirm the payment yet. Refresh in a moment.', 'error'));
  }, [params, code, load, notify]);

  useEffect(() => {
    if (!order || ['completed', 'cancelled'].includes(order.status)) return;
    const timer = window.setInterval(() => void load(), 25_000);
    return () => window.clearInterval(timer);
  }, [order, load]);

  const steps = useMemo(() => {
    if (!order) return [];
    if (order.fulfillment === 'delivery') {
      return [
        { key: 'pending', label: 'Order received', hint: 'We have your order' },
        { key: 'confirmed', label: 'Confirmed', hint: 'Kitchen accepted' },
        { key: 'preparing', label: 'In the kitchen', hint: 'Cooking to order' },
        { key: 'out_for_delivery', label: 'Out for delivery', hint: `Rider on the way · ${settings.prepTime}` },
        { key: 'completed', label: 'Delivered', hint: 'Enjoy' },
      ];
    }
    return [
      { key: 'pending', label: 'Order received', hint: 'We have your order' },
      { key: 'confirmed', label: 'Confirmed', hint: 'Kitchen accepted' },
      { key: 'preparing', label: 'In the kitchen', hint: 'Cooking to order' },
      { key: 'ready', label: 'Ready for pickup', hint: settings.address },
      { key: 'completed', label: 'Collected', hint: 'Enjoy' },
    ];
  }, [order, settings.prepTime, settings.address]);

  if (state === 'loading') {
    return (
      <div className="shell">
        <Spinner label="Finding your order" />
      </div>
    );
  }

  if (state === 'missing' || !order) {
    return (
      <div className="shell page-head">
        <EmptyState
          title="Order not found"
          body="Check the reference in your confirmation message. It starts with a K and has seven characters after it."
          action={
            <Link to="/menu" className="btn btn--gold btn--sm">
              Back to the menu
            </Link>
          }
        />
      </div>
    );
  }

  const stepIndex = Math.max(0, steps.findIndex((step) => step.key === order.status));
  const activeIndex = order.status === 'completed' ? steps.length - 1 : stepIndex;
  const isNew = params.get('new') === '1';
  const canCancel = Boolean(user) && ['pending', 'confirmed'].includes(order.status);

  const cancelOrder = async () => {
    if (!window.confirm('Cancel this order? The kitchen will be notified.')) return;
    setCancelling(true);
    try {
      await api(`/orders/${code}/cancel`, { method: 'POST' });
      notify('Order cancelled.', 'success');
      await load();
    } catch (issue) {
      notify(issue instanceof Error ? issue.message : 'Could not cancel the order.', 'error');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="shell">
      <div className="track">
        <div>
          {isNew ? (
            <div
              className="panel"
              style={{ borderColor: 'rgba(143,211,166,.35)', background: 'rgba(143,211,166,.06)', marginBottom: '1rem' }}
            >
              <div style={{ display: 'flex', gap: '0.7rem', alignItems: 'center' }}>
                <span className="empty__icon" style={{ width: '2.2rem', height: '2.2rem', color: '#8fd3a6', borderColor: 'rgba(143,211,166,.4)' }}>
                  <Check size={16} />
                </span>
                <div>
                  <strong style={{ fontWeight: 500 }}>Order placed.</strong>
                  <p className="form-note" style={{ marginTop: '0.15rem' }}>
                    Keep this reference — {order.code} — and follow the kitchen below.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="panel">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="eyebrow">Order tracking</span>
                <h1 className="h2" style={{ fontSize: 'clamp(1.7rem, 4vw, 2.6rem)', marginTop: '0.6rem' }}>
                  {order.fulfillment === 'delivery' ? 'On its way to you' : 'Waiting at the counter'}
                </h1>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.6rem', marginTop: '0.5rem' }}>
                  <span className="track__code">{order.code}</span>
                  <span className={`status-pill status-pill--${statusTone(order.status)}`}>{statusLabel(order.status)}</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.25rem', fontVariantNumeric: 'tabular-nums' }}>
                  {formatMoney(order.totalCents, settings.currency)}
                </div>
                <div className="muted" style={{ fontSize: '0.74rem' }}>
                  {order.paymentMethod === 'card' ? 'Card' : 'Cash'} · {order.paymentStatus}
                </div>
              </div>
            </div>

            <div className="timeline">
              {steps.map((step, index) => {
                const done = index <= activeIndex;
                const current = index === activeIndex;
                return (
                  <div
                    key={step.key}
                    className={`timeline__step ${done ? 'is-done' : ''} ${current ? 'is-current' : ''}`}
                  >
                    <span className="timeline__dot" aria-hidden="true" />
                    <div>
                      <div className="timeline__label" style={{ color: done ? 'var(--ink)' : 'var(--muted)' }}>
                        {step.label}
                        {current && order.status !== 'completed' ? (
                          <span className="badge" style={{ marginLeft: '0.5rem' }}>
                            Now
                          </span>
                        ) : null}
                      </div>
                      <div className="timeline__meta">{step.hint}</div>
                    </div>
                    {index < steps.length - 1 ? <span className="timeline__line" aria-hidden="true" /> : null}
                  </div>
                );
              })}
            </div>

            {order.events.length > 0 ? (
              <>
                <h2 className="panel__title" style={{ marginTop: '1.4rem' }}>
                  Updates
                </h2>
                <div style={{ display: 'grid', gap: '0.35rem', marginTop: '0.6rem' }}>
                  {[...order.events].reverse().map((event, index) => (
                    <div key={`${event.status}-${index}`} style={{ display: 'flex', gap: '0.6rem', fontSize: '0.8rem', color: 'var(--muted)' }}>
                      <Clock size={13} style={{ flex: 'none', marginTop: '0.15rem' }} />
                      <span>
                        <span style={{ color: 'var(--ink)' }}>{statusLabel(event.status)}</span>
                        {event.note ? ` — ${event.note}` : ''} · {formatDate(event.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : null}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1.3rem' }}>
              {whatsappUrl ? (
                <a href={whatsappUrl} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">
                  <Whatsapp size={14} /> Message the kitchen
                </a>
              ) : null}
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => void load()}>
                Refresh status
              </button>
              {canCancel ? (
                <button type="button" className="btn btn--danger btn--sm" onClick={cancelOrder} disabled={cancelling}>
                  {cancelling ? 'Cancelling…' : 'Cancel order'}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <aside>
          <div className="panel">
            <h2 className="panel__title">Your items</h2>
            <div style={{ marginTop: '0.6rem' }}>
              {order.items.map((item, index) => (
                <div className="order-line" key={`${item.name}-${index}`}>
                  {item.image ? <ProductImage src={item.image} alt={item.name} sizes="48px" /> : <span />}
                  <div style={{ minWidth: 0 }}>
                    <div>
                      {item.qty} × {item.name}
                    </div>
                    <div className="order-line__opts">
                      {[item.sizeName, item.addonNames ? JSON.parse(item.addonNames).join(', ') : ''].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(item.totalCents, settings.currency)}</span>
                </div>
              ))}
            </div>

            <div className="totals" style={{ marginTop: '0.9rem' }}>
              <div className="totals__row">
                <span>Subtotal</span>
                <span>{formatMoney(order.subtotalCents, settings.currency)}</span>
              </div>
              {order.discountCents > 0 ? (
                <div className="totals__row totals__row--discount">
                  <span>Discount {order.couponCode ? `(${order.couponCode})` : ''}</span>
                  <span>- {formatMoney(order.discountCents, settings.currency)}</span>
                </div>
              ) : null}
              <div className="totals__row">
                <span>{order.fulfillment === 'delivery' ? 'Delivery' : 'Pickup'}</span>
                <span>{order.deliveryFeeCents === 0 ? 'Free' : formatMoney(order.deliveryFeeCents, settings.currency)}</span>
              </div>
              <div className="totals__row totals__row--total">
                <span>Total</span>
                <span>{formatMoney(order.totalCents, settings.currency)}</span>
              </div>
            </div>
          </div>

          <div className="panel" style={{ marginTop: '1rem' }}>
            <h2 className="panel__title">{order.fulfillment === 'delivery' ? 'Delivery to' : 'Pickup from'}</h2>
            <p className="form-note" style={{ marginTop: '0.4rem' }}>
              {order.customerName}
              <br />
              {order.fulfillment === 'delivery' ? order.address : settings.address}
              <br />
              {order.phone}
            </p>
            {order.notes ? (
              <p className="form-note" style={{ marginTop: '0.5rem' }}>
                <em>“{order.notes}”</em>
              </p>
            ) : null}
            <p className="form-note" style={{ marginTop: '0.8rem', fontSize: '0.72rem' }}>
              Placed {formatDate(order.createdAt)}
            </p>
            <Link to="/menu" className="link-arrow" style={{ marginTop: '0.9rem' }}>
              Order again <ArrowUpRight size={14} />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

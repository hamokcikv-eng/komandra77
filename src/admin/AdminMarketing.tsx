import { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { formatMoney } from '../lib/format';
import { useSettings } from '../store/SettingsContext';
import { useUI } from '../store/UIContext';
import { ProductImage } from '../components/ui';
import { AdminError, AdminModal, AdminPage, Field, useFetch } from './shared';

type AdminOffer = {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  productId: number | null;
  originalCents: number;
  offerCents: number;
  image: string;
  badge: string;
  active: boolean;
  endsAt: string | null;
  sort: number;
};

type ProductOption = { id: number; name: string; image: string; price_cents: number };

type OfferForm = {
  title: string;
  subtitle: string;
  productId: string;
  original: string;
  offer: string;
  image: string;
  badge: string;
  active: boolean;
  endsAt: string;
  sort: string;
};

const EMPTY: OfferForm = {
  title: '',
  subtitle: '',
  productId: '',
  original: '',
  offer: '',
  image: '',
  badge: '',
  active: true,
  endsAt: '',
  sort: '1',
};

export function AdminOffers() {
  const { data, error, loading, reload } = useFetch<{ offers: AdminOffer[]; products: ProductOption[] }>('/admin/offers');
  const { settings } = useSettings();
  const { notify } = useUI();
  const [form, setForm] = useState<OfferForm>(EMPTY);
  const [editing, setEditing] = useState<AdminOffer | null>(null);
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data && !form.productId && data.products[0]) {
      setForm((current) => ({ ...current, productId: String(data.products[0].id) }));
    }
  }, [data, form.productId]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY, productId: String(data?.products[0]?.id ?? '') });
    setFormError('');
    setOpen(true);
  };

  const openEdit = (offer: AdminOffer) => {
    setEditing(offer);
    setForm({
      title: offer.title,
      subtitle: offer.subtitle,
      productId: String(offer.productId ?? ''),
      original: (offer.originalCents / 100).toFixed(2),
      offer: (offer.offerCents / 100).toFixed(2),
      image: offer.image,
      badge: offer.badge,
      active: offer.active,
      endsAt: offer.endsAt ?? '',
      sort: String(offer.sort),
    });
    setFormError('');
    setOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setFormError('');
    try {
      const payload = {
        title: form.title,
        subtitle: form.subtitle,
        productId: Number(form.productId),
        original: form.original,
        offer: form.offer,
        image: form.image,
        badge: form.badge,
        active: form.active,
        endsAt: form.endsAt,
        sort: form.sort,
      };
      if (editing) {
        await api(`/admin/offers/${editing.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
        notify('Offer updated.', 'success');
      } else {
        await api('/admin/offers', { method: 'POST', body: JSON.stringify(payload) });
        notify('Offer created.', 'success');
      }
      setOpen(false);
      await reload();
    } catch (issue) {
      setFormError(issue instanceof ApiError ? issue.message : 'Could not save the offer.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (offer: AdminOffer) => {
    if (!window.confirm(`Delete ${offer.title}?`)) return;
    try {
      await api(`/admin/offers/${offer.id}`, { method: 'DELETE' });
      notify('Offer deleted.', 'success');
      await reload();
    } catch {
      notify('Could not delete the offer.', 'error');
    }
  };

  return (
    <AdminPage
      title="Offers"
      sub="Offers price the linked dish automatically at checkout — no promo code needed."
      action={
        <button type="button" className="btn btn--gold btn--sm" onClick={openCreate}>
          New offer
        </button>
      }
    >
      <AdminError message={error} />
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Offer</th>
              <th>Dish</th>
              <th>Price</th>
              <th>State</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="note">
                  Loading offers…
                </td>
              </tr>
            ) : (data?.offers ?? []).length === 0 ? (
              <tr>
                <td colSpan={5} className="note">
                  No offers yet.
                </td>
              </tr>
            ) : (
              data?.offers.map((offer) => (
                <tr key={offer.id}>
                  <td>
                    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                      {offer.image ? <ProductImage src={offer.image} alt="" sizes="40px" className="table-thumb" /> : null}
                      <div>
                        <div style={{ fontSize: '0.86rem' }}>{offer.title}</div>
                        <div className="note" style={{ fontSize: '0.7rem' }}>
                          {offer.badge || '—'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{data?.products.find((product) => product.id === offer.productId)?.name ?? '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {formatMoney(offer.offerCents, settings.currency)}
                    <div className="note" style={{ textDecoration: 'line-through', fontSize: '0.7rem' }}>
                      {formatMoney(offer.originalCents, settings.currency)}
                    </div>
                  </td>
                  <td>
                    <span className={`status-pill status-pill--${offer.active ? 'green' : 'muted'}`}>
                      {offer.active ? 'Live' : 'Hidden'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => openEdit(offer)}>
                        Edit
                      </button>
                      <button type="button" className="btn btn--quiet" onClick={() => void remove(offer)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {open ? (
        <AdminModal title={editing ? 'Edit offer' : 'New offer'} onClose={() => setOpen(false)}>
          <form onSubmit={submit}>
            <AdminError message={formError} />
            <Field label="Title">
              <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
            </Field>
            <Field label="Subtitle">
              <input value={form.subtitle} onChange={(event) => setForm({ ...form, subtitle: event.target.value })} />
            </Field>
            <Field label="Dish">
              <select value={form.productId} onChange={(event) => setForm({ ...form, productId: event.target.value })} required>
                {data?.products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="field-row field-row--2">
              <Field label={`Original price (${settings.currency})`}>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={form.original}
                  onChange={(event) => setForm({ ...form, original: event.target.value })}
                  required
                />
              </Field>
              <Field label={`Offer price (${settings.currency})`}>
                <input
                  type="number"
                  step="0.01"
                  min="0.5"
                  value={form.offer}
                  onChange={(event) => setForm({ ...form, offer: event.target.value })}
                  required
                />
              </Field>
            </div>
            <div className="field-row field-row--2">
              <Field label="Image URL" hint="Leave blank to use the dish image.">
                <input value={form.image} onChange={(event) => setForm({ ...form, image: event.target.value })} />
              </Field>
              <Field label="Badge">
                <input value={form.badge} onChange={(event) => setForm({ ...form, badge: event.target.value })} maxLength={30} />
              </Field>
            </div>
            <div className="field-row field-row--2">
              <Field label="Ends at" hint="Optional ISO date/time, e.g. 2026-12-31T23:59.">
                <input value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} />
              </Field>
              <Field label="Sort order">
                <input type="number" value={form.sort} onChange={(event) => setForm({ ...form, sort: event.target.value })} />
              </Field>
            </div>
            <label className="checkbox" style={{ marginBottom: '0.9rem' }}>
              <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
              Live on the storefront
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn btn--gold" disabled={busy}>
                {busy ? <span className="spinner" /> : null}
                {editing ? 'Save offer' : 'Create offer'}
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => setOpen(false)}>
                Cancel
              </button>
            </div>
          </form>
        </AdminModal>
      ) : null}
    </AdminPage>
  );
}

type AdminCoupon = {
  id: number;
  code: string;
  kind: 'percent' | 'fixed';
  value: number;
  minSubtotalCents: number;
  maxUses: number;
  uses: number;
  active: boolean;
  expiresAt: string | null;
  description: string;
};

type CouponForm = {
  code: string;
  kind: 'percent' | 'fixed';
  value: string;
  minSubtotal: string;
  maxUses: string;
  active: boolean;
  expiresAt: string;
  description: string;
};

const COUPON_EMPTY: CouponForm = {
  code: '',
  kind: 'percent',
  value: '10',
  minSubtotal: '0',
  maxUses: '0',
  active: true,
  expiresAt: '',
  description: '',
};

export function AdminCoupons() {
  const { data, error, loading, reload } = useFetch<{ coupons: AdminCoupon[] }>('/admin/coupons');
  const { settings } = useSettings();
  const { notify } = useUI();
  const [form, setForm] = useState<CouponForm>(COUPON_EMPTY);
  const [editing, setEditing] = useState<AdminCoupon | null>(null);
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setForm(COUPON_EMPTY);
    setFormError('');
    setOpen(true);
  };

  const openEdit = (coupon: AdminCoupon) => {
    setEditing(coupon);
    setForm({
      code: coupon.code,
      kind: coupon.kind,
      value: coupon.kind === 'percent' ? String(coupon.value) : (coupon.value / 100).toFixed(2),
      minSubtotal: (coupon.minSubtotalCents / 100).toFixed(2),
      maxUses: String(coupon.maxUses),
      active: coupon.active,
      expiresAt: coupon.expiresAt ?? '',
      description: coupon.description,
    });
    setFormError('');
    setOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setFormError('');
    try {
      const payload = {
        code: form.code,
        kind: form.kind,
        value: form.value,
        minSubtotal: form.minSubtotal,
        maxUses: form.maxUses,
        active: form.active,
        expiresAt: form.expiresAt,
        description: form.description,
      };
      if (editing) {
        await api(`/admin/coupons/${editing.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
        notify('Promo code updated.', 'success');
      } else {
        await api('/admin/coupons', { method: 'POST', body: JSON.stringify(payload) });
        notify('Promo code created.', 'success');
      }
      setOpen(false);
      await reload();
    } catch (issue) {
      setFormError(issue instanceof ApiError ? issue.message : 'Could not save the promo code.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (coupon: AdminCoupon) => {
    if (!window.confirm(`Delete ${coupon.code}?`)) return;
    try {
      await api(`/admin/coupons/${coupon.id}`, { method: 'DELETE' });
      notify('Promo code deleted.', 'success');
      await reload();
    } catch {
      notify('Could not delete the promo code.', 'error');
    }
  };

  return (
    <AdminPage
      title="Promo codes"
      sub="Discounts are validated against live subtotals and usage limits on the server."
      action={
        <button type="button" className="btn btn--gold btn--sm" onClick={openCreate}>
          New code
        </button>
      }
    >
      <AdminError message={error} />
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Code</th>
              <th>Discount</th>
              <th>Minimum</th>
              <th>Uses</th>
              <th>State</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="note">
                  Loading promo codes…
                </td>
              </tr>
            ) : (data?.coupons ?? []).length === 0 ? (
              <tr>
                <td colSpan={6} className="note">
                  No promo codes yet.
                </td>
              </tr>
            ) : (
              data?.coupons.map((coupon) => (
                <tr key={coupon.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{coupon.code}</td>
                  <td>
                    {coupon.kind === 'percent' ? `${coupon.value}%` : formatMoney(coupon.value, settings.currency)}
                  </td>
                  <td>{coupon.minSubtotalCents ? formatMoney(coupon.minSubtotalCents, settings.currency) : '—'}</td>
                  <td>
                    {coupon.uses}
                    {coupon.maxUses ? ` / ${coupon.maxUses}` : ''}
                  </td>
                  <td>
                    <span className={`status-pill status-pill--${coupon.active ? 'green' : 'muted'}`}>
                      {coupon.active ? 'Active' : 'Paused'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => openEdit(coupon)}>
                        Edit
                      </button>
                      <button type="button" className="btn btn--quiet" onClick={() => void remove(coupon)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {open ? (
        <AdminModal title={editing ? 'Edit promo code' : 'New promo code'} onClose={() => setOpen(false)}>
          <form onSubmit={submit}>
            <AdminError message={formError} />
            <div className="field-row field-row--2">
              <Field label="Code">
                <input
                  value={form.code}
                  onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })}
                  required
                  minLength={3}
                />
              </Field>
              <Field label="Type">
                <select
                  value={form.kind}
                  onChange={(event) => setForm({ ...form, kind: event.target.value as 'percent' | 'fixed' })}
                >
                  <option value="percent">Percentage off</option>
                  <option value="fixed">Fixed amount off</option>
                </select>
              </Field>
            </div>
            <div className="field-row field-row--2">
              <Field label={form.kind === 'percent' ? 'Percentage' : `Amount (${settings.currency})`}>
                <input
                  type="number"
                  step={form.kind === 'percent' ? '1' : '0.01'}
                  min="1"
                  max={form.kind === 'percent' ? '100' : undefined}
                  value={form.value}
                  onChange={(event) => setForm({ ...form, value: event.target.value })}
                  required
                />
              </Field>
              <Field label={`Minimum subtotal (${settings.currency})`}>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.minSubtotal}
                  onChange={(event) => setForm({ ...form, minSubtotal: event.target.value })}
                />
              </Field>
            </div>
            <div className="field-row field-row--2">
              <Field label="Max uses" hint="0 = unlimited.">
                <input
                  type="number"
                  min="0"
                  value={form.maxUses}
                  onChange={(event) => setForm({ ...form, maxUses: event.target.value })}
                />
              </Field>
              <Field label="Expires" hint="Optional ISO date, e.g. 2026-12-31.">
                <input value={form.expiresAt} onChange={(event) => setForm({ ...form, expiresAt: event.target.value })} />
              </Field>
            </div>
            <Field label="Description">
              <input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            </Field>
            <label className="checkbox" style={{ marginBottom: '0.9rem' }}>
              <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
              Active
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn btn--gold" disabled={busy}>
                {busy ? <span className="spinner" /> : null}
                {editing ? 'Save code' : 'Create code'}
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => setOpen(false)}>
                Cancel
              </button>
            </div>
          </form>
        </AdminModal>
      ) : null}
    </AdminPage>
  );
}

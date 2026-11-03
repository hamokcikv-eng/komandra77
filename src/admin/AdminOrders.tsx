import { useState } from 'react';
import { api, ApiError } from '../lib/api';
import { formatDate, formatMoney, timeAgo } from '../lib/format';
import { useSettings } from '../store/SettingsContext';
import { useUI } from '../store/UIContext';
import { AdminError, AdminModal, AdminPage, StatusPill, useFetch } from './shared';

type OrderSummary = {
  code: string;
  customerName: string;
  phone: string;
  fulfillment: string;
  totalCents: number;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
};

type OrderDetail = {
  code: string;
  status: string;
  fulfillment: string;
  customerName: string;
  phone: string;
  email: string | null;
  address: string | null;
  notes: string | null;
  subtotalCents: number;
  discountCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  couponCode: string | null;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  items: Array<{ name: string; qty: number; unitPriceCents: number; totalCents: number; sizeName: string | null; addonNames: string | null }>;
  events: Array<{ status: string; note: string | null; createdAt: string }>;
};

const STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled'];
const FILTERS = ['', ...STATUSES];

export function AdminOrders() {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const { data, error, loading, reload } = useFetch<{ orders: OrderSummary[]; counts: Record<string, number> }>(
    `/admin/orders?status=${encodeURIComponent(status)}&q=${encodeURIComponent(query)}`,
  );
  const [selected, setSelected] = useState<OrderDetail | null>(null);
  const [detailError, setDetailError] = useState('');
  const [nextStatus, setNextStatus] = useState('confirmed');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const { settings } = useSettings();
  const { notify } = useUI();

  const openOrder = async (code: string) => {
    setDetailError('');
    try {
      const result = await api<{ order: OrderDetail }>(`/admin/orders/${code}`);
      setSelected(result.order);
      setNextStatus(result.order.status);
      setNote('');
    } catch (issue) {
      notify(issue instanceof ApiError ? issue.message : 'Could not load the order.', 'error');
    }
  };

  const updateStatus = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await api(`/admin/orders/${selected.code}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus, note }),
      });
      notify(`Order ${selected.code} / ${nextStatus.replace(/_/g, ' ')}.`, 'success');
      await reload();
      await openOrder(selected.code);
    } catch (issue) {
      setDetailError(issue instanceof ApiError ? issue.message : 'Could not update the order.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminPage
      title="Orders"
      sub="Kitchen queue, delivery handoff and order history in one list."
      action={
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => void reload()}>
          Refresh
        </button>
      }
    >
      <AdminError message={error} />
      <div className="admin-toolbar">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') setQuery(search);
          }}
          placeholder="Search code, name or phone"
          aria-label="Search orders"
        />
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setQuery(search)}>
          Search
        </button>
        <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status">
          {FILTERS.map((option) => (
            <option value={option} key={option || 'all'}>
              {option ? option.replace(/_/g, ' ') : 'All statuses'}
            </option>
          ))}
        </select>
      </div>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Code</th>
              <th>Customer</th>
              <th>Type</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Placed</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="note">
                  Loading orders…
                </td>
              </tr>
            ) : (data?.orders ?? []).length === 0 ? (
              <tr>
                <td colSpan={8} className="note">
                  No orders match this filter.
                </td>
              </tr>
            ) : (
              data?.orders.map((order) => (
                <tr key={order.code}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem' }}>{order.code}</td>
                  <td>
                    {order.customerName}
                    <div className="note" style={{ fontSize: '0.68rem' }}>
                      {order.phone}
                    </div>
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>{order.fulfillment}</td>
                  <td>{formatMoney(order.totalCents, settings.currency)}</td>
                  <td style={{ textTransform: 'capitalize' }}>
                    {order.paymentMethod} · {order.paymentStatus}
                  </td>
                  <td>
                    <StatusPill status={order.status} />
                  </td>
                  <td className="note">{timeAgo(order.createdAt)}</td>
                  <td>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => void openOrder(order.code)}>
                      Open
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="note" style={{ marginTop: '0.6rem' }}>
        {Object.entries(data?.counts ?? {})
          .map(([key, value]) => `${value} ${key.replace(/_/g, ' ')}`)
          .join(' · ') || 'No orders yet.'}
      </p>

      {selected ? (
        <AdminModal title={`Order ${selected.code}`} onClose={() => setSelected(null)} wide>
          <AdminError message={detailError} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', marginBottom: '0.9rem' }}>
            <StatusPill status={selected.status} />
            <span className="note">{formatDate(selected.createdAt)}</span>
            <span className="note">
              {selected.fulfillment} · {selected.paymentMethod} · {selected.paymentStatus}
            </span>
            <span style={{ marginLeft: 'auto', fontSize: '0.95rem' }}>{formatMoney(selected.totalCents, settings.currency)}</span>
          </div>

          <div className="field-row field-row--2">
            <div>
              <h3 className="note" style={{ textTransform: 'uppercase', letterSpacing: '0.14em' }}>
                Customer
              </h3>
              <p className="note">
                {selected.customerName}
                <br />
                {selected.phone}
                {selected.email ? (
                  <>
                    <br />
                    {selected.email}
                  </>
                ) : null}
                {selected.address ? (
                  <>
                    <br />
                    {selected.address}
                  </>
                ) : null}
              </p>
              {selected.notes ? <p className="note">Note: “{selected.notes}”</p> : null}
            </div>
            <div>
              <h3 className="note" style={{ textTransform: 'uppercase', letterSpacing: '0.14em' }}>
                Items
              </h3>
              {selected.items.map((item, index) => (
                <p className="note" key={`${item.name}-${index}`}>
                  {item.qty} × {item.name} · {formatMoney(item.totalCents, settings.currency)}
                  {item.sizeName ? ` · ${item.sizeName}` : ''}
                  {item.addonNames ? ` · ${JSON.parse(item.addonNames).join(', ')}` : ''}
                </p>
              ))}
              <p className="note" style={{ marginTop: '0.4rem' }}>
                Subtotal {formatMoney(selected.subtotalCents, settings.currency)}
                {selected.discountCents > 0 ? ` · Discount ${formatMoney(selected.discountCents, settings.currency)}` : ''}
                {selected.deliveryFeeCents > 0 ? ` · Delivery ${formatMoney(selected.deliveryFeeCents, settings.currency)}` : ''}
                {selected.couponCode ? ` · ${selected.couponCode}` : ''}
              </p>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--line)', marginTop: '0.8rem', paddingTop: '0.8rem' }}>
            <h3 className="note" style={{ textTransform: 'uppercase', letterSpacing: '0.14em' }}>
              Update status
            </h3>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
              <select value={nextStatus} onChange={(event) => setNextStatus(event.target.value)} aria-label="New status">
                {STATUSES.map((option) => (
                  <option value={option} key={option}>
                    {option.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
              <input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Optional note for the customer"
                aria-label="Status note"
                style={{ flex: '1 1 200px' }}
              />
              <button type="button" className="btn btn--gold btn--sm" onClick={updateStatus} disabled={saving}>
                {saving ? <span className="spinner" /> : null}
                Update
              </button>
            </div>
            {selected.events.length > 0 ? (
              <div style={{ marginTop: '0.8rem', display: 'grid', gap: '0.25rem' }}>
                {[...selected.events].reverse().map((event, index) => (
                  <p className="note" key={`${event.status}-${index}`} style={{ margin: 0 }}>
                    {event.status.replace(/_/g, ' ')} · {formatDate(event.createdAt)}
                    {event.note ? ` — ${event.note}` : ''}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        </AdminModal>
      ) : null}
    </AdminPage>
  );
}

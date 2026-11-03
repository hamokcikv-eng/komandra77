import { useEffect, useState } from 'react';
import { api, ApiError, type Settings } from '../lib/api';
import { formatDate } from '../lib/format';
import { useSettings } from '../store/SettingsContext';
import { useUI } from '../store/UIContext';
import { ProductImage } from '../components/ui';
import { AdminError, AdminPage, Field, StatusPill, useFetch } from './shared';

type InventoryItem = { id: number; name: string; image: string; stock: number; lowStockAt: number; available: boolean };
type InventoryLog = { id: number; productName: string; delta: number; reason: string; createdAt: string };

export function AdminInventory() {
  const { data, error, loading, reload } = useFetch<{ items: InventoryItem[]; log: InventoryLog[] }>('/admin/inventory');
  const { settings } = useSettings();
  const { notify } = useUI();
  const [values, setValues] = useState<Record<number, string>>({});
  const [reason, setReason] = useState('Restock');
  const [busyId, setBusyId] = useState<number | null>(null);

  const adjust = async (item: InventoryItem, mode: 'adjust' | 'set') => {
    const raw = values[item.id];
    if (raw === undefined || raw === '') {
      notify('Enter a quantity first.', 'error');
      return;
    }
    setBusyId(item.id);
    try {
      await api(`/admin/inventory/${item.id}`, {
        method: 'POST',
        body: JSON.stringify({ mode, value: Number(raw), reason }),
      });
      notify(`${item.name} stock updated.`, 'success');
      setValues((current) => ({ ...current, [item.id]: '' }));
      await reload();
    } catch (issue) {
      notify(issue instanceof ApiError ? issue.message : 'Could not update stock.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminPage
      title="Inventory"
      sub="Stock decrements automatically with every order and restocks on cancellation."
      action={
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => void reload()}>
          Refresh
        </button>
      }
    >
      <AdminError message={error} />
      <div className="panel" style={{ marginBottom: '1rem' }}>
        <Field label="Reason for adjustment" hint="Recorded against every change in the inventory log below.">
          <input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={120} />
        </Field>
      </div>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Dish</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Adjust</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="note">
                  Loading inventory…
                </td>
              </tr>
            ) : (
              (data?.items ?? []).map((item) => (
                <tr key={item.id}>
                  <td>
                    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                      <ProductImage src={item.image} alt="" sizes="40px" className="table-thumb" />
                      <span style={{ fontSize: '0.86rem' }}>{item.name}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ color: item.stock <= item.lowStockAt ? '#e4756a' : 'var(--ink)' }}>{item.stock}</span>
                    <div className="note" style={{ fontSize: '0.68rem' }}>
                      alert ≤ {item.lowStockAt}
                    </div>
                  </td>
                  <td>
                    {item.stock <= 0 ? (
                      <span className="status-pill status-pill--red">Sold out</span>
                    ) : item.stock <= item.lowStockAt ? (
                      <span className="status-pill status-pill--gold">Low</span>
                    ) : (
                      <span className="status-pill status-pill--green">Healthy</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                      <input
                        type="number"
                        min="0"
                        value={values[item.id] ?? ''}
                        onChange={(event) => setValues({ ...values, [item.id]: event.target.value })}
                        placeholder="Qty"
                        aria-label={`Quantity for ${item.name}`}
                        style={{
                          width: '74px',
                          padding: '0.4rem 0.5rem',
                          borderRadius: 8,
                          border: '1px solid var(--line)',
                          background: 'rgba(8,10,11,0.7)',
                          fontSize: '0.8rem',
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => void adjust(item, 'adjust')}
                        disabled={busyId === item.id}
                      >
                        +/-
                      </button>
                      <button
                        type="button"
                        className="btn btn--quiet"
                        onClick={() => void adjust(item, 'set')}
                        disabled={busyId === item.id}
                      >
                        Set
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="panel" style={{ marginTop: '1rem' }}>
        <h2 className="panel__title">Recent stock movements</h2>
        <div style={{ display: 'grid', gap: '0.3rem', marginTop: '0.6rem' }}>
          {(data?.log ?? []).length === 0 ? (
            <p className="note">No movements recorded yet.</p>
          ) : (
            data?.log.map((entry) => (
              <div key={entry.id} style={{ display: 'flex', gap: '0.6rem', fontSize: '0.78rem', color: 'var(--muted)' }}>
                <span style={{ color: entry.delta >= 0 ? '#8fd3a6' : '#e4756a', width: '3rem' }}>
                  {entry.delta >= 0 ? '+' : ''}
                  {entry.delta}
                </span>
                <span style={{ flex: 1 }}>{entry.productName}</span>
                <span>{entry.reason}</span>
                <span>{formatDate(entry.createdAt)}</span>
              </div>
            ))
          )}
        </div>
        <p className="note" style={{ marginTop: '0.6rem' }}>
          Prices shown in {settings.currency}; all stock movements are logged with the order reference or admin reason.
        </p>
      </div>
    </AdminPage>
  );
}

type Reservation = {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  partySize: number;
  date: string;
  time: string;
  notes: string | null;
  status: string;
  createdAt: string;
};

export function AdminReservations() {
  const { data, error, loading, reload } = useFetch<{ reservations: Reservation[] }>('/admin/reservations');
  const { notify } = useUI();

  const update = async (reservation: Reservation, status: string) => {
    try {
      await api(`/admin/reservations/${reservation.id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      notify(`Reservation ${status}.`, 'success');
      await reload();
    } catch (issue) {
      notify(issue instanceof ApiError ? issue.message : 'Could not update the reservation.', 'error');
    }
  };

  return (
    <AdminPage
      title="Reservations"
      sub="Requests from the website. Confirm before service."
      action={
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => void reload()}>
          Refresh
        </button>
      }
    >
      <AdminError message={error} />
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Guest</th>
              <th>Party</th>
              <th>When</th>
              <th>Status</th>
              <th>Set status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="note">
                  Loading reservations…
                </td>
              </tr>
            ) : (data?.reservations ?? []).length === 0 ? (
              <tr>
                <td colSpan={5} className="note">
                  No reservations yet.
                </td>
              </tr>
            ) : (
              data?.reservations.map((reservation) => (
                <tr key={reservation.id}>
                  <td>
                    {reservation.name}
                    <div className="note" style={{ fontSize: '0.7rem' }}>
                      {reservation.phone}
                      {reservation.email ? ` · ${reservation.email}` : ''}
                    </div>
                  </td>
                  <td>{reservation.partySize}</td>
                  <td>
                    {reservation.date} · {reservation.time}
                    {reservation.notes ? <div className="note">“{reservation.notes}”</div> : null}
                  </td>
                  <td>
                    <StatusPill status={reservation.status} />
                  </td>
                  <td>
                    <select
                      value={reservation.status}
                      onChange={(event) => void update(reservation, event.target.value)}
                      aria-label={`Status for ${reservation.name}`}
                      style={{
                        padding: '0.4rem 0.5rem',
                        borderRadius: 8,
                        border: '1px solid var(--line)',
                        background: 'rgba(8,10,11,0.7)',
                        fontSize: '0.78rem',
                      }}
                    >
                      {['pending', 'confirmed', 'seated', 'cancelled'].map((status) => (
                        <option value={status} key={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AdminPage>
  );
}

type Message = {
  id: number;
  name: string;
  phone: string | null;
  email: string;
  message: string;
  status: string;
  createdAt: string;
};

export function AdminMessages() {
  const { data, error, loading, reload } = useFetch<{ messages: Message[] }>('/admin/messages');
  const { notify } = useUI();

  const setStatus = async (message: Message, status: string) => {
    try {
      await api(`/admin/messages/${message.id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      await reload();
      notify('Message updated.', 'success');
    } catch {
      notify('Could not update the message.', 'error');
    }
  };

  return (
    <AdminPage
      title="Messages"
      sub="Contact form enquiries from the website."
      action={
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => void reload()}>
          Refresh
        </button>
      }
    >
      <AdminError message={error} />
      {loading ? (
        <p className="note">Loading messages…</p>
      ) : (data?.messages ?? []).length === 0 ? (
        <div className="empty">
          <h3>No messages</h3>
          <p>Enquiries from the contact form will appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.6rem' }}>
          {data?.messages.map((message) => (
            <div className="panel" key={message.id}>
              <div className="panel__head" style={{ marginBottom: '0.4rem' }}>
                <div>
                  <h2 className="panel__title">{message.name}</h2>
                  <p className="panel__sub">
                    {message.email}
                    {message.phone ? ` · ${message.phone}` : ''} · {formatDate(message.createdAt)}
                  </p>
                </div>
                <StatusPill status={message.status} />
              </div>
              <p className="note" style={{ color: 'var(--ink)', fontSize: '0.86rem' }}>
                {message.message}
              </p>
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.7rem', flexWrap: 'wrap' }}>
                <a href={`mailto:${message.email}`} className="btn btn--gold btn--sm">
                  Reply by email
                </a>
                {message.phone ? (
                  <a href={`tel:${message.phone.replace(/\s/g, '')}`} className="btn btn--ghost btn--sm">
                    Call
                  </a>
                ) : null}
                <button type="button" className="btn btn--quiet" onClick={() => void setStatus(message, 'read')}>
                  Mark read
                </button>
                <button type="button" className="btn btn--quiet" onClick={() => void setStatus(message, 'replied')}>
                  Mark replied
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminPage>
  );
}

type Hours = Array<{ day: string; open: string; close: string }>;

export function AdminSettings() {
  const { data, error, loading, reload } = useFetch<{ settings: Settings; adminDefaultPassword: boolean }>('/admin/settings');
  const { refresh } = useSettings();
  const { notify } = useUI();
  const [form, setForm] = useState({
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    city: '',
    mapQuery: '',
    prepTime: '',
    deliveryFee: '',
    freeDeliveryThreshold: '',
    minOrder: '',
    instagram: '',
    tiktok: '',
    x: '',
    currency: 'SAR',
  });
  const [hours, setHours] = useState<Hours>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!data) return;
    const s = data.settings;
    setForm({
      phone: s.phone,
      whatsapp: s.whatsapp,
      email: s.email,
      address: s.address,
      city: s.city,
      mapQuery: s.mapQuery,
      prepTime: s.prepTime,
      deliveryFee: (s.deliveryFeeCents / 100).toFixed(2),
      freeDeliveryThreshold: (s.freeDeliveryThresholdCents / 100).toFixed(2),
      minOrder: (s.minOrderCents / 100).toFixed(2),
      instagram: s.instagram,
      tiktok: s.tiktok,
      x: s.x,
      currency: s.currency,
    });
    setHours(Array.isArray(s.hours) ? s.hours : []);
  }, [data]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setSaveError('');
    try {
      await api('/admin/settings', { method: 'PATCH', body: JSON.stringify({ ...form, hours }) });
      notify('Settings saved.', 'success');
      await Promise.all([reload(), refresh()]);
    } catch (issue) {
      setSaveError(issue instanceof ApiError ? issue.message : 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminPage title="Settings" sub="Contact details, delivery economics and opening hours across the site.">
      <AdminError message={error || saveError} />
      {data?.adminDefaultPassword ? (
        <div className="panel" style={{ borderColor: 'rgba(233,162,59,.4)', marginBottom: '1rem' }}>
          <strong style={{ fontWeight: 500 }}>Default admin password is still active.</strong>
          <p className="note" style={{ marginTop: '0.3rem' }}>
            Update it from Account / Profile / Change password. The warning clears automatically.
          </p>
        </div>
      ) : null}

      {loading ? (
        <p className="note">Loading settings…</p>
      ) : (
        <form onSubmit={save}>
          <div className="admin-grid admin-grid--2">
            <div className="panel">
              <h2 className="panel__title">Contact</h2>
              <div className="field-row field-row--2">
                <Field label="Phone">
                  <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
                </Field>
                <Field label="WhatsApp number" hint="Digits only, including country code.">
                  <input value={form.whatsapp} onChange={(event) => setForm({ ...form, whatsapp: event.target.value })} />
                </Field>
              </div>
              <Field label="Email">
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                />
              </Field>
              <Field label="Street address">
                <input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
              </Field>
              <div className="field-row field-row--2">
                <Field label="City">
                  <input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
                </Field>
                <Field label="Map search query">
                  <input value={form.mapQuery} onChange={(event) => setForm({ ...form, mapQuery: event.target.value })} />
                </Field>
              </div>
              <Field label="Prep / delivery estimate">
                <input value={form.prepTime} onChange={(event) => setForm({ ...form, prepTime: event.target.value })} />
              </Field>
              <div className="field-row field-row--2">
                <Field label="Instagram URL">
                  <input value={form.instagram} onChange={(event) => setForm({ ...form, instagram: event.target.value })} />
                </Field>
                <Field label="TikTok URL">
                  <input value={form.tiktok} onChange={(event) => setForm({ ...form, tiktok: event.target.value })} />
                </Field>
              </div>
              <Field label="X URL">
                <input value={form.x} onChange={(event) => setForm({ ...form, x: event.target.value })} />
              </Field>
            </div>

            <div>
              <div className="panel">
                <h2 className="panel__title">Delivery &amp; pricing</h2>
                <div className="field-row field-row--2">
                  <Field label="Delivery fee">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.deliveryFee}
                      onChange={(event) => setForm({ ...form, deliveryFee: event.target.value })}
                    />
                  </Field>
                  <Field label="Free delivery over">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.freeDeliveryThreshold}
                      onChange={(event) => setForm({ ...form, freeDeliveryThreshold: event.target.value })}
                    />
                  </Field>
                </div>
                <div className="field-row field-row--2">
                  <Field label="Minimum delivery order">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.minOrder}
                      onChange={(event) => setForm({ ...form, minOrder: event.target.value })}
                    />
                  </Field>
                  <Field label="Currency code">
                    <input value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value })} maxLength={8} />
                  </Field>
                </div>
              </div>

              <div className="panel" style={{ marginTop: '1rem' }}>
                <div className="panel__head">
                  <h2 className="panel__title">Opening hours</h2>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => setHours([...hours, { day: 'Monday', open: '12:00', close: '23:00' }])}
                  >
                    Add row
                  </button>
                </div>
                <div style={{ display: 'grid', gap: '0.4rem' }}>
                  {hours.map((row, index) => (
                    <div key={index} style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.8fr 0.8fr auto', gap: '0.3rem' }}>
                      <input
                        value={row.day}
                        aria-label={`Day ${index + 1}`}
                        onChange={(event) => {
                          const next = [...hours];
                          next[index] = { ...row, day: event.target.value };
                          setHours(next);
                        }}
                      />
                      <input
                        value={row.open}
                        aria-label={`Opening time ${index + 1}`}
                        onChange={(event) => {
                          const next = [...hours];
                          next[index] = { ...row, open: event.target.value };
                          setHours(next);
                        }}
                      />
                      <input
                        value={row.close}
                        aria-label={`Closing time ${index + 1}`}
                        onChange={(event) => {
                          const next = [...hours];
                          next[index] = { ...row, close: event.target.value };
                          setHours(next);
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn--quiet"
                        aria-label={`Remove row ${index + 1}`}
                        onClick={() => setHours(hours.filter((_, position) => position !== index))}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                {hours.length === 0 ? <p className="note">No hours set — add at least one row.</p> : null}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button type="submit" className="btn btn--gold" disabled={saving}>
              {saving ? <span className="spinner" /> : null}
              Save settings
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => void reload()}>
              Reset
            </button>
          </div>
        </form>
      )}
    </AdminPage>
  );
}

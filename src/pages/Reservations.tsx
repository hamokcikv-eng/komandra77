import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { usePageMeta } from '../lib/seo';
import { useSettings } from '../store/SettingsContext';
import { useUI } from '../store/UIContext';
import { ArrowUpRight, Check, Clock, MapPin, Whatsapp } from '../components/Icons';
import { Reveal } from '../components/ui';

const TIMES = Array.from({ length: 24 }, (_, index) => {
  const hour = 12 + Math.floor(index / 2);
  const minutes = index % 2 === 0 ? '00' : '30';
  const normalised = `${String(hour % 24).padStart(2, '0')}:${minutes}`;
  return normalised;
});

export function ReservationsPage() {
  usePageMeta('Reservations', 'Reserve a table at KOMANDRA in Riyadh — late kitchen, walk-ins welcome, tables held for fifteen minutes.');
  const { settings } = useSettings();
  const { notify } = useUI();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    partySize: 2,
    date: today,
    time: '20:00',
    notes: '',
  });
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [confirmed, setConfirmed] = useState<{ id: number; whatsappUrl: string } | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSending(true);
    setError('');
    try {
      const data = await api<{ reservation: { id: number }; whatsappUrl: string }>('/reservations', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setConfirmed({ id: data.reservation.id, whatsappUrl: data.whatsappUrl });
      notify('Reservation received — we will confirm shortly.', 'success');
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Could not save your reservation.');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <div className="shell">
          <span className="eyebrow">Reservations</span>
          <h1 className="display page-head__title">
            Take a <em>seat.</em>
          </h1>
          <p className="lede" style={{ marginTop: '1.2rem' }}>
            The counter is built for walk-ins, but the room is better with a table waiting. Reserve below and the team will
            confirm on WhatsApp.
          </p>
        </div>
      </div>

      <section className="section section--tight" style={{ paddingTop: 0 }}>
        <div className="shell">
          <div className="contact-grid">
            <Reveal>
              <div className="panel">
                <span className="eyebrow">The room</span>
                <p className="lede" style={{ marginTop: '0.8rem', fontSize: '0.92rem' }}>
                  Dark timber, low light and a kitchen you can watch. Tables are held for fifteen minutes after the reserved
                  time — message us if you are running late.
                </p>
                <div style={{ display: 'grid', gap: '0.6rem', marginTop: '1.2rem' }}>
                  {settings.hours.map((row) => (
                    <span key={row.day} className="hours-row">
                      <span>
                        <Clock size={12} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />
                        {row.day}
                      </span>
                      <span>
                        {row.open} — {row.close}
                      </span>
                    </span>
                  ))}
                </div>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(settings.mapQuery || settings.address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="link-arrow"
                  style={{ marginTop: '1.2rem' }}
                >
                  <MapPin size={14} /> {settings.address}
                </a>
                <p className="form-note" style={{ marginTop: '1.2rem' }}>
                  Groups over ten? <Link to="/contact" className="gold">Send us a note</Link> and we will build the table
                  around you.
                </p>
              </div>
            </Reveal>

            <Reveal delay={70}>
              <div className="panel" style={{ padding: 'clamp(1.2rem, 3vw, 2rem)' }}>
                {confirmed ? (
                  <div className="empty" style={{ padding: '2.4rem 0' }}>
                    <span className="empty__icon">
                      <Check size={20} />
                    </span>
                    <h3>Table requested</h3>
                    <p>
                      Reference #{String(confirmed.id).padStart(4, '0')} · {form.partySize} guests on {form.date} at{' '}
                      {form.time}. We will confirm by phone or WhatsApp.
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                      {confirmed.whatsappUrl ? (
                        <a href={confirmed.whatsappUrl} target="_blank" rel="noreferrer" className="btn btn--gold btn--sm">
                          <Whatsapp size={14} /> Confirm on WhatsApp
                        </a>
                      ) : null}
                      <Link to="/menu" className="btn btn--ghost btn--sm">
                        Browse the menu
                      </Link>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={submit} noValidate>
                    <span className="eyebrow">Request a table</span>
                    <h2 className="h3" style={{ marginTop: '0.6rem', marginBottom: '1.2rem' }}>
                      Tell us when you are coming
                    </h2>
                    {error ? (
                      <div className="form-error" role="alert">
                        {error}
                      </div>
                    ) : null}
                    <div className="field-row field-row--2">
                      <div className="field">
                        <label htmlFor="res-name">Name</label>
                        <input
                          id="res-name"
                          value={form.name}
                          onChange={(event) => setForm({ ...form, name: event.target.value })}
                          required
                          autoComplete="name"
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="res-phone">Phone</label>
                        <input
                          id="res-phone"
                          value={form.phone}
                          onChange={(event) => setForm({ ...form, phone: event.target.value })}
                          required
                          autoComplete="tel"
                          placeholder="+966 5X XXX XXXX"
                        />
                      </div>
                    </div>
                    <div className="field">
                      <label htmlFor="res-email">Email (optional)</label>
                      <input
                        id="res-email"
                        type="email"
                        value={form.email}
                        onChange={(event) => setForm({ ...form, email: event.target.value })}
                        autoComplete="email"
                      />
                    </div>
                    <div className="field-row field-row--2">
                      <div className="field">
                        <label htmlFor="res-date">Date</label>
                        <input
                          id="res-date"
                          type="date"
                          min={today}
                          value={form.date}
                          onChange={(event) => setForm({ ...form, date: event.target.value })}
                          required
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="res-time">Time</label>
                        <select
                          id="res-time"
                          value={form.time}
                          onChange={(event) => setForm({ ...form, time: event.target.value })}
                          required
                        >
                          {TIMES.map((time) => (
                            <option value={time} key={time}>
                              {time}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="field">
                      <label htmlFor="res-party">Guests</label>
                      <select
                        id="res-party"
                        value={form.partySize}
                        onChange={(event) => setForm({ ...form, partySize: Number(event.target.value) })}
                      >
                        {Array.from({ length: 12 }, (_, index) => index + 1).map((size) => (
                          <option value={size} key={size}>
                            {size} {size === 1 ? 'guest' : 'guests'}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="res-notes">Notes (optional)</label>
                      <textarea
                        id="res-notes"
                        value={form.notes}
                        onChange={(event) => setForm({ ...form, notes: event.target.value })}
                        placeholder="Window table, birthday, allergies…"
                      />
                    </div>
                    <button type="submit" className="btn btn--gold btn--block btn--lg" disabled={sending}>
                      {sending ? <span className="spinner" /> : null}
                      {sending ? 'Sending request' : 'Request table'}
                      {!sending ? <ArrowUpRight size={16} className="btn__arrow" /> : null}
                    </button>
                  </form>
                )}
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}

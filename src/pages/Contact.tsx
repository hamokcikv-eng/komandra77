import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { usePageMeta } from '../lib/seo';
import { useSettings } from '../store/SettingsContext';
import { useUI } from '../store/UIContext';
import { ArrowUpRight, Check, Clock, Mail, MapPin, PhoneIcon, Whatsapp } from '../components/Icons';
import { Reveal } from '../components/ui';

export function ContactPage() {
  usePageMeta('Contact', 'Talk to KOMANDRA — catering, collaborations, delivery questions or a table reservation. Riyadh, KAFD.');
  const { settings } = useSettings();
  const { openContact, notify } = useUI();
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' });
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSending(true);
    setError('');
    try {
      await api('/contact', { method: 'POST', body: JSON.stringify(form) });
      setSent(true);
      setForm({ name: '', phone: '', email: '', message: '' });
      notify('Message sent — the team will reply shortly.', 'success');
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Could not send your message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <div className="shell">
          <span className="eyebrow">Contact</span>
          <h1 className="display page-head__title">
            Let&apos;s Make Your Next Meal <em>Special.</em>
          </h1>
          <p className="lede" style={{ marginTop: '1.2rem' }}>
            Catering, large orders, press or a simple question about an allergen — the same team answers all of it. Expect a
            reply within one working day.
          </p>
        </div>
      </div>

      <section className="section section--tight" style={{ paddingTop: 0 }}>
        <div className="shell">
          <div className="contact-grid">
            <Reveal>
              <div className="contact-list">
                <a className="contact-item" href={`tel:${settings.phone.replace(/\s/g, '')}`}>
                  <span className="contact-item__icon">
                    <PhoneIcon size={16} />
                  </span>
                  <span>
                    <span className="contact-item__label">Call the counter</span>
                    <span className="contact-item__value">{settings.phone}</span>
                  </span>
                </a>
                <a
                  className="contact-item"
                  href={`https://wa.me/${settings.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="contact-item__icon">
                    <Whatsapp size={16} />
                  </span>
                  <span>
                    <span className="contact-item__label">WhatsApp</span>
                    <span className="contact-item__value">Fastest for live orders</span>
                  </span>
                </a>
                <a className="contact-item" href={`mailto:${settings.email}`}>
                  <span className="contact-item__icon">
                    <Mail size={16} />
                  </span>
                  <span>
                    <span className="contact-item__label">Email</span>
                    <span className="contact-item__value">{settings.email}</span>
                  </span>
                </a>
                <a
                  className="contact-item"
                  href={`https://maps.google.com/?q=${encodeURIComponent(settings.mapQuery || settings.address)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="contact-item__icon">
                    <MapPin size={16} />
                  </span>
                  <span>
                    <span className="contact-item__label">Find us</span>
                    <span className="contact-item__value">
                      {settings.address}
                      <br />
                      {settings.city}
                    </span>
                  </span>
                </a>
                <div className="contact-item" style={{ borderBottom: 0 }}>
                  <span className="contact-item__icon">
                    <Clock size={16} />
                  </span>
                  <span style={{ width: '100%' }}>
                    <span className="contact-item__label">Opening hours</span>
                    <span className="contact-item__value" style={{ display: 'grid', gap: '0.2rem', marginTop: '0.4rem' }}>
                      {settings.hours.map((row) => (
                        <span className="hours-row" key={row.day}>
                          <span>{row.day}</span>
                          <span>
                            {row.open} — {row.close}
                          </span>
                        </span>
                      ))}
                    </span>
                  </span>
                </div>
              </div>

              <div className="panel" style={{ marginTop: '1.2rem' }}>
                <h3 className="h3" style={{ fontSize: '1rem' }}>
                  Need it handled now?
                </h3>
                <p className="form-note" style={{ marginTop: '0.4rem' }}>
                  Open the quick message dialog for a shorter form, or book a table directly.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.8rem' }}>
                  <button type="button" className="btn btn--gold btn--sm" onClick={openContact}>
                    Quick message
                  </button>
                  <Link to="/reservations" className="btn btn--ghost btn--sm">
                    Reserve a table
                  </Link>
                </div>
              </div>
            </Reveal>

            <Reveal delay={80}>
              <div className="panel" style={{ padding: 'clamp(1.2rem, 3vw, 2rem)' }}>
                <span className="eyebrow">Send a message</span>
                <h2 className="h3" style={{ marginTop: '0.6rem', marginBottom: '1.2rem' }}>
                  Tell us what you have in mind
                </h2>

                {sent ? (
                  <div className="empty" style={{ padding: '2rem 0' }}>
                    <span className="empty__icon">
                      <Check size={20} />
                    </span>
                    <h3>Message received</h3>
                    <p>Thank you — a member of the team will get back to you shortly.</p>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => setSent(false)}>
                      Send another
                    </button>
                  </div>
                ) : (
                  <form onSubmit={submit} noValidate>
                    {error ? (
                      <div className="form-error" role="alert">
                        {error}
                      </div>
                    ) : null}
                    <div className="field">
                      <label htmlFor="name">Name</label>
                      <input
                        id="name"
                        value={form.name}
                        onChange={(event) => setForm({ ...form, name: event.target.value })}
                        autoComplete="name"
                        required
                        minLength={2}
                      />
                    </div>
                    <div className="field-row field-row--2">
                      <div className="field">
                        <label htmlFor="phone">Phone</label>
                        <input
                          id="phone"
                          value={form.phone}
                          onChange={(event) => setForm({ ...form, phone: event.target.value })}
                          autoComplete="tel"
                          placeholder="+966 5X XXX XXXX"
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="email">Email</label>
                        <input
                          id="email"
                          type="email"
                          value={form.email}
                          onChange={(event) => setForm({ ...form, email: event.target.value })}
                          autoComplete="email"
                          required
                        />
                      </div>
                    </div>
                    <div className="field">
                      <label htmlFor="message">Message</label>
                      <textarea
                        id="message"
                        value={form.message}
                        onChange={(event) => setForm({ ...form, message: event.target.value })}
                        required
                        minLength={10}
                        placeholder="Catering for 40, a birthday table, an allergy question…"
                      />
                    </div>
                    <button type="submit" className="btn btn--gold btn--block btn--lg" disabled={sending}>
                      {sending ? <span className="spinner" /> : null}
                      {sending ? 'Sending' : 'Send Message'}
                      {!sending ? <ArrowUpRight size={16} className="btn__arrow" /> : null}
                    </button>
                    <p className="form-note" style={{ marginTop: '0.8rem' }}>
                      Your details are stored only to answer your enquiry. See our <Link to="/privacy">privacy policy</Link>.
                    </p>
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

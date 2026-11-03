import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { useUI } from '../store/UIContext';
import { useSettings } from '../store/SettingsContext';
import { ArrowRight, Check, Close } from './Icons';

export function ContactModal() {
  const { contactOpen, closeContact, notify } = useUI();
  const { settings } = useSettings();
  const [state, setState] = useState({ name: '', phone: '', email: '', message: '' });
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const firstField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!contactOpen) return;
    setError('');
    setSent(false);
    const timer = window.setTimeout(() => firstField.current?.focus(), 120);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeContact();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [contactOpen, closeContact]);

  if (!contactOpen) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSending(true);
    setError('');
    try {
      await api('/contact', { method: 'POST', body: JSON.stringify(state) });
      setSent(true);
      notify('Message sent — we will reply shortly.', 'success');
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Could not send your message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={closeContact} role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="icon-btn modal__close" onClick={closeContact} aria-label="Close contact form">
          <Close size={16} />
        </button>
        <span className="eyebrow">Let&apos;s talk</span>
        <h2 className="modal__title" id="contact-title">
          Let&apos;s Make Your Next Meal <em>Special.</em>
        </h2>
        <p className="modal__sub">
          Catering, collaborations or a table for twenty — tell us what you need and the team will reply within one working
          day.
        </p>

        {sent ? (
          <div className="empty" style={{ padding: '1.4rem 0' }}>
            <span className="empty__icon">
              <Check size={20} />
            </span>
            <h3>Message received</h3>
            <p>Thank you — we have your message and will be in touch shortly.</p>
            <button type="button" className="btn btn--ghost btn--sm" onClick={closeContact}>
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            {error ? <div className="form-error" role="alert">{error}</div> : null}
            <div className="field">
              <label htmlFor="contact-name">Name</label>
              <input
                id="contact-name"
                ref={firstField}
                value={state.name}
                onChange={(event) => setState({ ...state, name: event.target.value })}
                required
                autoComplete="name"
                placeholder="Your name"
              />
            </div>
            <div className="field-row field-row--2">
              <div className="field">
                <label htmlFor="contact-phone">Phone number</label>
                <input
                  id="contact-phone"
                  value={state.phone}
                  onChange={(event) => setState({ ...state, phone: event.target.value })}
                  autoComplete="tel"
                  placeholder="+966 5X XXX XXXX"
                />
              </div>
              <div className="field">
                <label htmlFor="contact-email">Email</label>
                <input
                  id="contact-email"
                  type="email"
                  value={state.email}
                  onChange={(event) => setState({ ...state, email: event.target.value })}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="contact-message">Message</label>
              <textarea
                id="contact-message"
                value={state.message}
                onChange={(event) => setState({ ...state, message: event.target.value })}
                required
                minLength={10}
                placeholder="Tell us what you have in mind…"
              />
            </div>
            <button type="submit" className="btn btn--gold btn--block btn--lg" disabled={sending}>
              {sending ? <span className="spinner" /> : null}
              {sending ? 'Sending' : 'Send Message'}
              {!sending ? <ArrowRight size={16} className="btn__arrow" /> : null}
            </button>
            <p className="form-note" style={{ marginTop: '0.8rem' }}>
              Prefer WhatsApp? Message us on{' '}
              <a className="gold" href={`https://wa.me/${settings.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer">
                {settings.phone}
              </a>
              .
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

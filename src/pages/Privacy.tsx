import { Link } from 'react-router-dom';
import { usePageMeta } from '../lib/seo';
import { useSettings } from '../store/SettingsContext';

const SECTIONS = [
  {
    title: 'What we collect',
    body: 'When you order we store the name, phone number, optional email address and — for delivery — the address you give us. If you create an account we also store a salted, hashed password. We never see or store raw card numbers.',
  },
  {
    title: 'How we use it',
    body: 'Your details are used to prepare, cook and deliver your order, to answer support messages, and to keep an accurate sales record. Aggregate, non-identifying figures are used for kitchen planning.',
  },
  {
    title: 'Card payments',
    body: 'When card payment is enabled, you are redirected to our payment provider’s hosted checkout. KOMANDRA receives only a payment status and a reference. Card numbers, CVCs and expiry dates never reach our servers.',
  },
  {
    title: 'Messages and reservations',
    body: 'Contact form messages and table reservations are stored so the team can respond and plan service. They are visible only to restaurant staff.',
  },
  {
    title: 'Retention',
    body: 'Order records are retained for accounting and dispute resolution. You can ask us to delete your account details at any time; order history required for tax purposes may be retained in anonymised form.',
  },
  {
    title: 'Cookies and local storage',
    body: 'We use one essential session cookie to keep you signed in, and browser local storage to remember your basket on this device. No advertising or tracking cookies are set.',
  },
  {
    title: 'Your choices',
    body: 'You can update your name, phone and addresses from your account, delete saved addresses, and request deletion of your account by contacting us. We will confirm any request within one working day.',
  },
];

export function PrivacyPage() {
  usePageMeta('Privacy Policy', 'How KOMANDRA collects, uses and protects your information.');
  const { settings } = useSettings();

  return (
    <>
      <div className="page-head">
        <div className="shell">
          <span className="eyebrow">Legal</span>
          <h1 className="display page-head__title" style={{ fontSize: 'clamp(2.2rem, 5.5vw, 4rem)' }}>
            Privacy, <em>plainly.</em>
          </h1>
          <p className="lede" style={{ marginTop: '1rem' }}>
            Short version: we collect what we need to cook and deliver your order, we do not sell it, and we never touch your
            card details.
          </p>
        </div>
      </div>

      <section className="section section--tight" style={{ paddingTop: 0 }}>
        <div className="shell" style={{ maxWidth: '860px' }}>
          <div className="panel">
            {SECTIONS.map((section) => (
              <div key={section.title} style={{ paddingBottom: '1.2rem', marginBottom: '1.2rem', borderBottom: '1px solid var(--line)' }}>
                <h2 className="h3" style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                  {section.title}
                </h2>
                <p className="muted" style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.7 }}>
                  {section.body}
                </p>
              </div>
            ))}
            <p className="form-note">
              Questions about your data? Email{' '}
              <a className="gold" href={`mailto:${settings.email}`}>
                {settings.email}
              </a>{' '}
              or call {settings.phone}. Last updated {new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}.
            </p>
            <Link to="/contact" className="link-arrow" style={{ marginTop: '1rem' }}>
              Contact the team
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

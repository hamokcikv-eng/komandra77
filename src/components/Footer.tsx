import { Link } from 'react-router-dom';
import { useSettings } from '../store/SettingsContext';
import { ArrowUpRight, Instagram, Mail, MapPin, PhoneIcon, TikTok, XIcon } from './Icons';

export function Footer() {
  const { settings } = useSettings();
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="shell">
        <div className="footer__grid">
          <div>
            <div className="footer__brand">KOMANDRA</div>
            <p className="footer__slogan">{settings.slogan}</p>
            <p className="footer__ar" lang="ar" dir="rtl">
              {settings.sloganAr}
            </p>
            <div className="footer__socials">
              <a href={settings.instagram} target="_blank" rel="noreferrer noopener" aria-label="KOMANDRA on Instagram">
                <Instagram size={16} />
              </a>
              <a href={settings.tiktok} target="_blank" rel="noreferrer noopener" aria-label="KOMANDRA on TikTok">
                <TikTok size={16} />
              </a>
              <a href={settings.x} target="_blank" rel="noreferrer noopener" aria-label="KOMANDRA on X">
                <XIcon size={16} />
              </a>
              <a
                href={`https://wa.me/${settings.whatsapp.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noreferrer noopener"
                aria-label="Chat on WhatsApp"
              >
                <ArrowUpRight size={16} />
              </a>
            </div>
          </div>

          <nav className="footer__col" aria-label="Footer">
            <h4>Explore</h4>
            <Link to="/">Home</Link>
            <Link to="/menu">Menu</Link>
            <Link to="/offers">Offers</Link>
            <Link to="/story">About</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/privacy">Privacy Policy</Link>
          </nav>

          <div className="footer__col">
            <h4>Visit</h4>
            <p>{settings.address}</p>
            <p>{settings.city}</p>
            <a href={`tel:${settings.phone.replace(/\s/g, '')}`}>{settings.phone}</a>
            <a href={`mailto:${settings.email}`}>{settings.email}</a>
          </div>

          <div className="footer__col">
            <h4>Opening Hours</h4>
            {settings.hours.map((row) => (
              <p key={row.day}>
                {row.day} · {row.open} — {row.close}
              </p>
            ))}
            <h4 style={{ marginTop: '1.1rem' }}>Ordering</h4>
            <Link to="/menu">Delivery &amp; pickup</Link>
            <Link to="/reservations">Reserve a table</Link>
          </div>
        </div>

        <div className="footer__giant" aria-hidden="true">
          KOMANDRA
        </div>

        <div className="footer__bottom">
          <span>© {year} KOMANDRA. All rights reserved.</span>
          <span className="footer__contact-inline">Taste The Komandra Experience.</span>
          <span>
            <Link to="/privacy">Privacy</Link> · <Link to="/contact">Contact</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}

export const FOOTER_ICONS = { Mail, MapPin, PhoneIcon };

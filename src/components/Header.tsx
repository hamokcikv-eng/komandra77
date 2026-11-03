import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../store/CartContext';
import { useAuth } from '../store/AuthContext';
import { useSettings } from '../store/SettingsContext';
import { ArrowUpRight, Cart, Close, MenuIcon, UserIcon } from './Icons';
import { Magnetic } from './ui';

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/menu', label: 'Menu' },
  { to: '/offers', label: 'Offers' },
  { to: '/story', label: 'Our Story' },
  { to: '/contact', label: 'Contact' },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const cart = useCart();
  const { user } = useAuth();
  const { settings } = useSettings();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  const isActive = (to: string) => (to === '/' ? location.pathname === '/' : location.pathname.startsWith(to));

  return (
    <>
      <header className={`header ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="shell">
          <div className="header__inner">
            <Link to="/" className="brand" aria-label="KOMANDRA home">
              <span className="brand__mark" aria-hidden="true" />
              KOMANDRA
            </Link>

            <nav className="nav__links" aria-label="Primary">
              {LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`nav__link ${isActive(link.to) ? 'is-active' : ''}`}
                  aria-current={isActive(link.to) ? 'page' : undefined}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="header__actions">
              <Link to="/account" className="icon-btn" aria-label={user ? `Account — ${user.name}` : 'Sign in'}>
                <UserIcon size={17} />
              </Link>
              <button type="button" className="icon-btn" onClick={cart.openCart} aria-label={`Open cart, ${cart.count} items`}>
                <Cart size={17} />
                {cart.count > 0 ? <span className="cart-btn__badge">{cart.count > 9 ? '9+' : cart.count}</span> : null}
              </button>
              <Magnetic>
                <Link to="/menu" className="btn btn--gold btn--sm header__cta">
                  Order Now <ArrowUpRight size={15} className="btn__arrow" />
                </Link>
              </Magnetic>
              <button
                type="button"
                className="icon-btn burger-btn"
                onClick={() => setMenuOpen(true)}
                aria-label="Open menu"
                aria-expanded={menuOpen}
              >
                <MenuIcon size={18} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {menuOpen ? (
        <div className="mobile-menu" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="mobile-menu__top">
            <Link to="/" className="brand" onClick={() => setMenuOpen(false)}>
              <span className="brand__mark" aria-hidden="true" />
              KOMANDRA
            </Link>
            <button type="button" className="icon-btn" onClick={() => setMenuOpen(false)} aria-label="Close menu" autoFocus>
              <Close size={18} />
            </button>
          </div>

          <div className="mobile-menu__links">
            {LINKS.map((link, index) => (
              <Link key={link.to} to={link.to} onClick={() => setMenuOpen(false)}>
                {link.label}
                <span>0{index + 1}</span>
              </Link>
            ))}
            <Link to="/account" onClick={() => setMenuOpen(false)}>
              {user ? 'My account' : 'Sign in'}
              <span>0{LINKS.length + 1}</span>
            </Link>
          </div>

          <div className="mobile-menu__foot">
            <Link to="/menu" className="btn btn--gold btn--block btn--lg" onClick={() => setMenuOpen(false)}>
              Order Now <ArrowUpRight size={16} className="btn__arrow" />
            </Link>
            <div className="mobile-menu__contact">
              <a href={`tel:${settings.phone.replace(/\s/g, '')}`}>{settings.phone}</a>
              <a href={`mailto:${settings.email}`}>{settings.email}</a>
              <span>{settings.address}</span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

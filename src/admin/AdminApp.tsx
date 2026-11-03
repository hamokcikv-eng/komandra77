import { useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { ApiError } from '../lib/api';
import { usePageMeta } from '../lib/seo';
import { useAuth } from '../store/AuthContext';
import { useUI } from '../store/UIContext';
import { ArrowUpRight, Layout, Logout } from '../components/Icons';
import { Spinner } from '../components/ui';
import { AdminDashboard } from './AdminDashboard';
import { AdminProducts } from './AdminProducts';
import { AdminOrders } from './AdminOrders';
import { AdminOffers, AdminCoupons } from './AdminMarketing';
import { AdminInventory, AdminReservations, AdminMessages, AdminSettings } from './AdminOps';

const NAV = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/orders', label: 'Orders' },
  { to: '/admin/products', label: 'Menu & stock' },
  { to: '/admin/offers', label: 'Offers' },
  { to: '/admin/coupons', label: 'Promo codes' },
  { to: '/admin/inventory', label: 'Inventory' },
  { to: '/admin/reservations', label: 'Reservations' },
  { to: '/admin/messages', label: 'Messages' },
  { to: '/admin/settings', label: 'Settings' },
];

function AdminGate() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const user = await login(form.email, form.password);
      if (user.role !== 'admin') {
        setError('This account does not have administrator access.');
      }
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Sign in failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin" style={{ display: 'grid', placeItems: 'center', minHeight: '100svh', padding: '1.2rem' }}>
      <div style={{ width: 'min(420px, 100%)' }}>
        <div className="brand" style={{ paddingLeft: 0, marginBottom: '1.4rem' }}>
          <span className="brand__mark" aria-hidden="true" />
          KOMANDRA
          <span style={{ letterSpacing: '0.1em', color: 'var(--muted)', fontSize: '0.7rem' }}>ADMIN</span>
        </div>
        <div className="panel">
          <h1 className="admin-title" style={{ fontSize: '1.5rem' }}>
            Staff sign in
          </h1>
          <p className="admin-sub">Restaurant operations only.</p>
          <form onSubmit={submit} style={{ marginTop: '1.2rem' }}>
            {error ? (
              <div className="form-error" role="alert">
                {error}
              </div>
            ) : null}
            <div className="field">
              <label htmlFor="admin-email">Email</label>
              <input
                id="admin-email"
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                required
                autoComplete="username"
              />
            </div>
            <div className="field">
              <label htmlFor="admin-password">Password</label>
              <input
                id="admin-password"
                type="password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                required
                autoComplete="current-password"
              />
            </div>
            <button type="submit" className="btn btn--gold btn--block btn--lg" disabled={busy}>
              {busy ? <span className="spinner" /> : null}
              {busy ? 'Signing in' : 'Enter dashboard'}
            </button>
          </form>
        </div>
        <p className="form-note" style={{ marginTop: '1rem' }}>
          <Link to="/" className="gold">
            Back to the restaurant
          </Link>
        </p>
      </div>
    </div>
  );
}

export function AdminApp() {
  usePageMeta('Admin', 'KOMANDRA restaurant operations.');
  const { user, loading, logout } = useAuth();
  const { notify } = useUI();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="admin" style={{ display: 'grid', placeItems: 'center', minHeight: '100svh' }}>
        <Spinner label="Loading dashboard" />
      </div>
    );
  }

  if (!user) return <AdminGate />;

  if (user.role !== 'admin') {
    return (
      <div className="admin" style={{ display: 'grid', placeItems: 'center', minHeight: '100svh', padding: '1.2rem' }}>
        <div className="panel" style={{ maxWidth: '420px', textAlign: 'center' }}>
          <h1 className="admin-title">Administrator access required</h1>
          <p className="admin-sub">You are signed in as {user.email}, which is a customer account.</p>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1rem' }}>
            <Link to="/" className="btn btn--ghost btn--sm">
              Back to site
            </Link>
            <button
              type="button"
              className="btn btn--gold btn--sm"
              onClick={async () => {
                await logout();
                notify('Signed out.', 'info');
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin">
      <aside className="admin__side">
        <div className="admin__brand">
          <div className="brand" style={{ paddingLeft: 0 }}>
            <span className="brand__mark" aria-hidden="true" />
            KOMANDRA
          </div>
          <span className="admin-sub" style={{ fontSize: '0.66rem', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
            Operations
          </span>
        </div>
        <nav className="admin__nav" aria-label="Admin">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `admin__link ${isActive ? 'is-active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="admin__side-foot">
          <Link to="/" className="admin__link" style={{ padding: 0 }}>
            <span style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
              View site <ArrowUpRight size={13} />
            </span>
          </Link>
          <span style={{ fontSize: '0.72rem' }}>{user.email}</span>
          <button
            type="button"
            className="admin__link"
            style={{ padding: 0, textAlign: 'left' }}
            onClick={async () => {
              await logout();
              navigate('/admin');
            }}
          >
            <span style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
              <Logout size={13} /> Sign out
            </span>
          </button>
        </div>
      </aside>

      <div className="admin__main">
        <div className="admin-mobile-nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? 'is-active' : '')}
            >
              {item.label}
            </NavLink>
          ))}
        </div>
        <Routes>
          <Route index element={<AdminDashboard />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="offers" element={<AdminOffers />} />
          <Route path="coupons" element={<AdminCoupons />} />
          <Route path="inventory" element={<AdminInventory />} />
          <Route path="reservations" element={<AdminReservations />} />
          <Route path="messages" element={<AdminMessages />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export const ADMIN_ICON = Layout;

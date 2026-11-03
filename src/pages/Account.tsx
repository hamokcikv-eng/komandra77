import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api, ApiError, getMyOrders, type Order } from '../lib/api';
import { formatDate, formatMoney, statusLabel, statusTone } from '../lib/format';
import { usePageMeta } from '../lib/seo';
import { useAuth } from '../store/AuthContext';
import { useSettings } from '../store/SettingsContext';
import { useUI } from '../store/UIContext';
import { ArrowUpRight, Check, Logout, Trash } from '../components/Icons';
import { EmptyState, Spinner } from '../components/ui';

type Tab = 'orders' | 'addresses' | 'profile';

export function AccountPage() {
  usePageMeta('Account', 'Sign in to KOMANDRA to track orders, save delivery addresses and reorder faster.');
  const auth = useAuth();
  const { settings } = useSettings();
  const { notify } = useUI();
  const navigate = useNavigate();
  const location = useLocation();
  const redirect = new URLSearchParams(location.search).get('redirect');

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [busy, setBusy] = useState(false);

  const [tab, setTab] = useState<Tab>('orders');
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [ordersError, setOrdersError] = useState('');
  const [addressForm, setAddressForm] = useState({ label: 'Home', line1: '', line2: '', city: '', notes: '', isDefault: false });
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressError, setAddressError] = useState('');
  const [profile, setProfile] = useState({ name: '', phone: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    if (!auth.user) return;
    setProfile({ name: auth.user.name, phone: auth.user.phone ?? '' });
  }, [auth.user]);

  const loadOrders = useCallback(async () => {
    setOrdersError('');
    try {
      const data = await getMyOrders();
      setOrders(data.orders);
    } catch {
      setOrdersError('Could not load your orders.');
    }
  }, []);

  useEffect(() => {
    if (auth.user && tab === 'orders') void loadOrders();
  }, [auth.user, tab, loadOrders]);

  const submitAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setAuthError('');
    try {
      if (mode === 'login') {
        await auth.login(authForm.email, authForm.password);
        notify('Welcome back.', 'success');
      } else {
        await auth.register({
          name: authForm.name,
          email: authForm.email,
          password: authForm.password,
          phone: authForm.phone || undefined,
        });
        notify('Account created — welcome to KOMANDRA.', 'success');
      }
      if (redirect) navigate(redirect);
    } catch (issue) {
      setAuthError(issue instanceof ApiError ? issue.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const submitAddress = async (event: React.FormEvent) => {
    event.preventDefault();
    setAddressError('');
    try {
      await auth.addAddress({
        label: addressForm.label,
        line1: addressForm.line1,
        line2: addressForm.line2 || null,
        city: addressForm.city,
        notes: addressForm.notes || null,
        isDefault: addressForm.isDefault,
      });
      setAddressForm({ label: 'Home', line1: '', line2: '', city: '', notes: '', isDefault: false });
      setShowAddressForm(false);
      notify('Address saved.', 'success');
    } catch (issue) {
      setAddressError(issue instanceof ApiError ? issue.message : 'Could not save the address.');
    }
  };

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setProfileError('');
    setProfileMessage('');
    try {
      await auth.updateProfile(profile);
      setProfileMessage('Profile updated.');
      notify('Profile updated.', 'success');
    } catch (issue) {
      setProfileError(issue instanceof ApiError ? issue.message : 'Could not update your profile.');
    }
  };

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setProfileError('');
    setProfileMessage('');
    try {
      await api('/auth/password', { method: 'POST', body: JSON.stringify(passwordForm) });
      setPasswordForm({ currentPassword: '', newPassword: '' });
      setProfileMessage('Password changed.');
      notify('Password changed.', 'success');
    } catch (issue) {
      setProfileError(issue instanceof ApiError ? issue.message : 'Could not change your password.');
    }
  };

  if (auth.loading) {
    return (
      <div className="shell">
        <Spinner label="Checking your session" />
      </div>
    );
  }

  if (!auth.user) {
    return (
      <div className="shell">
        <div className="auth-wrap">
          <span className="eyebrow">Account</span>
          <h1 className="display" style={{ fontSize: 'clamp(2.2rem, 6vw, 3.6rem)', marginTop: '0.8rem' }}>
            Your <em>table.</em>
          </h1>
          <p className="lede" style={{ marginTop: '0.9rem', fontSize: '0.92rem' }}>
            Sign in to save addresses, track orders and reorder in two taps. Guest checkout is always available.
          </p>

          <div className="account-tabs" style={{ marginTop: '1.4rem' }}>
            <button type="button" className={mode === 'login' ? 'is-active' : ''} onClick={() => setMode('login')}>
              Sign in
            </button>
            <button type="button" className={mode === 'register' ? 'is-active' : ''} onClick={() => setMode('register')}>
              Create account
            </button>
          </div>

          <div className="panel">
            {authError ? (
              <div className="form-error" role="alert">
                {authError}
              </div>
            ) : null}
            <form onSubmit={submitAuth}>
              {mode === 'register' ? (
                <>
                  <div className="field">
                    <label htmlFor="acc-name">Name</label>
                    <input
                      id="acc-name"
                      value={authForm.name}
                      onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })}
                      required
                      autoComplete="name"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="acc-phone">Phone (optional)</label>
                    <input
                      id="acc-phone"
                      value={authForm.phone}
                      onChange={(event) => setAuthForm({ ...authForm, phone: event.target.value })}
                      autoComplete="tel"
                    />
                  </div>
                </>
              ) : null}
              <div className="field">
                <label htmlFor="acc-email">Email</label>
                <input
                  id="acc-email"
                  type="email"
                  value={authForm.email}
                  onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="field">
                <label htmlFor="acc-password">Password</label>
                <input
                  id="acc-password"
                  type="password"
                  value={authForm.password}
                  onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
                  required
                  minLength={8}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                {mode === 'register' ? <p className="field__hint">At least 8 characters, including a number.</p> : null}
              </div>
              <button type="submit" className="btn btn--gold btn--block btn--lg" disabled={busy}>
                {busy ? <span className="spinner" /> : null}
                {busy ? 'Please wait' : mode === 'login' ? 'Sign in' : 'Create account'}
              </button>
            </form>
          </div>
          <p className="form-note" style={{ marginTop: '0.8rem', textAlign: 'center' }}>
            Or <Link to="/menu" className="gold">keep browsing the menu</Link>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="shell">
      <div className="account">
        <aside>
          <div className="panel">
            <span className="eyebrow">Signed in</span>
            <h1 className="h3" style={{ marginTop: '0.6rem' }}>
              {auth.user.name}
            </h1>
            <p className="muted" style={{ fontSize: '0.82rem', marginTop: '0.2rem' }}>
              {auth.user.email}
            </p>
            <div className="meta-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: '1rem', borderTop: 0, paddingTop: 0 }}>
              <div>
                <span>Orders</span>
                <strong>{auth.stats.orders}</strong>
              </div>
              <div>
                <span>Lifetime</span>
                <strong>{formatMoney(auth.stats.spentCents, settings.currency)}</strong>
              </div>
            </div>
            <div style={{ display: 'grid', gap: '0.5rem', marginTop: '1.2rem' }}>
              {auth.user.role === 'admin' ? (
                <Link to="/admin" className="btn btn--ghost btn--sm btn--block">
                  Admin dashboard <ArrowUpRight size={14} />
                </Link>
              ) : null}
              <button
                type="button"
                className="btn btn--quiet btn--block"
                onClick={async () => {
                  await auth.logout();
                  notify('Signed out.', 'info');
                  navigate('/');
                }}
              >
                <Logout size={14} /> Sign out
              </button>
            </div>
          </div>
        </aside>

        <div>
          <div className="account-tabs">
            <button type="button" className={tab === 'orders' ? 'is-active' : ''} onClick={() => setTab('orders')}>
              Orders
            </button>
            <button type="button" className={tab === 'addresses' ? 'is-active' : ''} onClick={() => setTab('addresses')}>
              Addresses
            </button>
            <button type="button" className={tab === 'profile' ? 'is-active' : ''} onClick={() => setTab('profile')}>
              Profile
            </button>
          </div>

          {tab === 'orders' ? (
            <div className="panel">
              <div className="panel__head">
                <h2 className="panel__title">Order history</h2>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => void loadOrders()}>
                  Refresh
                </button>
              </div>
              {ordersError ? (
                <p className="field__error">{ordersError}</p>
              ) : orders === null ? (
                <Spinner label="Loading orders" />
              ) : orders.length === 0 ? (
                <EmptyState
                  title="No orders yet"
                  body="Your first Komandra order is one tap away."
                  action={
                    <Link to="/menu" className="btn btn--gold btn--sm">
                      Order something
                    </Link>
                  }
                />
              ) : (
                orders.map((order) => (
                  <div className="order-card" key={order.code}>
                    <div className="order-card__head">
                      <div>
                        <span className="track__code" style={{ fontSize: '0.78rem' }}>
                          {order.code}
                        </span>
                        <div className="order-card__meta">
                          {formatDate(order.createdAt)} · {order.fulfillment}
                        </div>
                      </div>
                      <span className={`status-pill status-pill--${statusTone(order.status)}`}>{statusLabel(order.status)}</span>
                    </div>
                    <div style={{ fontSize: '0.84rem', color: 'var(--muted)' }}>
                      {order.items.map((item) => `${item.qty} × ${item.name}`).join(', ')}
                    </div>
                    <div className="order-card__head">
                      <span style={{ fontSize: '0.92rem' }}>{formatMoney(order.totalCents, settings.currency)}</span>
                      <Link to={`/orders/${order.code}`} className="link-arrow">
                        Track order <ArrowUpRight size={14} />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : null}

          {tab === 'addresses' ? (
            <div className="panel">
              <div className="panel__head">
                <h2 className="panel__title">Delivery addresses</h2>
                <button type="button" className="btn btn--gold btn--sm" onClick={() => setShowAddressForm((value) => !value)}>
                  {showAddressForm ? 'Close' : 'Add address'}
                </button>
              </div>

              {showAddressForm ? (
                <form onSubmit={submitAddress} style={{ marginBottom: '1.2rem' }}>
                  {addressError ? (
                    <div className="form-error" role="alert">
                      {addressError}
                    </div>
                  ) : null}
                  <div className="field-row field-row--2">
                    <div className="field">
                      <label htmlFor="addr-label">Label</label>
                      <input
                        id="addr-label"
                        value={addressForm.label}
                        onChange={(event) => setAddressForm({ ...addressForm, label: event.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="addr-city">City</label>
                      <input
                        id="addr-city"
                        value={addressForm.city}
                        onChange={(event) => setAddressForm({ ...addressForm, city: event.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="addr-line1">Street address</label>
                    <input
                      id="addr-line1"
                      value={addressForm.line1}
                      onChange={(event) => setAddressForm({ ...addressForm, line1: event.target.value })}
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="addr-line2">Building / apartment</label>
                    <input
                      id="addr-line2"
                      value={addressForm.line2}
                      onChange={(event) => setAddressForm({ ...addressForm, line2: event.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="addr-notes">Delivery notes</label>
                    <input
                      id="addr-notes"
                      value={addressForm.notes}
                      onChange={(event) => setAddressForm({ ...addressForm, notes: event.target.value })}
                      placeholder="Gate code, floor, landmark"
                    />
                  </div>
                  <label className="checkbox" style={{ marginBottom: '0.8rem' }}>
                    <input
                      type="checkbox"
                      checked={addressForm.isDefault}
                      onChange={(event) => setAddressForm({ ...addressForm, isDefault: event.target.checked })}
                    />
                    Use as my default delivery address
                  </label>
                  <button type="submit" className="btn btn--gold btn--sm">
                    Save address
                  </button>
                </form>
              ) : null}

              {auth.addresses.length === 0 ? (
                <EmptyState title="No addresses saved" body="Add one now and checkout becomes a single tap." />
              ) : (
                <div style={{ display: 'grid', gap: '0.6rem' }}>
                  {auth.addresses.map((address) => (
                    <div className="order-card" key={address.id}>
                      <div className="order-card__head">
                        <div>
                          <strong style={{ fontWeight: 500 }}>{address.label}</strong>
                          {address.isDefault ? (
                            <span className="badge" style={{ marginLeft: '0.5rem' }}>
                              Default
                            </span>
                          ) : null}
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          {!address.isDefault ? (
                            <button
                              type="button"
                              className="btn btn--quiet"
                              onClick={async () => {
                                await auth.setDefaultAddress(address.id);
                                notify('Default address updated.', 'success');
                              }}
                            >
                              <Check size={13} /> Make default
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="btn btn--quiet"
                            aria-label={`Delete ${address.label}`}
                            onClick={async () => {
                              await auth.deleteAddress(address.id);
                              notify('Address removed.', 'info');
                            }}
                          >
                            <Trash size={13} />
                          </button>
                        </div>
                      </div>
                      <div className="order-card__meta">
                        {address.line1}
                        {address.line2 ? `, ${address.line2}` : ''} · {address.city}
                        {address.notes ? ` · ${address.notes}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {tab === 'profile' ? (
            <div className="panel">
              <h2 className="panel__title">Profile</h2>
              {profileError ? (
                <div className="form-error" role="alert" style={{ marginTop: '0.8rem' }}>
                  {profileError}
                </div>
              ) : null}
              {profileMessage ? (
                <p className="avail" style={{ marginTop: '0.8rem' }}>
                  <Check size={12} /> {profileMessage}
                </p>
              ) : null}
              <form onSubmit={saveProfile} style={{ marginTop: '1rem' }}>
                <div className="field-row field-row--2">
                  <div className="field">
                    <label htmlFor="prof-name">Name</label>
                    <input
                      id="prof-name"
                      value={profile.name}
                      onChange={(event) => setProfile({ ...profile, name: event.target.value })}
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="prof-phone">Phone</label>
                    <input
                      id="prof-phone"
                      value={profile.phone}
                      onChange={(event) => setProfile({ ...profile, phone: event.target.value })}
                      autoComplete="tel"
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn--gold btn--sm">
                  Save changes
                </button>
              </form>

              <h3 className="panel__title" style={{ marginTop: '1.8rem' }}>
                Change password
              </h3>
              <form onSubmit={changePassword} style={{ marginTop: '0.8rem' }}>
                <div className="field-row field-row--2">
                  <div className="field">
                    <label htmlFor="pw-current">Current password</label>
                    <input
                      id="pw-current"
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })}
                      required
                      autoComplete="current-password"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="pw-new">New password</label>
                    <input
                      id="pw-new"
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })}
                      required
                      minLength={8}
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn--ghost btn--sm">
                  Update password
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

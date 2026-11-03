import { Link } from 'react-router-dom';
import { formatDay, formatMoney, timeAgo } from '../lib/format';
import { useSettings } from '../store/SettingsContext';
import { AdminError, AdminPage, StatusPill, useFetch } from './shared';

type Stats = {
  kpis: {
    revenueCents: number;
    orders: number;
    avgOrderCents: number;
    activeProducts: number;
    lowStock: number;
    newMessages: number;
    pendingReservations: number;
  };
  revenueSeries: Array<{ date: string; revenueCents: number; orders: number }>;
  topProducts: Array<{ name: string; qty: number; revenueCents: number }>;
  statusBreakdown: Array<{ status: string; count: number }>;
  recentOrders: Array<{
    code: string;
    customerName: string;
    totalCents: number;
    status: string;
    fulfillment: string;
    createdAt: string;
  }>;
};

export function AdminDashboard() {
  const { data, error, loading } = useFetch<Stats>('/admin/stats');
  const settingsCheck = useFetch<{ adminDefaultPassword: boolean }>('/admin/settings');
  const { settings } = useSettings();

  const stats = data;
  const maxRevenue = Math.max(1, ...(stats?.revenueSeries.map((point) => point.revenueCents) ?? [1]));

  return (
    <AdminPage
      title="Dashboard"
      sub="Live view of the restaurant — revenue, orders and kitchen pressure."
      action={
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link to="/admin/orders" className="btn btn--ghost btn--sm">
            Orders
          </Link>
          <Link to="/admin/products" className="btn btn--gold btn--sm">
            Manage menu
          </Link>
        </div>
      }
    >
      <AdminError message={error} />

      {settingsCheck.data?.adminDefaultPassword ? (
        <div
          className="panel"
          style={{ borderColor: 'rgba(233,162,59,.4)', background: 'rgba(233,162,59,.07)', marginBottom: '1rem' }}
        >
          <strong style={{ fontWeight: 500 }}>Secure the admin account.</strong>
          <p className="note" style={{ marginTop: '0.3rem' }}>
            The dashboard is still using the seeded default password. Change it now from{' '}
            <Link to="/account" className="gold">
              Account / Profile / Change password
            </Link>
            . The warning clears automatically once the password is updated.
          </p>
        </div>
      ) : null}

      {loading ? (
        <div className="loading-block">
          <span className="spinner" /> Loading analytics
        </div>
      ) : stats ? (
        <>
          <div className="kpi-grid">
            <div className="kpi">
              <div className="kpi__label">Revenue</div>
              <div className="kpi__value">{formatMoney(stats.kpis.revenueCents, settings.currency)}</div>
              <div className="kpi__foot">All non-cancelled orders</div>
            </div>
            <div className="kpi">
              <div className="kpi__label">Orders</div>
              <div className="kpi__value">{stats.kpis.orders}</div>
              <div className="kpi__foot">Avg {formatMoney(stats.kpis.avgOrderCents, settings.currency)}</div>
            </div>
            <div className="kpi">
              <div className="kpi__label">Live dishes</div>
              <div className="kpi__value">{stats.kpis.activeProducts}</div>
              <div className="kpi__foot">{stats.kpis.lowStock} low on stock</div>
            </div>
            <div className="kpi">
              <div className="kpi__label">Needs attention</div>
              <div className="kpi__value">{stats.kpis.newMessages + stats.kpis.pendingReservations}</div>
              <div className="kpi__foot">
                {stats.kpis.newMessages} messages · {stats.kpis.pendingReservations} bookings
              </div>
            </div>
          </div>

          <div className="admin-grid admin-grid--2" style={{ marginTop: '1rem' }}>
            <div className="panel">
              <div className="panel__head">
                <div>
                  <h2 className="panel__title">Revenue · last 14 days</h2>
                  <p className="panel__sub">Excludes cancelled orders</p>
                </div>
                <span className="note">{formatMoney(stats.revenueSeries.reduce((sum, point) => sum + point.revenueCents, 0), settings.currency)}</span>
              </div>
              <div className="bar-chart" role="img" aria-label="Revenue for the last 14 days">
                {stats.revenueSeries.map((point) => (
                  <div
                    key={point.date}
                    className="bar-chart__bar"
                    style={{ height: `${Math.max(3, (point.revenueCents / maxRevenue) * 100)}%` }}
                    title={`${formatDay(point.date)} — ${formatMoney(point.revenueCents, settings.currency)} (${point.orders} orders)`}
                  />
                ))}
              </div>
              <div className="chart-labels">
                <span>{formatDay(stats.revenueSeries[0]?.date ?? '')}</span>
                <span>{formatDay(stats.revenueSeries[stats.revenueSeries.length - 1]?.date ?? '')}</span>
              </div>
            </div>

            <div className="panel">
              <h2 className="panel__title">Top dishes</h2>
              <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.8rem' }}>
                {stats.topProducts.length === 0 ? (
                  <p className="note">No sales recorded yet.</p>
                ) : (
                  stats.topProducts.map((product, index) => (
                    <div key={product.name} style={{ display: 'flex', gap: '0.6rem', alignItems: 'baseline' }}>
                      <span className="note" style={{ width: '1.2rem' }}>
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span style={{ flex: 1, fontSize: '0.84rem' }}>{product.name}</span>
                      <span className="note">{product.qty} sold</span>
                      <span style={{ fontSize: '0.8rem', fontVariantNumeric: 'tabular-nums' }}>
                        {formatMoney(product.revenueCents, settings.currency)}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <h2 className="panel__title" style={{ marginTop: '1.4rem' }}>
                Order status
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.6rem' }}>
                {stats.statusBreakdown.length === 0 ? (
                  <p className="note">No orders yet.</p>
                ) : (
                  stats.statusBreakdown.map((row) => (
                    <span key={row.status} className="status-pill status-pill--muted">
                      {row.status.replace(/_/g, ' ')} · {row.count}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="panel" style={{ marginTop: '1rem' }}>
            <div className="panel__head">
              <h2 className="panel__title">Recent orders</h2>
              <Link to="/admin/orders" className="link-arrow">
                All orders
              </Link>
            </div>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Customer</th>
                    <th>Type</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Placed</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="note">
                        No orders yet. Share the menu to get the first one.
                      </td>
                    </tr>
                  ) : (
                    stats.recentOrders.map((order) => (
                      <tr key={order.code}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem' }}>{order.code}</td>
                        <td>{order.customerName}</td>
                        <td style={{ textTransform: 'capitalize' }}>{order.fulfillment}</td>
                        <td>{formatMoney(order.totalCents, settings.currency)}</td>
                        <td>
                          <StatusPill status={order.status} />
                        </td>
                        <td className="note">{timeAgo(order.createdAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </AdminPage>
  );
}

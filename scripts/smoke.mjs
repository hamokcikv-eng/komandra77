const BASE = process.env.BASE ?? 'http://127.0.0.1:8787';
let cookie = '';
const failures = [];

function record(name, ok, extra) {
  if (!ok) failures.push(name);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  ${JSON.stringify(extra).slice(0, 400)}`}`);
}

async function req(path, { method = 'GET', body, headers = {} } = {}) {
  const finalHeaders = { ...headers };
  if (body !== undefined) finalHeaders['content-type'] = 'application/json';
  if (cookie) finalHeaders.cookie = cookie;
  const res = await fetch(BASE + path, { method, headers: finalHeaders, body: body === undefined ? undefined : JSON.stringify(body) });
  const setCookies = res.headers.getSetCookie?.() ?? [];
  for (const value of setCookies) cookie = value.split(';')[0];
  const text = await res.text();
  let data = text;
  try {
    data = JSON.parse(text);
  } catch {
    /* keep text */
  }
  return { status: res.status, data, headers: res.headers };
}

const health = await req('/api/health');
record('health', health.status === 200 && health.data.ok === true, health);

const menu = await req('/api/menu');
const products = menu.data.products ?? [];
record('menu loads products', menu.status === 200 && products.length >= 9, { status: menu.status, count: products.length });
record('menu has categories', (menu.data.categories ?? []).length >= 5, menu.data.categories?.length);

const signature = products.find((p) => p.slug === 'signature-komandra-burger');
record('signature product present with sizes/addons', Boolean(signature?.sizes.length && signature?.addons.length), signature?.sizes);

const detail = await req('/api/products/signature-komandra-burger');
record('product detail', detail.status === 200 && detail.data.product.slug === 'signature-komandra-burger' && detail.data.related.length > 0, detail.status);

const settings = await req('/api/settings');
record('public settings', settings.status === 200 && settings.data.settings.name === 'KOMANDRA' && settings.data.settings.deliveryFeeCents === 1500, settings.data);

const offers = await req('/api/offers');
record('offers joined to products', offers.status === 200 && offers.data.offers.every((o) => o.product), offers.data);

const large = signature.sizes.find((s) => s.name === 'Large');
const cheddar = signature.addons.find((a) => a.name === 'Extra Cheddar');
const fries = products.find((p) => p.slug === 'loaded-fries');
const items = [
  { productId: signature.id, qty: 1, sizeId: large.id, addonIds: [cheddar.id] },
  { productId: fries.id, qty: 2, sizeId: null, addonIds: [] },
];

const couponCheck = await req('/api/coupons/validate', { method: 'POST', body: { code: 'KOMANDRA10', items } });
record('coupon validation', couponCheck.status === 200 && couponCheck.data.discountCents === 1050, couponCheck.data);

const badCoupon = await req('/api/coupons/validate', { method: 'POST', body: { code: 'NOPE', items } });
record('invalid coupon rejected', badCoupon.status === 422, badCoupon);

const created = await req('/api/orders', {
  method: 'POST',
  body: {
    items,
    fulfillment: 'delivery',
    name: 'Smoke Tester',
    phone: '0551234567',
    email: 'smoke@komandra.test',
    address: { line1: '12 Olaya Street', city: 'Riyadh', notes: 'Gate 2' },
    notes: 'Extra napkins',
    couponCode: 'KOMANDRA10',
    paymentMethod: 'cash',
  },
});
const order = created.data.order ?? {};
record('order created', created.status === 201 && /^K[A-Z0-9]{7}$/.test(order.code ?? ''), created);
record(
  'server-side totals',
  order.subtotalCents === 10500 && order.discountCents === 1050 && order.deliveryFeeCents === 1500 && order.totalCents === 10950,
  order,
);
record('whatsapp handoff link', typeof created.data.whatsappUrl === 'string' && created.data.whatsappUrl.includes('wa.me'), created.data.whatsappUrl);

const tracked = await req(`/api/orders/${order.code}`);
record('order tracking', tracked.status === 200 && tracked.data.order.items.length === 2 && tracked.data.order.events.length === 1, tracked.data);

const offerOrder = await req('/api/orders', {
  method: 'POST',
  body: {
    items: [{ productId: products.find((p) => p.slug === 'double-cheese-burger').id, qty: 1, sizeId: null, addonIds: [], offerSlug: 'double-stack' }],
    fulfillment: 'pickup',
    name: 'Smoke Tester',
    phone: '0551234567',
    paymentMethod: 'cash',
  },
});
record('offer pricing applied', offerOrder.status === 201 && offerOrder.data.order.subtotalCents === 3800, offerOrder.data);

const rejected = await req('/api/orders', {
  method: 'POST',
  body: { items: [{ productId: 999999, qty: 1, addonIds: [] }], fulfillment: 'pickup', name: 'X', phone: '0551234567' },
});
record('invalid product rejected', rejected.status === 422, rejected);

const crossSite = await req('/api/contact', {
  method: 'POST',
  headers: { origin: 'https://evil.example' },
  body: { name: 'Evil', email: 'evil@example.com', message: 'cross site attempt' },
});
record('cross-site POST blocked', crossSite.status === 403, crossSite);

const guard = await req('/api/admin/stats');
record('admin requires auth', guard.status === 401, guard.status);

const email = `smoke${Date.now()}@komandra.test`;
const registered = await req('/api/auth/register', {
  method: 'POST',
  body: { name: 'Smoke Customer', email, password: 'TableFor2', phone: '0559876543' },
});
record('registration', registered.status === 201 && registered.data.user.email === email, registered);

const me = await req('/api/auth/me');
record('session works', me.status === 200 && me.data.user?.email === email, me.data);

const address = await req('/api/addresses', {
  method: 'POST',
  body: { label: 'Home', line1: '22 Tahlia Street', city: 'Riyadh', isDefault: true },
});
record('address saved', address.status === 201 && address.data.address.isDefault === true, address.data);

const mine = await req('/api/orders/mine');
record('customer order history', mine.status === 200 && Array.isArray(mine.data.orders), mine.status);

const contact = await req('/api/contact', {
  method: 'POST',
  body: { name: 'Smoke', email: 'smoke@komandra.test', message: 'Do you cater events for forty people?' },
});
record('contact message stored', contact.status === 201, contact);

const reservationDate = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
const reservation = await req('/api/reservations', {
  method: 'POST',
  body: { name: 'Smoke', phone: '0551234567', partySize: 4, date: reservationDate, time: '19:30', notes: 'Window table' },
});
record('reservation stored', reservation.status === 201, reservation);

cookie = '';
const adminLogin = await req('/api/auth/login', { method: 'POST', body: { email: 'admin@komandra.com', password: 'Komandra#2026' } });
record('admin login', adminLogin.status === 200 && adminLogin.data.user.role === 'admin', adminLogin);

const stats = await req('/api/admin/stats');
record('admin analytics', stats.status === 200 && stats.data.revenueSeries.length === 14 && stats.data.kpis.orders >= 2, stats.data.kpis);
record('top products computed', (stats.data.topProducts ?? []).length >= 2, stats.data.topProducts);

const adminProducts = await req('/api/admin/products');
record('admin product list', adminProducts.status === 200 && adminProducts.data.products.length >= 9, adminProducts.status);

const createdProduct = await req('/api/admin/products', {
  method: 'POST',
  body: {
    name: 'Smoke Test Dish',
    categoryId: adminProducts.data.categories[0].id,
    price: 33.5,
    image: '/img/sliders.jpg',
    stock: 12,
    ingredients: 'beef, cheese',
    sizes: [{ name: 'Regular', priceDelta: 0, isDefault: true }],
    addonIds: [adminProducts.data.addons[0].id],
  },
});
record('admin product create', createdProduct.status === 201, createdProduct);

const patchedProduct = await req(`/api/admin/products/${createdProduct.data.id}`, { method: 'PATCH', body: { stock: 4, available: false } });
record('admin product update', patchedProduct.status === 200, patchedProduct);

const adminOrders = await req('/api/admin/orders');
record('admin order list', adminOrders.status === 200 && adminOrders.data.orders.length >= 2, adminOrders.status);

const confirmed = await req(`/api/admin/orders/${order.code}`, { method: 'PATCH', body: { status: 'confirmed', note: 'Kitchen accepted' } });
record('admin status update', confirmed.status === 200, confirmed);

const trackedAgain = await req(`/api/orders/${order.code}`);
record('tracking reflects status + event', trackedAgain.data.order.status === 'confirmed' && trackedAgain.data.order.events.length === 2, trackedAgain.data.order);

const inventory = await req('/api/admin/inventory');
record('inventory list', inventory.status === 200 && inventory.data.items.length >= 9, inventory.status);
const restock = await req(`/api/admin/inventory/${signature.id}`, { method: 'POST', body: { mode: 'set', value: 77, reason: 'Smoke restock' } });
record('inventory adjust', restock.status === 200 && restock.data.stock === 77, restock.data);

const offerCreate = await req('/api/admin/offers', {
  method: 'POST',
  body: { title: 'Smoke Offer', productId: fries.id, original: 26, offer: 19, active: true, badge: 'Test' },
});
record('admin offer create', offerCreate.status === 201, offerCreate);

const coupons = await req('/api/admin/coupons');
record('admin coupon list', coupons.status === 200 && coupons.data.coupons.length >= 2, coupons.status);
const newCoupon = await req('/api/admin/coupons', { method: 'POST', body: { code: `SMOKE${Date.now() % 10000}`, kind: 'fixed', value: 5, minSubtotal: 20, maxUses: 10 } });
record('admin coupon create', newCoupon.status === 201, newCoupon);

const reservations = await req('/api/admin/reservations');
record('admin reservations', reservations.status === 200 && reservations.data.reservations.length >= 1, reservations.status);
const messages = await req('/api/admin/messages');
record('admin messages', messages.status === 200 && messages.data.messages.length >= 1, messages.status);

const deleteProduct = await req(`/api/admin/products/${createdProduct.data.id}`, { method: 'DELETE' });
record('admin product delete', deleteProduct.status === 200, deleteProduct);

const logout = await req('/api/auth/logout', { method: 'POST' });
const afterLogout = await req('/api/admin/stats');
record('logout clears session', logout.status === 200 && afterLogout.status === 401, afterLogout.status);

console.log(`\n${failures.length === 0 ? 'ALL API CHECKS PASSED' : `FAILURES: ${failures.join(', ')}`}`);
process.exit(failures.length === 0 ? 0 : 1);

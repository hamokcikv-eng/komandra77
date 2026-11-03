import { Hono } from 'hono';
import type { AppEnv, SessionUser } from '../types';
import { body, fail, randomCode, txt } from '../http';
import { parseCart, priceCart, resolveCoupon, whatsappReceipt, type PricedLine } from '../pricing';
import { requireUser } from '../auth';
import { serializeOrder } from './serialize';
import { settingsMap } from '../db';
import { createCheckoutSession, notifyWhatsApp, retrieveSession, stripeEnabled } from '../integrations';

export const orderRoutes = new Hono<AppEnv>();

const PHONE = /^\+?[0-9][0-9\s()-]{5,24}$/;

async function uniqueCode(env: AppEnv['Bindings']): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = `K${randomCode(7)}`;
    const existing = await env.DB.prepare('SELECT 1 AS hit FROM orders WHERE code = ?').bind(code).first();
    if (!existing) return code;
  }
  fail(500, 'Could not generate an order reference. Please try again.');
}

function addressString(value: unknown): string {
  if (!value || typeof value !== 'object') fail(422, 'A delivery address is required');
  const row = value as Record<string, unknown>;
  const line1 = txt(row.line1, 'Street address', { min: 5, max: 200 });
  const line2 = txt(row.line2, 'Building / apartment', { optional: true, max: 140 });
  const city = txt(row.city, 'City', { min: 2, max: 80 });
  const notes = txt(row.notes, 'Delivery notes', { optional: true, max: 200 });
  return [line1, line2, city, notes].filter(Boolean).join(', ');
}

orderRoutes.post('/orders', async (c) => {
  const payload = await body(c);
  const items = parseCart(payload.items);
  const fulfillment = txt(payload.fulfillment, 'Order type', { max: 20 });
  if (fulfillment !== 'delivery' && fulfillment !== 'pickup') fail(422, 'Choose delivery or pickup');

  const name = txt(payload.name, 'Name', { min: 2, max: 120 });
  const phone = txt(payload.phone, 'Phone number', { min: 6, max: 26, pattern: PHONE });
  const email = txt(payload.email, 'Email', { email: true, optional: true, max: 160 });
  const notes = txt(payload.notes, 'Notes', { optional: true, max: 500 });
  const couponCode = txt(payload.couponCode, 'Promo code', { optional: true, max: 40 });
  const paymentMethod = txt(payload.paymentMethod, 'Payment method', { optional: true, max: 20 }) || 'cash';
  if (!['cash', 'card'].includes(paymentMethod)) fail(422, 'That payment method is not supported');
  if (paymentMethod === 'card' && !stripeEnabled(c.env)) fail(422, 'Card payments are not enabled yet — choose pay on delivery');

  const address = fulfillment === 'delivery' ? addressString(payload.address) : '';

  const lines: PricedLine[] = await priceCart(c.env, items);
  const subtotalCents = lines.reduce((sum, line) => sum + line.totalCents, 0);
  const coupon = await resolveCoupon(c.env, couponCode, subtotalCents);

  const settings = await settingsMap(c.env);
  const currency = settings.currency ?? 'SAR';
  const minOrder = Number(settings.min_order ?? 0);
  if (fulfillment === 'delivery' && subtotalCents < minOrder) {
    fail(422, `Delivery orders start at ${(minOrder / 100).toFixed(2)} ${currency}. Add a little more, or choose pickup.`);
  }

  const baseFee = Number(settings.delivery_fee ?? 0);
  const threshold = Number(settings.free_delivery_threshold ?? 0);
  const deliveryFeeCents =
    fulfillment === 'delivery' ? (threshold > 0 && subtotalCents >= threshold ? 0 : baseFee) : 0;
  const discountCents = coupon?.discountCents ?? 0;
  const totalCents = Math.max(0, subtotalCents - discountCents + deliveryFeeCents);

  const user = c.get('user') as SessionUser | null;
  const code = await uniqueCode(c.env);

  let checkout: { id: string; url: string } | null = null;
  if (paymentMethod === 'card') {
    checkout = await createCheckoutSession(c.env, {
      orderCode: code,
      amountCents: totalCents,
      currency,
      description: `KOMANDRA order ${code}`,
      customerEmail: email || null,
      origin: new URL(c.req.url).origin,
    });
    if (!checkout) fail(502, 'Our card provider is unavailable right now. Please choose pay on delivery.');
  }

  const created = await c.env.DB.prepare(
    `INSERT INTO orders
      (code, user_id, customer_name, phone, email, fulfillment, address, notes, subtotal_cents,
       discount_cents, delivery_fee_cents, total_cents, coupon_code, payment_method, payment_status, payment_ref, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
     RETURNING id`,
  )
    .bind(
      code,
      user?.id ?? null,
      name,
      phone,
      email || null,
      fulfillment,
      address || null,
      notes || null,
      subtotalCents,
      discountCents,
      deliveryFeeCents,
      totalCents,
      coupon?.code ?? null,
      paymentMethod,
      'unpaid',
      checkout?.id ?? null,
    )
    .first<{ id: number }>();

  if (!created) fail(500, 'Could not save your order. Please try again.');

  const statements = lines.map((line) =>
    c.env.DB.prepare(
      `INSERT INTO order_items (order_id, product_id, name, image, size_name, addon_names, qty, unit_price_cents, total_cents)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      created.id,
      line.productId,
      line.name,
      line.image,
      line.sizeName,
      line.addonNames.length ? JSON.stringify(line.addonNames) : null,
      line.qty,
      line.unitPriceCents,
      line.totalCents,
    ),
  );

  statements.push(
    c.env.DB.prepare(
      `INSERT INTO order_events (order_id, status, note) VALUES (?, 'pending', ?)`,
    ).bind(created.id, paymentMethod === 'card' ? 'Order received — awaiting card payment' : 'Order received'),
  );

  for (const line of lines) {
    statements.push(
      c.env.DB.prepare('UPDATE products SET stock = MAX(0, stock - ?), updated_at = datetime("now") WHERE id = ?').bind(
        line.qty,
        line.productId,
      ),
      c.env.DB.prepare('INSERT INTO inventory_log (product_id, delta, reason) VALUES (?, ?, ?)').bind(
        line.productId,
        -line.qty,
        `Order ${code}`,
      ),
    );
  }

  if (coupon) {
    statements.push(c.env.DB.prepare('UPDATE coupons SET uses = uses + 1 WHERE code = ?').bind(coupon.code));
  }

  await c.env.DB.batch(statements);

  const receipt = whatsappReceipt({
    code,
    name,
    fulfillment,
    lines,
    totalCents,
    currency,
    phone,
  });
  const whatsappNumber = (settings.whatsapp ?? '').replace(/[^0-9]/g, '');
  const whatsappUrl = whatsappNumber ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(receipt)}` : '';

  try {
    c.executionCtx.waitUntil(notifyWhatsApp(c.env, whatsappNumber, receipt));
  } catch {
    await notifyWhatsApp(c.env, whatsappNumber, receipt);
  }

  return c.json(
    {
      order: {
        code,
        status: 'pending',
        totalCents,
        subtotalCents,
        discountCents,
        deliveryFeeCents,
        paymentMethod,
        paymentStatus: 'unpaid',
        fulfillment,
        currency,
      },
      checkoutUrl: checkout?.url ?? null,
      whatsappUrl,
    },
    201,
  );
});

orderRoutes.get('/orders/mine', requireUser, async (c) => {
  const user = c.get('user') as SessionUser;
  const orders = await c.env.DB.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC LIMIT 30')
    .bind(user.id)
    .all<Record<string, unknown>>();
  const rows = orders.results ?? [];
  if (rows.length === 0) return c.json({ orders: [] });

  const codes = rows.map((row) => String(row.code));
  const placeholders = codes.map(() => '?').join(',');
  const items = await c.env.DB.prepare(`SELECT * FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE code IN (${placeholders}))`)
    .bind(...codes)
    .all<Record<string, unknown>>();

  const grouped = new Map<number, Record<string, unknown>[]>();
  for (const item of items.results ?? []) {
    const orderId = Number(item.order_id);
    const list = grouped.get(orderId) ?? [];
    list.push(item);
    grouped.set(orderId, list);
  }

  return c.json({
    orders: rows.map((row) => serializeOrder(row, grouped.get(Number(row.id)) ?? [], [])),
  });
});

async function loadOrder(env: AppEnv['Bindings'], code: string) {
  const order = await env.DB.prepare('SELECT * FROM orders WHERE code = ?').bind(code).first<Record<string, unknown>>();
  if (!order) fail(404, 'We could not find that order');
  const [items, events] = await Promise.all([
    env.DB.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id').bind(order.id).all<Record<string, unknown>>(),
    env.DB.prepare('SELECT * FROM order_events WHERE order_id = ? ORDER BY id').bind(order.id).all<Record<string, unknown>>(),
  ]);
  return serializeOrder(order, items.results ?? [], events.results ?? []);
}

orderRoutes.get('/orders/:code', async (c) => {
  const code = txt(c.req.param('code'), 'Order', { min: 4, max: 20 }).toUpperCase();
  const order = await loadOrder(c.env, code);
  c.header('Cache-Control', 'no-store');
  return c.json({
    order,
    whatsappUrl: await whatsappFor(c.env, code),
  });
});

async function whatsappFor(env: AppEnv['Bindings'], code: string): Promise<string> {
  const settings = await settingsMap(env);
  const number = (settings.whatsapp ?? '').replace(/[^0-9]/g, '');
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(`Hello KOMANDRA, I'd like to check on order ${code}.`)}` : '';
}

orderRoutes.post('/orders/:code/verify-payment', async (c) => {
  const code = txt(c.req.param('code'), 'Order', { min: 4, max: 20 }).toUpperCase();
  const order = await c.env.DB.prepare(
    'SELECT id, payment_method, payment_ref, payment_status, status FROM orders WHERE code = ?',
  )
    .bind(code)
    .first<{ id: number; payment_method: string; payment_ref: string | null; payment_status: string; status: string }>();
  if (!order) fail(404, 'We could not find that order');
  if (order.payment_method !== 'card' || !order.payment_ref) return c.json({ paymentStatus: order.payment_status });
  if (order.payment_status === 'paid') return c.json({ paymentStatus: 'paid' });

  const session = await retrieveSession(c.env, order.payment_ref);
  if (session?.payment_status === 'paid') {
    await c.env.DB.batch([
      c.env.DB.prepare("UPDATE orders SET payment_status = 'paid', status = 'confirmed', updated_at = datetime('now') WHERE id = ?").bind(order.id),
      c.env.DB.prepare("INSERT INTO order_events (order_id, status, note) VALUES (?, 'confirmed', 'Card payment received')").bind(order.id),
    ]);
    return c.json({ paymentStatus: 'paid' });
  }
  return c.json({ paymentStatus: order.payment_status });
});

orderRoutes.post('/orders/:code/cancel', requireUser, async (c) => {
  const user = c.get('user') as SessionUser;
  const code = txt(c.req.param('code'), 'Order', { min: 4, max: 20 }).toUpperCase();
  const order = await c.env.DB.prepare('SELECT * FROM orders WHERE code = ? AND user_id = ?')
    .bind(code, user.id)
    .first<Record<string, unknown>>();
  if (!order) fail(404, 'We could not find that order');
  if (!['pending', 'confirmed'].includes(String(order.status))) {
    fail(422, 'This order is already being prepared — please contact us on WhatsApp to change it.');
  }

  const items = await c.env.DB.prepare('SELECT product_id, qty FROM order_items WHERE order_id = ?')
    .bind(order.id)
    .all<{ product_id: number | null; qty: number }>();

  const statements = [
    c.env.DB.prepare("UPDATE orders SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?").bind(order.id),
    c.env.DB.prepare("INSERT INTO order_events (order_id, status, note) VALUES (?, 'cancelled', 'Cancelled by customer')").bind(order.id),
  ];
  for (const item of items.results ?? []) {
    if (!item.product_id) continue;
    statements.push(
      c.env.DB.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').bind(item.qty, item.product_id),
      c.env.DB.prepare('INSERT INTO inventory_log (product_id, delta, reason) VALUES (?, ?, ?)').bind(
        item.product_id,
        item.qty,
        `Cancelled order ${code}`,
      ),
    );
  }
  await c.env.DB.batch(statements);
  return c.json({ ok: true });
});

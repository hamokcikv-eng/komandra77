import { Hono } from 'hono';
import type { AppEnv, ProductRow } from '../types';
import { requireAdmin } from '../auth';
import { body, bool, fail, int, json, money, slugify, txt } from '../http';
import { settingsMap, setSetting } from '../db';
import { serializeOrder } from './serialize';
import { publicSettings } from './catalog';

export const adminRoutes = new Hono<AppEnv>();
adminRoutes.use('*', requireAdmin);

const ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled'];

function ingredientList(value: unknown): string {
  if (Array.isArray(value)) {
    const items = value.map((item) => String(item).trim()).filter(Boolean).slice(0, 24);
    return JSON.stringify(items);
  }
  if (typeof value === 'string') {
    const items = value
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 24);
    return JSON.stringify(items);
  }
  return '[]';
}

function sizeList(value: unknown): Array<{ name: string; delta: number; isDefault: boolean }> {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object') return null;
      const row = entry as Record<string, unknown>;
      const name = txt(row.name, 'Size name', { min: 1, max: 30 });
      const delta = money(row.priceDelta ?? 0, 'Size price', { optional: true });
      return { name, delta, isDefault: bool(row.isDefault, index === 0) };
    })
    .filter((entry): entry is { name: string; delta: number; isDefault: boolean } => Boolean(entry))
    .slice(0, 4);
}

async function uniqueSlug(env: AppEnv['Bindings'], base: string, ignoreId?: number): Promise<string> {
  let candidate = base;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const row = await env.DB.prepare('SELECT id FROM products WHERE slug = ?').bind(candidate).first<{ id: number }>();
    if (!row || row.id === ignoreId) return candidate;
    candidate = `${base}-${attempt + 2}`;
  }
  return `${base}-${Date.now()}`;
}

adminRoutes.get('/stats', async (c) => {
  const [totals, series, top, statuses, counters, recent] = await Promise.all([
    c.env.DB.prepare("SELECT COALESCE(SUM(total_cents),0) AS revenue, COUNT(*) AS orders FROM orders WHERE status != 'cancelled'").first<{
      revenue: number;
      orders: number;
    }>(),
    c.env.DB.prepare(
      `SELECT substr(created_at, 1, 10) AS day, COALESCE(SUM(total_cents),0) AS revenue, COUNT(*) AS orders
         FROM orders WHERE status != 'cancelled' AND created_at >= datetime('now', '-13 days')
        GROUP BY day ORDER BY day`,
    ).all<{ day: string; revenue: number; orders: number }>(),
    c.env.DB.prepare(
      `SELECT oi.name AS name, SUM(oi.qty) AS qty, SUM(oi.total_cents) AS revenue
         FROM order_items oi JOIN orders o ON o.id = oi.order_id
        WHERE o.status != 'cancelled'
        GROUP BY oi.name ORDER BY qty DESC LIMIT 5`,
    ).all<{ name: string; qty: number; revenue: number }>(),
    c.env.DB.prepare('SELECT status, COUNT(*) AS count FROM orders GROUP BY status').all<{ status: string; count: number }>(),
    c.env.DB.prepare(
      `SELECT
        (SELECT COUNT(*) FROM products WHERE is_available = 1) AS active_products,
        (SELECT COUNT(*) FROM products WHERE stock <= low_stock_at) AS low_stock,
        (SELECT COUNT(*) FROM messages WHERE status = 'new') AS new_messages,
        (SELECT COUNT(*) FROM reservations WHERE status = 'pending') AS pending_reservations`,
    ).first<{ active_products: number; low_stock: number; new_messages: number; pending_reservations: number }>(),
    c.env.DB.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 6').all<Record<string, unknown>>(),
  ]);

  const revenue = totals?.revenue ?? 0;
  const orders = totals?.orders ?? 0;

  const byDay = new Map((series.results ?? []).map((row) => [row.day, row]));
  const revenueSeries: Array<{ date: string; revenueCents: number; orders: number }> = [];
  for (let offset = 13; offset >= 0; offset -= 1) {
    const date = new Date(Date.now() - offset * 86_400_000).toISOString().slice(0, 10);
    const row = byDay.get(date);
    revenueSeries.push({ date, revenueCents: row?.revenue ?? 0, orders: row?.orders ?? 0 });
  }

  return c.json({
    kpis: {
      revenueCents: revenue,
      orders,
      avgOrderCents: orders > 0 ? Math.round(revenue / orders) : 0,
      activeProducts: counters?.active_products ?? 0,
      lowStock: counters?.low_stock ?? 0,
      newMessages: counters?.new_messages ?? 0,
      pendingReservations: counters?.pending_reservations ?? 0,
    },
    revenueSeries,
    topProducts: (top.results ?? []).map((row) => ({ name: row.name, qty: row.qty, revenueCents: row.revenue })),
    statusBreakdown: (statuses.results ?? []).map((row) => ({ status: row.status, count: row.count })),
    recentOrders: (recent.results ?? []).map((row) => ({
      code: row.code,
      customerName: row.customer_name,
      totalCents: row.total_cents,
      status: row.status,
      fulfillment: row.fulfillment,
      createdAt: row.created_at,
    })),
  });
});

adminRoutes.get('/products', async (c) => {
  const [products, categories, addons, sizes, links] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM products ORDER BY sort, id').all<ProductRow>(),
    c.env.DB.prepare('SELECT * FROM categories ORDER BY sort, name').all<Record<string, unknown>>(),
    c.env.DB.prepare('SELECT * FROM addons ORDER BY sort, id').all<Record<string, unknown>>(),
    c.env.DB.prepare('SELECT * FROM product_sizes ORDER BY product_id, sort').all<Record<string, unknown>>(),
    c.env.DB.prepare('SELECT * FROM product_addons').all<{ product_id: number; addon_id: number }>(),
  ]);

  const sizeRows = sizes.results ?? [];
  const linkRows = links.results ?? [];

  return c.json({
    products: (products.results ?? []).map((product) => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      categoryId: product.category_id,
      tagline: product.tagline ?? '',
      description: product.description ?? '',
      ingredients: json<string[]>(product.ingredients, []),
      priceCents: product.price_cents,
      compareAtCents: product.compare_at_cents,
      image: product.image,
      badge: product.badge ?? '',
      calories: product.calories,
      prepMinutes: product.prep_minutes,
      available: product.is_available === 1,
      stock: product.stock,
      lowStockAt: product.low_stock_at,
      featured: product.featured === 1,
      sort: product.sort,
      sizes: sizeRows
        .filter((size) => Number(size.product_id) === product.id)
        .map((size) => ({
          name: String(size.name),
          priceDeltaCents: Number(size.price_delta_cents),
          isDefault: Number(size.is_default) === 1,
        })),
      addonIds: linkRows.filter((link) => link.product_id === product.id).map((link) => link.addon_id),
    })),
    categories: (categories.results ?? []).map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      tagline: row.tagline ?? '',
      sort: row.sort,
    })),
    addons: (addons.results ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      priceCents: row.price_cents,
      active: Number(row.is_active) === 1,
    })),
  });
});

adminRoutes.post('/products', async (c) => {
  const payload = await body(c);
  const name = txt(payload.name, 'Name', { min: 2, max: 120 });
  const categoryId = int(payload.categoryId, 'Category', { min: 1 });
  const category = await c.env.DB.prepare('SELECT id FROM categories WHERE id = ?').bind(categoryId).first();
  if (!category) fail(422, 'Choose a valid category');

  const priceCents = money(payload.price, 'Price', { min: 50 });
  const compareAt = money(payload.compareAt, 'Compare-at price', { optional: true }) || null;
  const slug = await uniqueSlug(c.env, slugify(name, 'dish'));
  const image = txt(payload.image, 'Image', { min: 3, max: 400 });
  const sizes = sizeList(payload.sizes);
  const addonIds = Array.isArray(payload.addonIds) ? payload.addonIds.map((id) => int(id, 'Add-on', { min: 1 })) : [];

  const created = await c.env.DB.prepare(
    `INSERT INTO products
      (slug, name, category_id, tagline, description, ingredients, price_cents, compare_at_cents, image, badge,
       calories, prep_minutes, is_available, stock, low_stock_at, featured, sort)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING id`,
  )
    .bind(
      slug,
      name,
      categoryId,
      txt(payload.tagline, 'Tagline', { optional: true, max: 160 }) || null,
      txt(payload.description, 'Description', { optional: true, max: 1200 }) || null,
      ingredientList(payload.ingredients),
      priceCents,
      compareAt,
      image,
      txt(payload.badge, 'Badge', { optional: true, max: 40 }) || null,
      int(payload.calories, 'Calories', { optional: true, max: 5000 }) || null,
      int(payload.prepMinutes, 'Prep time', { min: 1, max: 120, optional: true, fallback: 15 }),
      bool(payload.available, true) ? 1 : 0,
      int(payload.stock, 'Stock', { min: 0, max: 100000, optional: true, fallback: 100 }),
      int(payload.lowStockAt, 'Low stock threshold', { min: 0, max: 1000, optional: true, fallback: 10 }),
      bool(payload.featured, false) ? 1 : 0,
      int(payload.sort, 'Sort order', { optional: true, fallback: 99 }),
    )
    .first<{ id: number }>();

  if (!created) fail(500, 'Could not create the product');

  const statements = [];
  for (let i = 0; i < sizes.length; i += 1) {
    statements.push(
      c.env.DB.prepare('INSERT INTO product_sizes (product_id, name, price_delta_cents, is_default, sort) VALUES (?, ?, ?, ?, ?)')
        .bind(created.id, sizes[i].name, sizes[i].delta, sizes[i].isDefault ? 1 : 0, i),
    );
  }
  for (const addonId of [...new Set(addonIds)]) {
    statements.push(c.env.DB.prepare('INSERT OR IGNORE INTO product_addons (product_id, addon_id) VALUES (?, ?)').bind(created.id, addonId));
  }
  if (statements.length) await c.env.DB.batch(statements);

  return c.json({ id: created.id, slug }, 201);
});

adminRoutes.patch('/products/:id', async (c) => {
  const id = int(c.req.param('id'), 'Product', { min: 1 });
  const existing = await c.env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first<ProductRow>();
  if (!existing) fail(404, 'Product not found');

  const payload = await body(c);
  const name = payload.name === undefined ? existing.name : txt(payload.name, 'Name', { min: 2, max: 120 });
  const categoryId = payload.categoryId === undefined ? existing.category_id : int(payload.categoryId, 'Category', { min: 1 });
  const category = await c.env.DB.prepare('SELECT id FROM categories WHERE id = ?').bind(categoryId).first();
  if (!category) fail(422, 'Choose a valid category');

  const priceCents = payload.price === undefined ? existing.price_cents : money(payload.price, 'Price', { min: 50 });
  const compareAt =
    payload.compareAt === undefined
      ? existing.compare_at_cents
      : money(payload.compareAt, 'Compare-at price', { optional: true }) || null;

  const slugBase = payload.slug === undefined ? existing.slug : slugify(txt(payload.slug, 'Slug', { min: 2, max: 80 }), existing.slug);
  const slug = slugBase === existing.slug ? existing.slug : await uniqueSlug(c.env, slugBase, id);

  await c.env.DB.prepare(
    `UPDATE products SET slug = ?, name = ?, category_id = ?, tagline = ?, description = ?, ingredients = ?,
       price_cents = ?, compare_at_cents = ?, image = ?, badge = ?, calories = ?, prep_minutes = ?,
       is_available = ?, stock = ?, low_stock_at = ?, featured = ?, sort = ?, updated_at = datetime('now')
     WHERE id = ?`,
  )
    .bind(
      slug,
      name,
      categoryId,
      payload.tagline === undefined ? existing.tagline : txt(payload.tagline, 'Tagline', { optional: true, max: 160 }) || null,
      payload.description === undefined
        ? existing.description
        : txt(payload.description, 'Description', { optional: true, max: 1200 }) || null,
      payload.ingredients === undefined ? existing.ingredients : ingredientList(payload.ingredients),
      priceCents,
      compareAt,
      payload.image === undefined ? existing.image : txt(payload.image, 'Image', { min: 3, max: 400 }),
      payload.badge === undefined ? existing.badge : txt(payload.badge, 'Badge', { optional: true, max: 40 }) || null,
      payload.calories === undefined ? existing.calories : int(payload.calories, 'Calories', { optional: true, max: 5000 }) || null,
      payload.prepMinutes === undefined
        ? existing.prep_minutes
        : int(payload.prepMinutes, 'Prep time', { min: 1, max: 120, optional: true, fallback: existing.prep_minutes }),
      payload.available === undefined ? existing.is_available : bool(payload.available, true) ? 1 : 0,
      payload.stock === undefined ? existing.stock : int(payload.stock, 'Stock', { min: 0, max: 100000 }),
      payload.lowStockAt === undefined
        ? existing.low_stock_at
        : int(payload.lowStockAt, 'Low stock threshold', { min: 0, max: 1000, optional: true, fallback: existing.low_stock_at }),
      payload.featured === undefined ? existing.featured : bool(payload.featured, false) ? 1 : 0,
      payload.sort === undefined ? existing.sort : int(payload.sort, 'Sort order', { optional: true, fallback: existing.sort }),
      id,
    )
    .run();

  if (payload.sizes !== undefined) {
    const sizes = sizeList(payload.sizes);
    const statements = [c.env.DB.prepare('DELETE FROM product_sizes WHERE product_id = ?').bind(id)];
    for (let i = 0; i < sizes.length; i += 1) {
      statements.push(
        c.env.DB.prepare('INSERT INTO product_sizes (product_id, name, price_delta_cents, is_default, sort) VALUES (?, ?, ?, ?, ?)')
          .bind(id, sizes[i].name, sizes[i].delta, sizes[i].isDefault ? 1 : 0, i),
      );
    }
    await c.env.DB.batch(statements);
  }

  if (payload.addonIds !== undefined) {
    const addonIds = Array.isArray(payload.addonIds) ? payload.addonIds.map((value) => int(value, 'Add-on', { min: 1 })) : [];
    const statements = [c.env.DB.prepare('DELETE FROM product_addons WHERE product_id = ?').bind(id)];
    for (const addonId of [...new Set(addonIds)]) {
      statements.push(c.env.DB.prepare('INSERT OR IGNORE INTO product_addons (product_id, addon_id) VALUES (?, ?)').bind(id, addonId));
    }
    await c.env.DB.batch(statements);
  }

  return c.json({ ok: true, id, slug });
});

adminRoutes.delete('/products/:id', async (c) => {
  const id = int(c.req.param('id'), 'Product', { min: 1 });
  const existing = await c.env.DB.prepare('SELECT id, name FROM products WHERE id = ?').bind(id).first<{ id: number; name: string }>();
  if (!existing) fail(404, 'Product not found');

  const used = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM order_items WHERE product_id = ?').bind(id).first<{ n: number }>();
  if ((used?.n ?? 0) > 0) {
    await c.env.DB.prepare("UPDATE products SET is_available = 0, updated_at = datetime('now') WHERE id = ?").bind(id).run();
    return c.json({ archived: true, message: 'This dish appears in past orders, so it was archived instead of deleted.' });
  }

  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM offers WHERE product_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM products WHERE id = ?').bind(id),
  ]);
  return c.json({ deleted: true });
});

adminRoutes.get('/categories', async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count
       FROM categories c ORDER BY c.sort, c.name`,
  ).all<Record<string, unknown>>();
  return c.json({
    categories: (rows.results ?? []).map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      tagline: row.tagline ?? '',
      sort: row.sort,
      products: row.product_count,
    })),
  });
});

adminRoutes.post('/categories', async (c) => {
  const payload = await body(c);
  const name = txt(payload.name, 'Name', { min: 2, max: 60 });
  const slug = slugify(payload.slug ? txt(payload.slug, 'Slug', { max: 60 }) : name, 'category');
  const existing = await c.env.DB.prepare('SELECT id FROM categories WHERE slug = ?').bind(slug).first();
  if (existing) fail(409, 'A category with that slug already exists');

  const created = await c.env.DB.prepare(
    'INSERT INTO categories (slug, name, tagline, sort) VALUES (?, ?, ?, ?) RETURNING id',
  )
    .bind(slug, name, txt(payload.tagline, 'Tagline', { optional: true, max: 160 }) || null, int(payload.sort, 'Sort', { optional: true, fallback: 99 }))
    .first<{ id: number }>();
  return c.json({ id: created?.id, slug }, 201);
});

adminRoutes.patch('/categories/:id', async (c) => {
  const id = int(c.req.param('id'), 'Category', { min: 1 });
  const existing = await c.env.DB.prepare('SELECT * FROM categories WHERE id = ?').bind(id).first<Record<string, unknown>>();
  if (!existing) fail(404, 'Category not found');
  const payload = await body(c);
  const name = payload.name === undefined ? String(existing.name) : txt(payload.name, 'Name', { min: 2, max: 60 });
  const slug = payload.slug === undefined ? String(existing.slug) : slugify(txt(payload.slug, 'Slug', { max: 60 }), String(existing.slug));
  await c.env.DB.prepare('UPDATE categories SET name = ?, slug = ?, tagline = ?, sort = ? WHERE id = ?')
    .bind(
      name,
      slug,
      payload.tagline === undefined ? existing.tagline : txt(payload.tagline, 'Tagline', { optional: true, max: 160 }) || null,
      payload.sort === undefined ? existing.sort : int(payload.sort, 'Sort', { optional: true, fallback: Number(existing.sort) }),
      id,
    )
    .run();
  return c.json({ ok: true });
});

adminRoutes.delete('/categories/:id', async (c) => {
  const id = int(c.req.param('id'), 'Category', { min: 1 });
  const count = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM products WHERE category_id = ?').bind(id).first<{ n: number }>();
  if ((count?.n ?? 0) > 0) fail(409, 'Move or delete the dishes in this category first');
  await c.env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();
  return c.json({ deleted: true });
});

adminRoutes.get('/addons', async (c) => {
  const rows = await c.env.DB.prepare('SELECT * FROM addons ORDER BY sort, id').all<Record<string, unknown>>();
  return c.json({
    addons: (rows.results ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      priceCents: row.price_cents,
      active: Number(row.is_active) === 1,
    })),
  });
});

adminRoutes.post('/addons', async (c) => {
  const payload = await body(c);
  const name = txt(payload.name, 'Name', { min: 2, max: 60 });
  const priceCents = money(payload.price, 'Price', { min: 0 });
  const created = await c.env.DB.prepare('INSERT INTO addons (name, price_cents, is_active, sort) VALUES (?, ?, ?, ?) RETURNING id')
    .bind(name, priceCents, bool(payload.active, true) ? 1 : 0, int(payload.sort, 'Sort', { optional: true, fallback: 99 }))
    .first<{ id: number }>();
  return c.json({ id: created?.id }, 201);
});

adminRoutes.patch('/addons/:id', async (c) => {
  const id = int(c.req.param('id'), 'Add-on', { min: 1 });
  const existing = await c.env.DB.prepare('SELECT * FROM addons WHERE id = ?').bind(id).first<Record<string, unknown>>();
  if (!existing) fail(404, 'Add-on not found');
  const payload = await body(c);
  await c.env.DB.prepare('UPDATE addons SET name = ?, price_cents = ?, is_active = ? WHERE id = ?')
    .bind(
      payload.name === undefined ? existing.name : txt(payload.name, 'Name', { min: 2, max: 60 }),
      payload.price === undefined ? existing.price_cents : money(payload.price, 'Price', { min: 0 }),
      payload.active === undefined ? existing.is_active : bool(payload.active, true) ? 1 : 0,
      id,
    )
    .run();
  return c.json({ ok: true });
});

adminRoutes.delete('/addons/:id', async (c) => {
  const id = int(c.req.param('id'), 'Add-on', { min: 1 });
  await c.env.DB.prepare('DELETE FROM addons WHERE id = ?').bind(id).run();
  return c.json({ deleted: true });
});

adminRoutes.get('/orders', async (c) => {
  const status = c.req.query('status') ?? '';
  const search = (c.req.query('q') ?? '').trim();
  const limit = Math.min(int(c.req.query('limit'), 'Limit', { optional: true, fallback: 60, min: 1 }), 200);

  const clauses: string[] = [];
  const values: unknown[] = [];
  if (status && ORDER_STATUSES.includes(status)) {
    clauses.push('status = ?');
    values.push(status);
  }
  if (search) {
    clauses.push('(code LIKE ? OR customer_name LIKE ? OR phone LIKE ?)');
    values.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const [rows, counts] = await Promise.all([
    c.env.DB.prepare(`SELECT * FROM orders ${where} ORDER BY id DESC LIMIT ${limit}`)
      .bind(...values)
      .all<Record<string, unknown>>(),
    c.env.DB.prepare('SELECT status, COUNT(*) AS count FROM orders GROUP BY status').all<{ status: string; count: number }>(),
  ]);

  return c.json({
    orders: (rows.results ?? []).map((row) => ({
      code: row.code,
      customerName: row.customer_name,
      phone: row.phone,
      fulfillment: row.fulfillment,
      totalCents: row.total_cents,
      status: row.status,
      paymentMethod: row.payment_method,
      paymentStatus: row.payment_status,
      createdAt: row.created_at,
    })),
    counts: Object.fromEntries((counts.results ?? []).map((row) => [row.status, row.count])),
  });
});

adminRoutes.get('/orders/:code', async (c) => {
  const code = txt(c.req.param('code'), 'Order', { min: 4, max: 24 }).toUpperCase();
  const order = await c.env.DB.prepare('SELECT * FROM orders WHERE code = ?').bind(code).first<Record<string, unknown>>();
  if (!order) fail(404, 'Order not found');
  const [items, events] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id').bind(order.id).all<Record<string, unknown>>(),
    c.env.DB.prepare('SELECT * FROM order_events WHERE order_id = ? ORDER BY id').bind(order.id).all<Record<string, unknown>>(),
  ]);
  return c.json({ order: serializeOrder(order, items.results ?? [], events.results ?? []) });
});

adminRoutes.patch('/orders/:code', async (c) => {
  const code = txt(c.req.param('code'), 'Order', { min: 4, max: 24 }).toUpperCase();
  const payload = await body(c);
  const status = txt(payload.status, 'Status', { max: 30 });
  if (!ORDER_STATUSES.includes(status)) fail(422, 'Unknown order status');

  const order = await c.env.DB.prepare('SELECT * FROM orders WHERE code = ?')
    .bind(code)
    .first<{ id: number; status: string; payment_method: string; total_cents: number }>();
  if (!order) fail(404, 'Order not found');

  const note = txt(payload.note, 'Note', { optional: true, max: 260 });
  const statements = [
    c.env.DB.prepare('UPDATE orders SET status = ?, updated_at = datetime("now") WHERE id = ?').bind(status, order.id),
    c.env.DB.prepare('INSERT INTO order_events (order_id, status, note) VALUES (?, ?, ?)').bind(order.id, status, note || null),
  ];

  if (status === 'completed' && order.payment_method === 'cash') {
    statements.push(c.env.DB.prepare("UPDATE orders SET payment_status = 'paid' WHERE id = ?").bind(order.id));
  }

  if (status === 'cancelled' && order.status !== 'cancelled') {
    const items = await c.env.DB.prepare('SELECT product_id, qty FROM order_items WHERE order_id = ?')
      .bind(order.id)
      .all<{ product_id: number | null; qty: number }>();
    for (const item of items.results ?? []) {
      if (!item.product_id) continue;
      statements.push(
        c.env.DB.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').bind(item.qty, item.product_id),
        c.env.DB.prepare('INSERT INTO inventory_log (product_id, delta, reason) VALUES (?, ?, ?)').bind(
          item.product_id,
          item.qty,
          `Admin cancelled ${code}`,
        ),
      );
    }
  }

  await c.env.DB.batch(statements);
  return c.json({ ok: true, status });
});

adminRoutes.get('/offers', async (c) => {
  const [offers, products] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM offers ORDER BY sort, id').all<Record<string, unknown>>(),
    c.env.DB.prepare('SELECT id, name, image, price_cents FROM products ORDER BY name').all<Record<string, unknown>>(),
  ]);
  return c.json({
    offers: (offers.results ?? []).map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      subtitle: row.subtitle ?? '',
      productId: row.product_id,
      originalCents: row.original_cents,
      offerCents: row.offer_cents,
      image: row.image ?? '',
      badge: row.badge ?? '',
      active: Number(row.active) === 1,
      endsAt: row.ends_at,
      sort: row.sort,
    })),
    products: products.results ?? [],
  });
});

function offerValues(payload: Record<string, unknown>) {
  const title = txt(payload.title, 'Title', { min: 2, max: 90 });
  const productId = int(payload.productId, 'Product', { min: 1 });
  const originalCents = money(payload.original, 'Original price', { min: 100 });
  const offerCents = money(payload.offer, 'Offer price', { min: 50 });
  if (offerCents >= originalCents) fail(422, 'The offer price must be lower than the original price');
  return {
    title,
    productId,
    originalCents,
    offerCents,
    subtitle: txt(payload.subtitle, 'Subtitle', { optional: true, max: 160 }) || null,
    image: txt(payload.image, 'Image', { optional: true, max: 400 }) || null,
    badge: txt(payload.badge, 'Badge', { optional: true, max: 30 }) || null,
    active: bool(payload.active, true) ? 1 : 0,
    endsAt: txt(payload.endsAt, 'End date', { optional: true, max: 30 }) || null,
    sort: int(payload.sort, 'Sort', { optional: true, fallback: 99 }),
    slug: slugify(title, 'offer'),
  };
}

adminRoutes.post('/offers', async (c) => {
  const payload = await body(c);
  const values = offerValues(payload);
  const product = await c.env.DB.prepare('SELECT id FROM products WHERE id = ?').bind(values.productId).first();
  if (!product) fail(422, 'Choose a valid product');

  const slugExists = await c.env.DB.prepare('SELECT id FROM offers WHERE slug = ?').bind(values.slug).first();
  const created = await c.env.DB.prepare(
    `INSERT INTO offers (slug, title, subtitle, product_id, original_cents, offer_cents, image, badge, active, ends_at, sort)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
  )
    .bind(
      slugExists ? `${values.slug}-${Date.now().toString(36)}` : values.slug,
      values.title,
      values.subtitle,
      values.productId,
      values.originalCents,
      values.offerCents,
      values.image,
      values.badge,
      values.active,
      values.endsAt,
      values.sort,
    )
    .first<{ id: number }>();
  return c.json({ id: created?.id }, 201);
});

adminRoutes.patch('/offers/:id', async (c) => {
  const id = int(c.req.param('id'), 'Offer', { min: 1 });
  const existing = await c.env.DB.prepare('SELECT * FROM offers WHERE id = ?').bind(id).first<Record<string, unknown>>();
  if (!existing) fail(404, 'Offer not found');
  const payload = await body(c);
  const values = offerValues({
    title: payload.title ?? existing.title,
    productId: payload.productId ?? existing.product_id,
    original: payload.original ?? Number(existing.original_cents) / 100,
    offer: payload.offer ?? Number(existing.offer_cents) / 100,
    subtitle: payload.subtitle ?? existing.subtitle,
    image: payload.image ?? existing.image,
    badge: payload.badge ?? existing.badge,
    active: payload.active ?? Number(existing.active) === 1,
    endsAt: payload.endsAt ?? existing.ends_at,
    sort: payload.sort ?? existing.sort,
  });

  await c.env.DB.prepare(
    `UPDATE offers SET title = ?, subtitle = ?, product_id = ?, original_cents = ?, offer_cents = ?, image = ?, badge = ?, active = ?, ends_at = ?, sort = ?
     WHERE id = ?`,
  )
    .bind(
      values.title,
      values.subtitle,
      values.productId,
      values.originalCents,
      values.offerCents,
      values.image,
      values.badge,
      values.active,
      values.endsAt,
      values.sort,
      id,
    )
    .run();
  return c.json({ ok: true });
});

adminRoutes.delete('/offers/:id', async (c) => {
  await c.env.DB.prepare('DELETE FROM offers WHERE id = ?').bind(int(c.req.param('id'), 'Offer', { min: 1 })).run();
  return c.json({ deleted: true });
});

adminRoutes.get('/coupons', async (c) => {
  const rows = await c.env.DB.prepare('SELECT * FROM coupons ORDER BY id DESC').all<Record<string, unknown>>();
  return c.json({
    coupons: (rows.results ?? []).map((row) => ({
      id: row.id,
      code: row.code,
      kind: row.kind,
      value: row.value,
      minSubtotalCents: row.min_subtotal_cents,
      maxUses: row.max_uses,
      uses: row.uses,
      active: Number(row.active) === 1,
      expiresAt: row.expires_at,
      description: row.description ?? '',
    })),
  });
});

function couponValues(payload: Record<string, unknown>) {
  const code = txt(payload.code, 'Code', { min: 3, max: 30 }).toUpperCase().replace(/\s+/g, '');
  const kind = txt(payload.kind ?? 'percent', 'Type', { max: 10 });
  if (kind !== 'percent' && kind !== 'fixed') fail(422, 'Coupon type must be percent or fixed');
  const value =
    kind === 'percent'
      ? int(payload.value, 'Percentage', { min: 1, max: 100 })
      : money(payload.value, 'Amount', { min: 1 });
  return {
    code,
    kind,
    value,
    minSubtotalCents: money(payload.minSubtotal ?? 0, 'Minimum subtotal', { optional: true }),
    maxUses: int(payload.maxUses, 'Max uses', { optional: true, fallback: 0, min: 0, max: 1_000_000 }),
    active: bool(payload.active, true) ? 1 : 0,
    expiresAt: txt(payload.expiresAt, 'Expiry', { optional: true, max: 30 }) || null,
    description: txt(payload.description, 'Description', { optional: true, max: 160 }) || null,
  };
}

adminRoutes.post('/coupons', async (c) => {
  const values = couponValues(await body(c));
  const existing = await c.env.DB.prepare('SELECT id FROM coupons WHERE UPPER(code) = ?').bind(values.code).first();
  if (existing) fail(409, 'That promo code already exists');
  const created = await c.env.DB.prepare(
    `INSERT INTO coupons (code, kind, value, min_subtotal_cents, max_uses, active, expires_at, description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
  )
    .bind(values.code, values.kind, values.value, values.minSubtotalCents, values.maxUses, values.active, values.expiresAt, values.description)
    .first<{ id: number }>();
  return c.json({ id: created?.id, code: values.code }, 201);
});

adminRoutes.patch('/coupons/:id', async (c) => {
  const id = int(c.req.param('id'), 'Coupon', { min: 1 });
  const existing = await c.env.DB.prepare('SELECT * FROM coupons WHERE id = ?').bind(id).first<Record<string, unknown>>();
  if (!existing) fail(404, 'Coupon not found');
  const payload = await body(c);
  const values = couponValues({
    code: payload.code ?? existing.code,
    kind: payload.kind ?? existing.kind,
    value: payload.value ?? (existing.kind === 'percent' ? existing.value : Number(existing.value) / 100),
    minSubtotal: payload.minSubtotal ?? Number(existing.min_subtotal_cents) / 100,
    maxUses: payload.maxUses ?? existing.max_uses,
    active: payload.active ?? Number(existing.active) === 1,
    expiresAt: payload.expiresAt ?? existing.expires_at,
    description: payload.description ?? existing.description,
  });

  await c.env.DB.prepare(
    'UPDATE coupons SET code = ?, kind = ?, value = ?, min_subtotal_cents = ?, max_uses = ?, active = ?, expires_at = ?, description = ? WHERE id = ?',
  )
    .bind(
      values.code,
      values.kind,
      values.value,
      values.minSubtotalCents,
      values.maxUses,
      values.active,
      values.expiresAt,
      values.description,
      id,
    )
    .run();
  return c.json({ ok: true });
});

adminRoutes.delete('/coupons/:id', async (c) => {
  await c.env.DB.prepare('DELETE FROM coupons WHERE id = ?').bind(int(c.req.param('id'), 'Coupon', { min: 1 })).run();
  return c.json({ deleted: true });
});

adminRoutes.get('/reservations', async (c) => {
  const rows = await c.env.DB.prepare('SELECT * FROM reservations ORDER BY date DESC, time DESC LIMIT 200')
    .all<Record<string, unknown>>();
  return c.json({
    reservations: (rows.results ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      partySize: row.party_size,
      date: row.date,
      time: row.time,
      notes: row.notes,
      status: row.status,
      createdAt: row.created_at,
    })),
  });
});

adminRoutes.patch('/reservations/:id', async (c) => {
  const id = int(c.req.param('id'), 'Reservation', { min: 1 });
  const payload = await body(c);
  const status = txt(payload.status, 'Status', { max: 20 });
  if (!['pending', 'confirmed', 'seated', 'cancelled'].includes(status)) fail(422, 'Unknown reservation status');
  await c.env.DB.prepare('UPDATE reservations SET status = ? WHERE id = ?').bind(status, id).run();
  return c.json({ ok: true });
});

adminRoutes.get('/messages', async (c) => {
  const rows = await c.env.DB.prepare('SELECT * FROM messages ORDER BY id DESC LIMIT 200').all<Record<string, unknown>>();
  return c.json({
    messages: (rows.results ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      message: row.message,
      status: row.status,
      createdAt: row.created_at,
    })),
  });
});

adminRoutes.patch('/messages/:id', async (c) => {
  const id = int(c.req.param('id'), 'Message', { min: 1 });
  const payload = await body(c);
  const status = txt(payload.status, 'Status', { max: 20 });
  if (!['new', 'read', 'replied'].includes(status)) fail(422, 'Unknown message status');
  await c.env.DB.prepare('UPDATE messages SET status = ? WHERE id = ?').bind(status, id).run();
  return c.json({ ok: true });
});

adminRoutes.get('/inventory', async (c) => {
  const [products, log] = await Promise.all([
    c.env.DB.prepare('SELECT id, name, stock, low_stock_at, is_available, image FROM products ORDER BY stock ASC').all<Record<string, unknown>>(),
    c.env.DB.prepare(
      `SELECT l.*, p.name AS product_name FROM inventory_log l
        JOIN products p ON p.id = l.product_id
        ORDER BY l.id DESC LIMIT 40`,
    ).all<Record<string, unknown>>(),
  ]);
  return c.json({
    items: (products.results ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      image: row.image,
      stock: row.stock,
      lowStockAt: row.low_stock_at,
      available: Number(row.is_available) === 1,
    })),
    log: (log.results ?? []).map((row) => ({
      id: row.id,
      productName: row.product_name,
      delta: row.delta,
      reason: row.reason,
      createdAt: row.created_at,
    })),
  });
});

adminRoutes.post('/inventory/:id', async (c) => {
  const id = int(c.req.param('id'), 'Product', { min: 1 });
  const payload = await body(c);
  const product = await c.env.DB.prepare('SELECT id, stock FROM products WHERE id = ?').bind(id).first<{ id: number; stock: number }>();
  if (!product) fail(404, 'Product not found');

  const mode = txt(payload.mode ?? 'adjust', 'Mode', { max: 10 });
  const value = int(payload.value, 'Quantity', { min: 0, max: 100000 });
  const reason = txt(payload.reason, 'Reason', { optional: true, max: 120 }) || 'Manual adjustment';

  const nextStock = mode === 'set' ? value : Math.max(0, product.stock + value);
  const delta = nextStock - product.stock;

  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE products SET stock = ?, updated_at = datetime("now") WHERE id = ?').bind(nextStock, id),
    c.env.DB.prepare('INSERT INTO inventory_log (product_id, delta, reason) VALUES (?, ?, ?)').bind(id, delta, reason),
  ]);

  return c.json({ stock: nextStock, delta });
});

adminRoutes.get('/settings', async (c) => {
  const map = await settingsMap(c.env);
  return c.json({
    settings: publicSettings(map, c.env),
    adminDefaultPassword: map.admin_default_password === '1',
  });
});

adminRoutes.patch('/settings', async (c) => {
  const payload = await body(c);
  const updates: Array<[string, string]> = [];
  const map = await settingsMap(c.env);

  const textKeys: Array<[string, string, number]> = [
    ['phone', 'phone', 40],
    ['whatsapp', 'whatsapp', 30],
    ['email', 'email', 160],
    ['address', 'address', 200],
    ['city', 'city', 100],
    ['mapQuery', 'map_query', 200],
    ['prepTime', 'prep_time', 40],
    ['instagram', 'instagram', 300],
    ['tiktok', 'tiktok', 300],
    ['x', 'x', 300],
    ['currency', 'currency', 8],
  ];

  for (const [key, dbKey, max] of textKeys) {
    if (payload[key] === undefined) continue;
    updates.push([dbKey, txt(payload[key], key, { optional: true, max })]);
  }

  const moneyKeys: Array<[string, string]> = [
    ['deliveryFee', 'delivery_fee'],
    ['freeDeliveryThreshold', 'free_delivery_threshold'],
    ['minOrder', 'min_order'],
  ];
  for (const [key, dbKey] of moneyKeys) {
    if (payload[key] === undefined) continue;
    updates.push([dbKey, String(money(payload[key], key, { optional: true }))]);
  }

  if (payload.hours !== undefined) {
    if (!Array.isArray(payload.hours)) fail(422, 'Hours must be a list');
    const hours = payload.hours.slice(0, 7).map((entry) => {
      if (!entry || typeof entry !== 'object') fail(422, 'Each hours row needs a day and times');
      const row = entry as Record<string, unknown>;
      return {
        day: txt(row.day, 'Day', { min: 2, max: 40 }),
        open: txt(row.open, 'Opening time', { min: 3, max: 10 }),
        close: txt(row.close, 'Closing time', { min: 3, max: 10 }),
      };
    });
    updates.push(['hours', JSON.stringify(hours)]);
  }

  for (const [key, value] of updates) await setSetting(c.env, key, value);
  return c.json({ ok: true, settings: publicSettings({ ...map, ...Object.fromEntries(updates) }, c.env) });
});

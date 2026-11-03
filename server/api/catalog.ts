import { Hono } from 'hono';
import type { AppEnv, AddonRow, ProductRow, SizeRow } from '../types';
import { serializeProduct, type LinkedAddon, type OfferRow } from './serialize';
import { parseCart, priceCart, resolveCoupon } from '../pricing';
import { body, fail } from '../http';
import { settingsMap } from '../db';
import { stripeEnabled } from '../integrations';

export const catalogRoutes = new Hono<AppEnv>();

type Catalog = {
  categories: Array<{ id: number; slug: string; name: string; tagline: string | null }>;
  products: ReturnType<typeof serializeProduct>[];
  offers: OfferRow[];
};

async function loadCatalog(env: AppEnv['Bindings']): Promise<Catalog> {
  const [categories, products, sizes, addons, offers] = await Promise.all([
    env.DB.prepare('SELECT id, slug, name, tagline FROM categories ORDER BY sort, name').all<{
      id: number;
      slug: string;
      name: string;
      tagline: string | null;
    }>(),
    env.DB.prepare(
      `SELECT p.*, c.slug AS category_slug, c.name AS category_name
         FROM products p JOIN categories c ON c.id = p.category_id
        ORDER BY c.sort, p.sort, p.name`,
    ).all<ProductRow>(),
    env.DB.prepare('SELECT * FROM product_sizes ORDER BY sort').all<SizeRow>(),
    env.DB.prepare(
      `SELECT a.*, pa.product_id FROM addons a
         JOIN product_addons pa ON pa.addon_id = a.id
        WHERE a.is_active = 1
        ORDER BY a.sort`,
    ).all<LinkedAddon>(),
    env.DB.prepare('SELECT * FROM offers ORDER BY sort, id').all<OfferRow>(),
  ]);

  const offerRows = offers.results ?? [];
  const sizeRows = sizes.results ?? [];
  const addonRows = addons.results ?? [];

  return {
    categories: categories.results ?? [],
    products: (products.results ?? []).map((product) => serializeProduct(product, sizeRows, addonRows, offerRows)),
    offers: offerRows,
  };
}

export function publicSettings(map: Record<string, string>, env: AppEnv['Bindings']) {
  let hours: unknown = [];
  try {
    hours = JSON.parse(map.hours ?? '[]');
  } catch {
    hours = [];
  }
  return {
    name: map.restaurant_name ?? 'KOMANDRA',
    slogan: map.slogan ?? 'Taste The Komandra Experience.',
    sloganAr: map.slogan_ar ?? '',
    phone: map.phone ?? '',
    whatsapp: map.whatsapp ?? '',
    email: map.email ?? '',
    address: map.address ?? '',
    city: map.city ?? '',
    mapQuery: map.map_query ?? '',
    hours,
    deliveryFeeCents: Number(map.delivery_fee ?? 0),
    freeDeliveryThresholdCents: Number(map.free_delivery_threshold ?? 0),
    minOrderCents: Number(map.min_order ?? 0),
    prepTime: map.prep_time ?? '',
    instagram: map.instagram ?? '',
    tiktok: map.tiktok ?? '',
    x: map.x ?? '',
    currency: map.currency ?? 'SAR',
    cardPayments: stripeEnabled(env),
  };
}

catalogRoutes.get('/menu', async (c) => {
  const catalog = await loadCatalog(c.env);
  c.header('Cache-Control', 'no-store');
  return c.json({
    categories: catalog.categories,
    products: catalog.products,
  });
});

catalogRoutes.get('/offers', async (c) => {
  const catalog = await loadCatalog(c.env);
  const active = catalog.offers.filter((offer) => offer.active === 1);
  c.header('Cache-Control', 'no-store');
  return c.json({
    offers: active.map((offer) => {
      const product = catalog.products.find((item) => item.id === offer.product_id) ?? null;
      return {
        slug: offer.slug,
        title: offer.title,
        subtitle: offer.subtitle,
        originalCents: offer.original_cents,
        offerCents: offer.offer_cents,
        image: offer.image,
        badge: offer.badge,
        endsAt: offer.ends_at,
        product,
      };
    }),
  });
});

catalogRoutes.get('/products/:slug', async (c) => {
  const catalog = await loadCatalog(c.env);
  const product = catalog.products.find((item) => item.slug === c.req.param('slug'));
  if (!product) fail(404, 'That product could not be found');
  const related = catalog.products
    .filter((item) => item.category.slug === product.category.slug && item.id !== product.id)
    .slice(0, 3);
  return c.json({ product, related });
});

catalogRoutes.get('/settings', async (c) => {
  const map = await settingsMap(c.env);
  return c.json({ settings: publicSettings(map, c.env) });
});

catalogRoutes.post('/coupons/validate', async (c) => {
  const payload = await body(c);
  const items = parseCart(payload.items);
  const lines = await priceCart(c.env, items);
  const subtotalCents = lines.reduce((sum, line) => sum + line.totalCents, 0);
  const coupon = await resolveCoupon(c.env, typeof payload.code === 'string' ? payload.code : '', subtotalCents);
  if (!coupon) fail(422, 'Enter a promo code');
  return c.json({
    code: coupon.code,
    discountCents: coupon.discountCents,
    description: coupon.description,
    subtotalCents,
  });
});

catalogRoutes.get('/addons', async (c) => {
  const rows = await c.env.DB.prepare('SELECT * FROM addons WHERE is_active = 1 ORDER BY sort').all<AddonRow>();
  return c.json({ addons: rows.results ?? [] });
});

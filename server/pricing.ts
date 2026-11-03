import type { Env, ProductRow, SizeRow, AddonRow } from './types';
import { fail } from './http';

export type CartInput = {
  productId: number;
  qty: number;
  sizeId: number | null;
  addonIds: number[];
  offerSlug: string | null;
};

export type PricedLine = {
  productId: number;
  name: string;
  image: string;
  sizeId: number | null;
  sizeName: string | null;
  addonIds: number[];
  addonNames: string[];
  qty: number;
  unitPriceCents: number;
  totalCents: number;
  offerSlug: string | null;
};

export type CouponRow = {
  id: number;
  code: string;
  kind: 'percent' | 'fixed';
  value: number;
  min_subtotal_cents: number;
  max_uses: number;
  uses: number;
  active: number;
  expires_at: string | null;
  description: string | null;
};

function paymentNumber(value: unknown, label: string): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) fail(422, `${label} is invalid`);
  return n;
}

export function parseCart(value: unknown): CartInput[] {
  if (!Array.isArray(value) || value.length === 0) fail(422, 'Your cart is empty');
  if (value.length > 25) fail(422, 'That is too many items for one order');
  return value.map((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) fail(422, `Item ${index + 1} is invalid`);
    const row = entry as Record<string, unknown>;
    const productId = Math.round(paymentNumber(row.productId, `Item ${index + 1} product`));
    const qty = Math.round(paymentNumber(row.qty, `Item ${index + 1} quantity`));
    if (productId < 1) fail(422, `Item ${index + 1} product is invalid`);
    if (qty < 1 || qty > 20) fail(422, 'Quantities must be between 1 and 20');
    const rawAddons = Array.isArray(row.addonIds) ? row.addonIds : [];
    const addonIds = [...new Set(rawAddons.map((value) => Math.round(paymentNumber(value, 'Add-on'))))].filter((id) => id > 0).slice(0, 12);
    return {
      productId,
      qty,
      sizeId: row.sizeId === undefined || row.sizeId === null || row.sizeId === '' ? null : Math.round(paymentNumber(row.sizeId, 'Size')),
      addonIds,
      offerSlug: typeof row.offerSlug === 'string' && row.offerSlug.trim() ? row.offerSlug.trim() : null,
    };
  });
}

export async function priceCart(env: Env, items: CartInput[]): Promise<PricedLine[]> {
  const productIds = [...new Set(items.map((item) => item.productId))];
  const placeholders = productIds.map(() => '?').join(',');

  const products = await env.DB.prepare(
    `SELECT p.*, c.slug AS category_slug, c.name AS category_name
       FROM products p JOIN categories c ON c.id = p.category_id
      WHERE p.id IN (${placeholders})`,
  )
    .bind(...productIds)
    .all<ProductRow>();
  const productMap = new Map((products.results ?? []).map((row) => [row.id, row]));

  const sizes = await env.DB.prepare(`SELECT * FROM product_sizes WHERE product_id IN (${placeholders})`)
    .bind(...productIds)
    .all<SizeRow>();
  const sizesByProduct = new Map<number, SizeRow[]>();
  for (const size of sizes.results ?? []) {
    const list = sizesByProduct.get(size.product_id) ?? [];
    list.push(size);
    sizesByProduct.set(size.product_id, list);
  }

  const addons = await env.DB.prepare('SELECT * FROM addons WHERE is_active = 1').all<AddonRow>();
  const addonMap = new Map((addons.results ?? []).map((row) => [row.id, row]));

  const links = await env.DB.prepare(`SELECT * FROM product_addons WHERE product_id IN (${placeholders})`)
    .bind(...productIds)
    .all<{ product_id: number; addon_id: number }>();
  const allowed = new Map<number, Set<number>>();
  for (const link of links.results ?? []) {
    const set = allowed.get(link.product_id) ?? new Set<number>();
    set.add(link.addon_id);
    allowed.set(link.product_id, set);
  }

  const offers = await env.DB.prepare(
    "SELECT * FROM offers WHERE active = 1 AND (ends_at IS NULL OR ends_at > datetime('now'))",
  ).all<{ slug: string; product_id: number; offer_cents: number }>();
  const offerMap = new Map((offers.results ?? []).map((row) => [`${row.slug}:${row.product_id}`, row]));

  return items.map((item) => {
    const product = productMap.get(item.productId);
    if (!product) fail(422, 'One of the items is no longer on the menu');
    if (product.is_available !== 1) fail(422, `${product.name} is currently unavailable`);
    if (product.stock < item.qty) {
      fail(422, product.stock <= 0 ? `${product.name} is sold out` : `Only ${product.stock} × ${product.name} left`);
    }

    const productSizes = sizesByProduct.get(product.id) ?? [];
    let size: SizeRow | null = null;
    if (productSizes.length > 0) {
      if (item.sizeId) {
        size = productSizes.find((row) => row.id === item.sizeId) ?? null;
        if (!size) fail(422, `Selected size is not available for ${product.name}`);
      } else {
        size = productSizes.find((row) => row.is_default === 1) ?? productSizes[0];
      }
    }

    const productAllowed = allowed.get(product.id) ?? new Set<number>();
    const chosenAddons = item.addonIds.map((id) => {
      if (!productAllowed.has(id)) fail(422, `One of the extras is not available for ${product.name}`);
      const addon = addonMap.get(id);
      if (!addon) fail(422, 'One of the extras is no longer available');
      return addon;
    });

    let basePrice = product.price_cents;
    let offerSlug: string | null = null;
    if (item.offerSlug) {
      const offer = offerMap.get(`${item.offerSlug}:${product.id}`);
      if (!offer) fail(422, `The offer "${item.offerSlug}" is no longer available`);
      basePrice = offer.offer_cents;
      offerSlug = offer.slug;
    }

    if (size && size.price_delta_cents !== 0 && offerSlug) {
      // Offers already price the base product; size upgrades still apply.
    }

    const addonTotal = chosenAddons.reduce((sum, addon) => sum + addon.price_cents, 0);
    const unitPriceCents = basePrice + (size?.price_delta_cents ?? 0) + addonTotal;

    return {
      productId: product.id,
      name: product.name,
      image: product.image,
      sizeId: size?.id ?? null,
      sizeName: size?.name ?? null,
      addonIds: chosenAddons.map((addon) => addon.id),
      addonNames: chosenAddons.map((addon) => addon.name),
      qty: item.qty,
      unitPriceCents,
      totalCents: unitPriceCents * item.qty,
      offerSlug,
    };
  });
}

export type DiscountResult = { code: string; discountCents: number; description: string } | null;

export async function resolveCoupon(env: Env, code: string | null | undefined, subtotalCents: number): Promise<DiscountResult> {
  const clean = (code ?? '').trim().toUpperCase();
  if (!clean) return null;

  const coupon = await env.DB.prepare('SELECT * FROM coupons WHERE UPPER(code) = ?').bind(clean).first<CouponRow>();
  if (!coupon) fail(422, 'That promo code is not valid');
  if (coupon.active !== 1) fail(422, 'That promo code is no longer active');
  if (coupon.expires_at && new Date(coupon.expires_at.replace(' ', 'T') + 'Z').getTime() < Date.now()) {
    fail(422, 'That promo code has expired');
  }
  if (coupon.max_uses > 0 && coupon.uses >= coupon.max_uses) fail(422, 'That promo code has been fully redeemed');
  if (subtotalCents < coupon.min_subtotal_cents) {
    fail(422, `Spend at least ${(coupon.min_subtotal_cents / 100).toFixed(2)} to use ${coupon.code}`);
  }

  const raw = coupon.kind === 'percent' ? Math.round((subtotalCents * coupon.value) / 100) : coupon.value;
  const discountCents = Math.max(0, Math.min(raw, subtotalCents));
  return { code: coupon.code, discountCents, description: coupon.description ?? '' };
}

export function whatsappReceipt(input: {
  code: string;
  name: string;
  fulfillment: string;
  lines: PricedLine[];
  totalCents: number;
  currency: string;
  phone: string;
}): string {
  const rows = input.lines
    .map((line) => `• ${line.qty} × ${line.name}${line.sizeName ? ` (${line.sizeName})` : ''} — ${(line.totalCents / 100).toFixed(2)}`)
    .join('\n');
  return [
    `New KOMANDRA order ${input.code}`,
    `Customer: ${input.name}`,
    `Contact: ${input.phone}`,
    `Type: ${input.fulfillment}`,
    '',
    rows,
    '',
    `Total: ${(input.totalCents / 100).toFixed(2)} ${input.currency}`,
  ].join('\n');
}

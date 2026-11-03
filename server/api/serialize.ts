import type { AddonRow, ProductRow, SizeRow } from '../types';

export type LinkedAddon = AddonRow & { product_id: number };

export type OfferRow = {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  product_id: number | null;
  original_cents: number;
  offer_cents: number;
  image: string | null;
  badge: string | null;
  active: number;
  ends_at: string | null;
  sort: number;
};

export function parseIngredients(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export function serializeProduct(
  product: ProductRow,
  sizes: SizeRow[],
  addons: LinkedAddon[],
  offers: OfferRow[],
) {
  const offer = offers.find((row) => row.product_id === product.id && row.active === 1);
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    tagline: product.tagline ?? '',
    description: product.description ?? '',
    ingredients: parseIngredients(product.ingredients),
    priceCents: product.price_cents,
    compareAtCents: product.compare_at_cents,
    image: product.image,
    badge: product.badge,
    calories: product.calories,
    prepMinutes: product.prep_minutes,
    available: product.is_available === 1,
    stock: product.stock,
    lowStock: product.stock <= product.low_stock_at,
    featured: product.featured === 1,
    sort: product.sort,
    category: { id: product.category_id, slug: product.category_slug, name: product.category_name },
    sizes: sizes
      .filter((size) => size.product_id === product.id)
      .sort((a, b) => a.sort - b.sort)
      .map((size) => ({ id: size.id, name: size.name, priceDeltaCents: size.price_delta_cents, isDefault: size.is_default === 1 })),
    addons: addons
      .filter((addon) => addon.product_id === product.id)
      .map((addon) => ({ id: addon.id, name: addon.name, priceCents: addon.price_cents })),
    offer: offer
      ? { slug: offer.slug, title: offer.title, offerCents: offer.offer_cents, originalCents: offer.original_cents, badge: offer.badge }
      : null,
  };
}

export type PublicProduct = ReturnType<typeof serializeProduct>;

export function serializeOrder(row: Record<string, unknown>, items: unknown[], events: unknown[]) {
  return {
    code: row.code,
    status: row.status,
    fulfillment: row.fulfillment,
    customerName: row.customer_name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    notes: row.notes,
    subtotalCents: row.subtotal_cents,
    discountCents: row.discount_cents,
    deliveryFeeCents: row.delivery_fee_cents,
    totalCents: row.total_cents,
    couponCode: row.coupon_code,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: items.map((item) => {
      const line = item as Record<string, unknown>;
      return {
        name: line.name,
        image: line.image,
        sizeName: line.size_name,
        addonNames: line.addon_names,
        qty: line.qty,
        unitPriceCents: line.unit_price_cents,
        totalCents: line.total_cents,
      };
    }),
    events: events.map((event) => {
      const row2 = event as Record<string, unknown>;
      return { status: row2.status, note: row2.note, createdAt: row2.created_at };
    }),
  };
}

export type ProductSize = { id: number; name: string; priceDeltaCents: number; isDefault: boolean };
export type ProductAddon = { id: number; name: string; priceCents: number };

export type Product = {
  id: number;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  ingredients: string[];
  priceCents: number;
  compareAtCents: number | null;
  image: string;
  badge: string | null;
  calories: number | null;
  prepMinutes: number;
  available: boolean;
  stock: number;
  lowStock: boolean;
  featured: boolean;
  sort: number;
  category: { id: number; slug: string; name: string };
  sizes: ProductSize[];
  addons: ProductAddon[];
  offer: { slug: string; title: string; offerCents: number; originalCents: number; badge: string | null } | null;
};

export type Category = { id: number; slug: string; name: string; tagline: string | null };

export type Offer = {
  slug: string;
  title: string;
  subtitle: string | null;
  originalCents: number;
  offerCents: number;
  image: string | null;
  badge: string | null;
  endsAt: string | null;
  product: Product | null;
};

export type OpeningHours = { day: string; open: string; close: string };

export type Settings = {
  name: string;
  slogan: string;
  sloganAr: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  city: string;
  mapQuery: string;
  hours: OpeningHours[];
  deliveryFeeCents: number;
  freeDeliveryThresholdCents: number;
  minOrderCents: number;
  prepTime: string;
  instagram: string;
  tiktok: string;
  x: string;
  currency: string;
  cardPayments: boolean;
};

export type User = { id: number; name: string; email: string; phone: string | null; role: 'admin' | 'customer' };

export type Address = {
  id: number;
  label: string;
  line1: string;
  line2: string | null;
  city: string;
  notes: string | null;
  isDefault: boolean;
};

export type OrderItem = {
  name: string;
  image: string | null;
  sizeName: string | null;
  addonNames: string | null;
  qty: number;
  unitPriceCents: number;
  totalCents: number;
};

export type Order = {
  code: string;
  status: string;
  fulfillment: 'delivery' | 'pickup';
  customerName: string;
  phone: string;
  email: string | null;
  address: string | null;
  notes: string | null;
  subtotalCents: number;
  discountCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  couponCode: string | null;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  events: Array<{ status: string; note: string | null; createdAt: string }>;
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has('content-type')) headers.set('content-type', 'application/json');

  let response: Response;
  try {
    response = await fetch(`/api${path}`, { ...init, headers, credentials: 'same-origin' });
  } catch {
    throw new ApiError(0, 'Network unavailable. Check your connection and try again.');
  }

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string'
        ? (data as { error: string }).error
        : 'Something went wrong. Please try again.';
    throw new ApiError(response.status, message);
  }

  return data as T;
}

export const getMenu = () => api<{ categories: Category[]; products: Product[] }>('/menu');
export const getProduct = (slug: string) => api<{ product: Product; related: Product[] }>(`/products/${encodeURIComponent(slug)}`);
export const getOffers = () => api<{ offers: Offer[] }>('/offers');
export const getSettings = () => api<{ settings: Settings }>('/settings');
export const getOrder = (code: string) => api<{ order: Order; whatsappUrl: string }>(`/orders/${encodeURIComponent(code)}`);
export const getMyOrders = () => api<{ orders: Order[] }>('/orders/mine');

export async function getSession() {
  return api<{ user: User | null; addresses: Address[]; stats: { orders: number; spentCents: number } }>('/auth/me');
}

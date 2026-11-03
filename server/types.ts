import type { Context } from 'hono';

export type Env = {
  DB: D1Database;
  ASSETS: Fetcher;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
  STRIPE_SECRET_KEY?: string;
  WHATSAPP_TOKEN?: string;
  WHATSAPP_PHONE_ID?: string;
  PUBLIC_ORIGIN?: string;
};

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: 'admin' | 'customer';
};

export type AppEnv = {
  Bindings: Env;
  Variables: {
    user: SessionUser | null;
  };
};

export type AppContext = Context<AppEnv>;

export type ProductRow = {
  id: number;
  slug: string;
  name: string;
  category_id: number;
  category_slug: string;
  category_name: string;
  tagline: string | null;
  description: string | null;
  ingredients: string;
  price_cents: number;
  compare_at_cents: number | null;
  image: string;
  badge: string | null;
  calories: number | null;
  prep_minutes: number;
  is_available: number;
  stock: number;
  low_stock_at: number;
  featured: number;
  sort: number;
};

export type AddonRow = {
  id: number;
  name: string;
  price_cents: number;
  is_active: number;
  sort: number;
};

export type SizeRow = {
  id: number;
  product_id: number;
  name: string;
  price_delta_cents: number;
  is_default: number;
  sort: number;
};

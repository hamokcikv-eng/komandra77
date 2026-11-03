import type { Env } from './types';
import { hashPassword } from './auth';

const CATEGORIES = [
  { slug: 'burgers', name: 'Burgers', tagline: 'Flame-grilled, hand-pressed, unrestrained', sort: 1 },
  { slug: 'chicken', name: 'Chicken', tagline: 'Buttermilk-brined, double-crusted', sort: 2 },
  { slug: 'fries', name: 'Fries', tagline: 'Cut daily, finished in beef tallow', sort: 3 },
  { slug: 'meals', name: 'Meals', tagline: 'The full Komandra arc', sort: 4 },
  { slug: 'drinks', name: 'Drinks', tagline: 'Cold, dark, necessary', sort: 5 },
];

type SeedProduct = {
  slug: string;
  name: string;
  category: string;
  price: number;
  compareAt?: number;
  image: string;
  badge?: string;
  tagline: string;
  description: string;
  ingredients: string[];
  calories: number;
  prep: number;
  featured?: boolean;
  stock?: number;
  sort: number;
};

const PRODUCTS: SeedProduct[] = [
  {
    slug: 'signature-komandra-burger',
    name: 'Signature Komandra Burger',
    category: 'burgers',
    price: 4200,
    image: '/img/signature-burger.jpg',
    badge: 'Signature',
    tagline: 'The one that started the whole thing.',
    description:
      'A 180g hand-pressed beef patty seared over open flame, folded into a toasted brioche bun with aged cheddar, sweet onion, house pickles and our smoked Komandra sauce. Built to be eaten with both hands and no distractions.',
    ingredients: ['180g flame-grilled beef', 'Aged cheddar', 'Toasted brioche', 'Komandra sauce', 'Sweet onion', 'House pickles', 'Butter lettuce'],
    calories: 780,
    prep: 18,
    featured: true,
    stock: 120,
    sort: 1,
  },
  {
    slug: 'double-cheese-burger',
    name: 'Double Cheese Burger',
    category: 'burgers',
    price: 4800,
    compareAt: 5400,
    image: '/img/double-cheese.jpg',
    badge: 'Best Seller',
    tagline: 'Twice the patty. None of the apology.',
    description:
      'Two smashed beef patties with double aged cheddar, caramelised onion and a slow burn chilli aioli. A heavier, richer cut of the Komandra signature — engineered for the seriously hungry.',
    ingredients: ['2 × 120g smashed beef', 'Double aged cheddar', 'Caramelised onion', 'Chilli aioli', 'Brioche bun'],
    calories: 960,
    prep: 20,
    featured: true,
    stock: 100,
    sort: 2,
  },
  {
    slug: 'crispy-chicken',
    name: 'Crispy Chicken',
    category: 'chicken',
    price: 3800,
    image: '/img/crispy-chicken.jpg',
    tagline: 'Brined for 24 hours. Fried in seconds.',
    description:
      'Buttermilk-brined chicken thigh in a double crust, stacked with slaw, pickles and honey-chilli glaze. Shatteringly crisp on the outside, unreasonably soft in the middle.',
    ingredients: ['Buttermilk-brined chicken thigh', 'Double crust', 'Honey-chilli glaze', 'Slaw', 'Pickles', 'Brioche bun'],
    calories: 720,
    prep: 16,
    stock: 90,
    sort: 3,
  },
  {
    slug: 'loaded-fries',
    name: 'Loaded Fries',
    category: 'fries',
    price: 2600,
    image: '/img/loaded-fries.jpg',
    tagline: 'A side that refuses to stay a side.',
    description:
      'Hand-cut fries buried under melted cheddar, smoked beef brisket crumbs, jalapeños and a stripe of Komandra sauce. Served in a paper-lined basket, meant for the middle of the table.',
    ingredients: ['Hand-cut fries', 'Melted cheddar', 'Smoked brisket crumbs', 'Jalapeños', 'Komandra sauce', 'Spring onion'],
    calories: 640,
    prep: 12,
    stock: 140,
    sort: 4,
  },
  {
    slug: 'golden-cheddar-fries',
    name: 'Golden Cheddar Fries',
    category: 'fries',
    price: 2900,
    image: '/img/cheddar-fries.jpg',
    tagline: 'Gold, in edible form.',
    description:
      'Twice-fried potatoes finished in beef tallow, dusted with cheddar gold and sea salt, served with a warm cheddar dip. Minimal ingredients, maximum consequence.',
    ingredients: ['Twice-fried potatoes', 'Beef tallow', 'Cheddar gold dust', 'Sea salt', 'Warm cheddar dip'],
    calories: 520,
    prep: 10,
    stock: 150,
    sort: 5,
  },
  {
    slug: 'special-komandra-meal',
    name: 'Special Komandra Meal',
    category: 'meals',
    price: 6500,
    compareAt: 7800,
    image: '/img/special-meal.jpg',
    badge: 'The Full Arc',
    tagline: 'The whole experience, on one tray.',
    description:
      'The Signature burger, a full portion of loaded fries and an iced drink, composed as one meal. This is the fastest way to understand what Komandra is about.',
    ingredients: ['Signature Komandra Burger', 'Loaded Fries', 'Iced house drink', 'Komandra sauce pot'],
    calories: 1480,
    prep: 22,
    featured: true,
    stock: 80,
    sort: 6,
  },
  {
    slug: 'smoky-hot-chicken',
    name: 'Smoky Hot Chicken',
    category: 'chicken',
    price: 4100,
    image: '/img/hot-chicken.jpg',
    tagline: 'Slow smoke. Sudden heat.',
    description:
      'Smoked chicken pieces glazed in fermented chilli butter, finished with lime salt and served with a cooling ranch dip. Heat that builds instead of shouting.',
    ingredients: ['Smoked chicken', 'Fermented chilli butter', 'Lime salt', 'Ranch dip', 'Pickled slaw'],
    calories: 690,
    prep: 20,
    stock: 70,
    sort: 7,
  },
  {
    slug: 'komandra-sliders',
    name: 'Komandra Sliders',
    category: 'burgers',
    price: 3400,
    image: '/img/sliders.jpg',
    tagline: 'Small format. Same philosophy.',
    description:
      'Two miniature beef sliders with cheddar, pickles and Komandra sauce on milk buns. Designed for sharing, usually not shared.',
    ingredients: ['2 × beef slider', 'Cheddar', 'Pickles', 'Komandra sauce', 'Milk buns'],
    calories: 560,
    prep: 14,
    stock: 110,
    sort: 8,
  },
  {
    slug: 'nebula-shake',
    name: 'Nebula Shake',
    category: 'drinks',
    price: 2200,
    image: '/img/milkshake.jpg',
    tagline: 'Cold, dense, quietly dramatic.',
    description:
      'Hand-spun vanilla bean ice cream with burnt caramel and a pinch of sea salt, finished with cocoa dust. Thick enough to require commitment.',
    ingredients: ['Vanilla bean ice cream', 'Burnt caramel', 'Sea salt', 'Cocoa dust', 'Whole milk'],
    calories: 480,
    prep: 8,
    stock: 200,
    sort: 9,
  },
];

const SIZES: Record<string, Array<[string, number, number]>> = {
  'signature-komandra-burger': [['Regular', 0, 1], ['Large', 700, 0]],
  'double-cheese-burger': [['Regular', 0, 1], ['Large', 700, 0]],
  'crispy-chicken': [['Regular', 0, 1], ['Large', 700, 0]],
  'loaded-fries': [['Regular', 0, 1], ['Sharing', 900, 0]],
  'golden-cheddar-fries': [['Regular', 0, 1], ['Sharing', 900, 0]],
  'special-komandra-meal': [['Solo', 0, 1], ['For Two', 2900, 0]],
  'smoky-hot-chicken': [['Regular', 0, 1], ['Large', 700, 0]],
  'komandra-sliders': [['Duo', 0, 1], ['Trio', 1200, 0]],
  'nebula-shake': [['Regular', 0, 1], ['Large', 500, 0]],
};

const ADDONS: Array<[string, number]> = [
  ['Extra Cheddar', 400],
  ['Crispy Bacon', 500],
  ['Jalapeños', 250],
  ['Komandra Sauce', 200],
  ['Extra Patty', 1200],
  ['Cheddar Dip', 300],
  ['Grilled Onions', 250],
];

const PRODUCT_ADDONS: Record<string, string[]> = {
  'signature-komandra-burger': ['Extra Cheddar', 'Crispy Bacon', 'Jalapeños', 'Komandra Sauce', 'Extra Patty', 'Grilled Onions'],
  'double-cheese-burger': ['Extra Cheddar', 'Crispy Bacon', 'Jalapeños', 'Komandra Sauce', 'Extra Patty'],
  'crispy-chicken': ['Extra Cheddar', 'Jalapeños', 'Komandra Sauce', 'Cheddar Dip', 'Grilled Onions'],
  'loaded-fries': ['Extra Cheddar', 'Cheddar Dip', 'Jalapeños', 'Komandra Sauce'],
  'golden-cheddar-fries': ['Cheddar Dip', 'Extra Cheddar', 'Jalapeños'],
  'special-komandra-meal': ['Extra Patty', 'Crispy Bacon', 'Cheddar Dip', 'Komandra Sauce'],
  'smoky-hot-chicken': ['Cheddar Dip', 'Jalapeños', 'Komandra Sauce'],
  'komandra-sliders': ['Extra Cheddar', 'Crispy Bacon', 'Komandra Sauce'],
  'nebula-shake': ['Crispy Bacon'],
};

const SETTINGS: Record<string, string> = {
  restaurant_name: 'KOMANDRA',
  slogan: 'Taste The Komandra Experience.',
  slogan_ar: 'أكلك المفضل... بطريقة مختلفة.',
  phone: '+966 55 812 4091',
  whatsapp: '966558124091',
  email: 'hello@komandra.com',
  address: 'KAFD, King Fahd Road, Riyadh',
  city: 'Riyadh, Saudi Arabia',
  map_query: 'KAFD Riyadh Saudi Arabia',
  hours: JSON.stringify([
    { day: 'Sunday — Thursday', open: '12:00', close: '02:00' },
    { day: 'Friday — Saturday', open: '13:00', close: '03:00' },
  ]),
  delivery_fee: '1500',
  free_delivery_threshold: '12000',
  min_order: '3000',
  prep_time: '25 — 35 min',
  instagram: 'https://instagram.com/',
  tiktok: 'https://tiktok.com/',
  x: 'https://x.com/',
  currency: 'SAR',
  admin_default_password: '1',
};

export async function seedDatabase(env: Env): Promise<void> {
  const db = env.DB;

  const existing = await db.prepare('SELECT COUNT(*) AS n FROM products').first<{ n: number }>();
  if ((existing?.n ?? 0) > 0) return;

  await db.batch(
    Object.entries(SETTINGS).map(([key, value]) =>
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').bind(key, value),
    ),
  );

  for (const category of CATEGORIES) {
    await db
      .prepare('INSERT OR IGNORE INTO categories (slug, name, tagline, sort) VALUES (?, ?, ?, ?)')
      .bind(category.slug, category.name, category.tagline, category.sort)
      .run();
  }

  const categories = await db.prepare('SELECT id, slug FROM categories').all<{ id: number; slug: string }>();
  const categoryIds = new Map((categories.results ?? []).map((row) => [row.slug, row.id]));

  for (const product of PRODUCTS) {
    const categoryId = categoryIds.get(product.category);
    if (!categoryId) continue;
    await db
      .prepare(
        `INSERT OR IGNORE INTO products
          (slug, name, category_id, tagline, description, ingredients, price_cents, compare_at_cents,
           image, badge, calories, prep_minutes, is_available, stock, low_stock_at, featured, sort)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 10, ?, ?)`,
      )
      .bind(
        product.slug,
        product.name,
        categoryId,
        product.tagline,
        product.description,
        JSON.stringify(product.ingredients),
        product.price,
        product.compareAt ?? null,
        product.image,
        product.badge ?? null,
        product.calories,
        product.prep,
        product.stock ?? 100,
        product.featured ? 1 : 0,
        product.sort,
      )
      .run();
  }

  const products = await db.prepare('SELECT id, slug FROM products').all<{ id: number; slug: string }>();
  const productIds = new Map((products.results ?? []).map((row) => [row.slug, row.id]));

  for (const [slug, sizes] of Object.entries(SIZES)) {
    const productId = productIds.get(slug);
    if (!productId) continue;
    for (let i = 0; i < sizes.length; i += 1) {
      const [name, delta, isDefault] = sizes[i];
      await db
        .prepare('INSERT INTO product_sizes (product_id, name, price_delta_cents, is_default, sort) VALUES (?, ?, ?, ?, ?)')
        .bind(productId, name, delta, isDefault, i)
        .run();
    }
  }

  const addonIds = new Map<string, number>();
  for (let i = 0; i < ADDONS.length; i += 1) {
    const [name, price] = ADDONS[i];
    const result = await db
      .prepare('INSERT INTO addons (name, price_cents, is_active, sort) VALUES (?, ?, 1, ?) RETURNING id')
      .bind(name, price, i)
      .first<{ id: number }>();
    if (result) addonIds.set(name, result.id);
  }

  for (const [slug, names] of Object.entries(PRODUCT_ADDONS)) {
    const productId = productIds.get(slug);
    if (!productId) continue;
    for (const name of names) {
      const addonId = addonIds.get(name);
      if (!addonId) continue;
      await db.prepare('INSERT OR IGNORE INTO product_addons (product_id, addon_id) VALUES (?, ?)').bind(productId, addonId).run();
    }
  }

  const signature = productIds.get('signature-komandra-burger');
  const doubleCheese = productIds.get('double-cheese-burger');
  const crispy = productIds.get('crispy-chicken');
  const meal = productIds.get('special-komandra-meal');

  const offers: Array<[string, string, string, number | undefined, number, number, string, string, number]> = [
    ['double-stack', 'The Double Stack', 'Two patties. One decision.', doubleCheese, 5400, 3800, '/img/double-cheese.jpg', 'Limited', 1],
    ['meal-for-two', 'Meal For Two', 'Signature burgers, loaded fries, two drinks.', meal, 13000, 9400, '/img/special-meal.jpg', 'Save 28%', 2],
    ['chicken-hour', 'Chicken Hour', 'Crispy Chicken at a softer price, 4–6pm.', crispy, 3800, 2900, '/img/crispy-chicken.jpg', '4–6 PM', 3],
  ];

  const offerStatements = offers
    .filter(([, , , productId]) => Boolean(productId))
    .map(([slug, title, subtitle, productId, original, discount, image, badge, sort]) =>
      db
        .prepare(
          'INSERT INTO offers (slug, title, subtitle, product_id, original_cents, offer_cents, image, badge, active, sort) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)',
        )
        .bind(slug, title, subtitle, productId, original, discount, image, badge, sort),
    );
  if (offerStatements.length) await db.batch(offerStatements);

  await db.batch([
    db
      .prepare(
        "INSERT INTO coupons (code, kind, value, min_subtotal_cents, max_uses, uses, active, description) VALUES ('KOMANDRA10', 'percent', 10, 5000, 1000, 0, 1, '10% off orders above SAR 50')",
      ),
    db
      .prepare(
        "INSERT INTO coupons (code, kind, value, min_subtotal_cents, max_uses, uses, active, description) VALUES ('WELCOME15', 'fixed', 1500, 8000, 500, 0, 1, 'SAR 15 off orders above SAR 80')",
      ),
  ]);

  const adminEmail = (env.ADMIN_EMAIL ?? 'admin@komandra.com').trim().toLowerCase();
  const adminPassword = env.ADMIN_PASSWORD ?? 'Komandra#2026';
  const adminCount = await db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'").first<{ n: number }>();

  if ((adminCount?.n ?? 0) === 0) {
    const passwordHash = await hashPassword(adminPassword);
    await db
      .prepare('INSERT OR IGNORE INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)')
      .bind('Komandra Admin', adminEmail, SETTINGS.phone, passwordHash, 'admin')
      .run();
    if (!env.ADMIN_PASSWORD) {
      await db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('admin_default_password', '1')").run();
    }
  }

  void signature;
}

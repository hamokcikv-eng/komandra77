import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE = process.env.BASE ?? 'http://127.0.0.1:8787';
await mkdir('artifacts', { recursive: true });

const browser = await chromium.launch();
const issues = [];

async function newPage(viewport, options = {}) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    reducedMotion: options.reducedMotion ?? 'reduce',
    hasTouch: options.hasTouch ?? false,
  });
  const page = await context.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error') issues.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => issues.push(`pageerror: ${error.message}`));
  page.on('requestfailed', (request) => issues.push(`failed: ${request.url()} ${request.failure()?.errorText}`));
  return { context, page };
}

async function settle(page) {
  await page.evaluate(async () => {
    try {
      await document.fonts.ready;
    } catch {
      /* ignore */
    }
  });
  await page.evaluate(async () => {
    const step = Math.floor(window.innerHeight * 0.75);
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(450);
}

async function shoot(page, path, name, fullPage = true) {
  await settle(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  const height = await page.evaluate(() => document.body.scrollHeight);
  if (overflow > 2) issues.push(`${name}: horizontal overflow ${overflow}px`);
  await page.screenshot({ path: `artifacts/${path}`, fullPage });
  console.log(`${name}: height=${height} overflow=${overflow}`);
}

// Desktop
{
  const { context, page } = await newPage({ width: 1440, height: 900 }, { reducedMotion: 'no-preference' });
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await settle(page);
  await page.screenshot({ path: 'artifacts/home-hero.png' });
  await shoot(page, 'home.png', 'home');
  await page.goto(`${BASE}/menu`, { waitUntil: 'networkidle' });
  await shoot(page, 'menu.png', 'menu');
  await page.goto(`${BASE}/menu/signature-komandra-burger`, { waitUntil: 'networkidle' });
  await shoot(page, 'product.png', 'product');
  await page.goto(`${BASE}/offers`, { waitUntil: 'networkidle' });
  await shoot(page, 'offers.png', 'offers');
  await page.goto(`${BASE}/contact`, { waitUntil: 'networkidle' });
  await shoot(page, 'contact.png', 'contact');

  await page.addInitScript(() => {
    localStorage.setItem(
      'komandra.cart.v1',
      JSON.stringify([
        {
          key: '1:1:2-8:',
          productId: 1,
          slug: 'signature-komandra-burger',
          name: 'Signature Komandra Burger',
          image: '/img/signature-burger.jpg',
          sizeId: 1,
          sizeName: 'Large',
          addonIds: [2, 8],
          addonNames: ['Extra Cheddar', 'Komandra Sauce'],
          unitPriceCents: 4800,
          qty: 2,
          offerSlug: null,
        },
        {
          key: '4:0::',
          productId: 4,
          slug: 'loaded-fries',
          name: 'Loaded Fries',
          image: '/img/loaded-fries.jpg',
          sizeId: null,
          sizeName: null,
          addonIds: [],
          addonNames: [],
          unitPriceCents: 2600,
          qty: 1,
          offerSlug: null,
        },
      ]),
    );
  });
  await page.goto(`${BASE}/checkout`, { waitUntil: 'networkidle' });
  await shoot(page, 'checkout.png', 'checkout');

  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
  await page.fill('#admin-email', 'admin@komandra.com');
  await page.fill('#admin-password', 'Komandra#2026');
  await page.click('button[type="submit"]');
  await page.waitForSelector('text=Revenue · last 14 days', { timeout: 20000 });
  await shoot(page, 'admin-dashboard.png', 'admin-dashboard');
  await context.close();
}

// Mobile
{
  const { context, page } = await newPage({ width: 390, height: 844 }, { hasTouch: true });
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await settle(page);
  await page.screenshot({ path: 'artifacts/mobile-hero.png' });
  await shoot(page, 'mobile-home.png', 'mobile-home');
  await page.goto(`${BASE}/menu`, { waitUntil: 'networkidle' });
  await shoot(page, 'mobile-menu.png', 'mobile-menu');
  await page.goto(`${BASE}/menu/signature-komandra-burger`, { waitUntil: 'networkidle' });
  await shoot(page, 'mobile-product.png', 'mobile-product');
  await context.close();
}

await browser.close();
console.log(issues.length ? `\nISSUES:\n${[...new Set(issues)].join('\n')}` : '\nNo console or layout issues detected.');

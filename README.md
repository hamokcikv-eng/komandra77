# KOMANDRA

A production-quality restaurant ordering platform with a cinematic, editorial front end. Premium fast food, built as a real commerce system: live menu, cart, checkout, accounts, order tracking, offers, reservations, WhatsApp handoff and a full admin dashboard backed by a relational database.

**Brand:** Taste The Komandra Experience. · أكلك المفضل... بطريقة مختلفة.

---

## Stack

| Layer | Choice |
| --- | --- |
| Front end | React 19 + TypeScript + Vite (SPA) |
| API | Hono on a Cloudflare Worker |
| Database | Cloudflare D1 (SQLite), relational schema |
| Auth | First-party cookie sessions, PBKDF2-SHA256 password hashing (WebCrypto) |
| Payments | Cash on delivery/pickup by default; Stripe-hosted Checkout when configured (no card data ever touches the app) |
| Styling | Hand-written CSS design system (no UI framework) — self-hosted fonts |
| Deploy | Worker + static assets (`dist/deploy.json` manifest), D1 binding `DB` |

Everything is server-authoritative: prices, add-ons, offers, coupons, stock and totals are recalculated in the API on every order. The browser cart is only a convenience copy.

---

## Run locally

```bash
npm install
npm run build          # builds the SPA into dist/client, bundles the Worker into dist/worker.js
npx wrangler dev --port 8787 --ip 0.0.0.0
```

Open http://localhost:8787.

The Worker bootstraps the database on first request: it applies `server/schema.sql` and seeds the full menu, categories, sizes, add-ons, offers, coupons, settings and the admin account — all idempotently (`meta.seeded` guard).

Useful scripts:

```bash
npm run dev            # Vite only (UI work; API routes need the Worker)
npm run typecheck      # client + worker TypeScript
npm run build          # production bundle
node scripts/smoke.mjs # end-to-end API checks against a running Worker
node scripts/shots.mjs # Playwright screenshots of key screens (dev only)
```

Local D1 data lives in `.wrangler/state`. Delete that folder to reset to a freshly seeded database.

---

## Admin dashboard

- URL: `/admin`
- Default account: `admin@komandra.com` / `Komandra#2026`

**Change this password immediately** from Account → Profile → Change password. The dashboard shows a warning until the seeded password is replaced, and clears it automatically.

Capabilities: revenue/order analytics (14-day series, AOV, top dishes), order queue with status timeline and notes, product & category CRUD, portion sizes, add-ons, offers, promo codes, live inventory with adjustment log, reservations, contact inbox, and store settings (hours, fees, contact details, social links).

Inventory decrements automatically on every order and restores on cancellation (customer or admin).

---

## Configuration

Set these as Worker secrets/variables for production. None are required to run locally.

| Variable | Purpose |
| --- | --- |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Used only during first seed to create the admin account |
| `STRIPE_SECRET_KEY` | Enables "Card — secure hosted checkout". Without it the option is hidden and the API refuses card orders |
| `WHATSAPP_TOKEN` / `WHATSAPP_PHONE_ID` | Optional WhatsApp Cloud API push for new orders (order still opens a prefilled `wa.me` handoff without it) |
| `PUBLIC_ORIGIN` | Optional canonical origin override |

`STRIPE_SECRET_KEY` is read server-side only. The checkout flow redirects to Stripe and confirms payment by retrieving the session server-side (`POST /api/orders/:code/verify-payment`) — the app stores a payment reference and status, never card data.

Restaurant details, delivery fee, free-delivery threshold, minimum order, opening hours and social links are editable in Admin → Settings (database-backed).

---

## API surface

Public: `GET /api/menu`, `/api/products/:slug`, `/api/offers`, `/api/settings`, `POST /api/coupons/validate`, `/api/orders`, `/api/orders/:code`, `/api/orders/:code/verify-payment`, `/api/reservations`, `/api/contact`, `/api/health`.

Auth: `POST /api/auth/register|login|logout`, `GET/PATCH /api/auth/me`, `POST /api/auth/password`, `GET/POST /api/addresses`.

Admin (role-gated): `/api/admin/stats|products|categories|addons|orders|offers|coupons|inventory|reservations|messages|settings`.

Security: server-side pricing, parameterised SQL, PBKDF2 password hashing, HttpOnly SameSite cookies, same-origin enforcement on all mutations, throttled login/registration, security headers, no card data storage, opaque order references.

---

## Deploying

The build emits `dist/deploy.json`:

```json
{
  "entrypoint": "worker.js",
  "compatibilityDate": "2026-10-01",
  "modules": [{ "name": "worker.js", "type": "esm", "path": "./worker.js" }],
  "assetsDirectory": "./client",
  "spa": true
}
```

Provision a D1 database and bind it as `DB`, then deploy the manifest. The schema self-applies on the first request; no manual migration step is required.

Update `public/sitemap.xml` and the canonical/OG URLs in `index.html` if the production domain differs from `komandra.com`.

---

## Project layout

```
server/            Worker entry, schema, seed, auth, pricing, routes
  api/             catalog, auth, orders, public, admin route groups
src/               React app
  components/      shell, cart drawer, editorial menu, dialogs, particles
  pages/           home, menu, product, offers, story, checkout, tracking, account…
  admin/           dashboard, menu, orders, marketing, operations
  store/           cart, auth, settings, UI contexts
  styles/          design system + self-hosted @font-face rules
public/img         optimized food photography (700/1400 variants)
public/fonts       self-hosted WOFF2 subsets
scripts/           worker build, API smoke test, screenshot harness
```

## Credits

Photography: Unsplash (licensed for commercial use). Typefaces: Inter Tight, Instrument Serif, JetBrains Mono, Noto Sans Arabic (SIL Open Font License), self-hosted.

## Notes / limits

- Card payments require a Stripe secret key; until then the site correctly offers cash only.
- WhatsApp Cloud API push is optional; the order confirmation always includes a prefilled WhatsApp handoff for manual dispatch.
- Email delivery of receipts is intentionally not mocked — the receipt is shown on the order page and included in the WhatsApp message.

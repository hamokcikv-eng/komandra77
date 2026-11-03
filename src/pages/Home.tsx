import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMenu, getOffers, type Offer, type Product } from '../lib/api';
import { formatMoney } from '../lib/format';
import { usePageMeta } from '../lib/seo';
import { useSettings } from '../store/SettingsContext';
import { useUI } from '../store/UIContext';
import { ArrowRight, ArrowUpRight, Check, Star } from '../components/Icons';
import { EditorialMenu } from '../components/EditorialMenu';
import { Magnetic, ProductImage, Reveal, SectionHead, Spinner } from '../components/ui';
import { Particles } from '../components/Particles';

const MARQUEE = [
  'Flame-grilled daily',
  '100% halal beef',
  'Hand-cut fries',
  'Built to order',
  'Riyadh · KAFD',
  'Open till 02:00',
];

const PILLARS = [
  {
    number: '01',
    title: 'Quality Ingredients',
    image: '/img/story-seeds.jpg',
    alt: 'Sesame seeds scattered across a dark surface beside a burger',
    body: [
      'We buy short lists. Beef with a known origin, aged cheddar, brioche baked each morning and produce delivered before service.',
      'Nothing is frozen twice. Nothing sits under a lamp waiting for you.',
    ],
  },
  {
    number: '02',
    title: 'Extraordinary Flavor',
    image: '/img/story-burger.jpg',
    alt: 'Burger with melted cheese under cinematic light',
    body: [
      'Every build starts with a flavour thesis: smoke, acid, fat, heat. Our signature sauce is fermented for three days; the pickles are brined in-house.',
      'The result is familiar enough to crave, distinct enough to remember.',
    ],
  },
  {
    number: '03',
    title: 'A Different Experience',
    image: '/img/story-tray.jpg',
    alt: 'Burgers and loaded fries arranged on a tray',
    body: [
      'Order from your phone, watch the kitchen move in real time, and collect something that still steams when it reaches you.',
      'Fast food, without the feeling of a drive-through. This is the Komandra difference.',
    ],
  },
];

export function Home() {
  usePageMeta(
    '',
    'KOMANDRA is a futuristic premium fast food house in Riyadh. Flame-grilled burgers, double-crusted chicken and hand-cut fries — order delivery or pickup.',
  );
  const { settings } = useSettings();
  const { openContact } = useUI();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [failed, setFailed] = useState(false);
  const giantRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([getMenu(), getOffers()])
      .then(([menu, offerData]) => {
        if (!alive) return;
        setProducts(menu.products);
        setOffers(offerData.offers);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const offset = Math.min(window.scrollY, 900);
        if (giantRef.current) giantRef.current.style.transform = `translateX(-50%) translateY(${offset * 0.12}px)`;
        if (glowRef.current) glowRef.current.style.transform = `translateY(${offset * -0.07}px)`;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const featured = (products ?? []).filter((product) => product.featured).slice(0, 4);
  const selection = featured.length > 0 ? featured : (products ?? []).slice(0, 4);
  const previewOffers = (offers ?? []).slice(0, 3);

  return (
    <>
      <section className="hero">
        <div className="hero__atmosphere" aria-hidden="true" />
        <div className="hero__grid" aria-hidden="true" />
        <div className="hero__horizon" aria-hidden="true" />
        <div className="hero__noise" aria-hidden="true" />
        <Particles />
        <div className="hero__giant" aria-hidden="true" ref={giantRef}>
          KOMANDRA
        </div>

        <div className="shell hero__inner">
          <div className="hero__copy">
            <span className="eyebrow">Premium fast food experience</span>
            <h1 className="display hero__title">
              <span>Great Taste.</span>
              <span>
                Beyond <em>Ordinary.</em>
              </span>
            </h1>
            <p className="hero__desc">
              Discover a different kind of fast food. Crafted with flavor, designed with passion, and served with a
              futuristic experience.
            </p>
            <div className="hero__cta">
              <Magnetic>
                <Link to="/menu" className="btn btn--gold btn--lg">
                  Explore Our Menu <ArrowUpRight size={17} className="btn__arrow" />
                </Link>
              </Magnetic>
              <Magnetic>
                <Link to="/story" className="btn btn--ghost btn--lg">
                  Discover KOMANDRA
                </Link>
              </Magnetic>
            </div>
            <div className="hero__meta">
              <span>{settings.city}</span>
              <span>Delivery &amp; pickup</span>
              <span>Open till 02:00</span>
            </div>
          </div>

          <div className="hero__stage">
            <div className="hero__glow" ref={glowRef} aria-hidden="true" />
            <div className="hero__orbit" aria-hidden="true" />
            <div className="hero__orbit hero__orbit--2" aria-hidden="true" />
            <div className="hero__orbit hero__orbit--3" aria-hidden="true" />
            <span className="hero__chip hero__chip--a">
              Signature <strong>· 001</strong>
            </span>
            <span className="hero__chip hero__chip--b">
              180g <strong>flame-grilled beef</strong>
            </span>
            <svg className="hero__stamp" viewBox="0 0 120 120" aria-hidden="true">
              <defs>
                <path id="stampPath" d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0" />
              </defs>
              <text fontSize="7.2" letterSpacing="2.6" fill="currentColor" fontFamily="'JetBrains Mono', monospace">
                <textPath href="#stampPath">KOMANDRA · PREMIUM FAST FOOD · TASTE THE EXPERIENCE ·</textPath>
              </text>
            </svg>
            <ProductImage
              src="/img/hero-stage.webp"
              alt="The Signature Komandra Burger, flame-grilled beef with aged cheddar, tomato, onion and lettuce"
              className="hero__burger"
              sizes="(min-width: 1024px) 560px, 90vw"
              eager
            />
          </div>
        </div>

        <div className="hero__scroll" aria-hidden="true">
          Scroll <span />
        </div>
      </section>

      <div className="marquee" aria-hidden="true">
        <div className="marquee__track">
          {[0, 1].map((copy) => (
            <div key={copy} style={{ display: 'flex', gap: '2.6rem' }}>
              {MARQUEE.map((item) => (
                <span className="marquee__item" key={`${copy}-${item}`}>
                  {item}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <section className="section">
        <div className="shell">
          <SectionHead
            eyebrow="01 — Selection"
            title={
              <>
                Built for the <em>craving.</em>
              </>
            }
            note="Six signatures on the permanent menu, plus rotating specials. Every item is priced and stocked live — what you see is what the kitchen has."
            action={
              <Link to="/menu" className="link-arrow">
                Full menu <ArrowUpRight size={14} />
              </Link>
            }
          />
          {failed ? (
            <div className="empty">
              <h3>Menu unavailable</h3>
              <p>We could not reach the kitchen. Refresh the page or try again in a moment.</p>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => window.location.reload()}>
                Try again
              </button>
            </div>
          ) : products === null ? (
            <Spinner label="Plating the menu" />
          ) : (
            <EditorialMenu products={selection} />
          )}
        </div>
      </section>

      <section className="stats" aria-label="Komandra in numbers">
        {[
          { value: '180g', label: 'Hand-pressed beef' },
          { value: '24h', label: 'Buttermilk brine' },
          { value: settings.prepTime, label: 'Kitchen to door' },
          { value: '02:00', label: 'Last order' },
        ].map((stat) => (
          <div className="stat" key={stat.label}>
            <div className="stat__value">{stat.value}</div>
            <div className="stat__label">{stat.label}</div>
          </div>
        ))}
      </section>

      <section className="section">
        <div className="shell">
          <div className="story-intro">
            <div>
              <span className="eyebrow">02 — The experience</span>
              <h2 className="h2" style={{ marginTop: '0.9rem' }}>
                More Than <em>Fast Food.</em>
              </h2>
            </div>
            <p className="lede">
              KOMANDRA was built on a simple refusal: that fast should never mean forgettable. Three principles run through
              everything we cook, plate and hand over the counter.
            </p>
          </div>

          <div style={{ marginTop: 'clamp(1.5rem, 4vw, 3rem)' }}>
            {PILLARS.map((pillar, index) => (
              <Reveal key={pillar.number} delay={index * 60}>
                <article className="pillar">
                  <span className="pillar__num">{pillar.number}</span>
                  <h3 className="pillar__title">{pillar.title}</h3>
                  <div className="pillar__body">
                    {pillar.body.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                    <div className="pillar__media">
                      <ProductImage src={pillar.image} alt={pillar.alt} sizes="(min-width: 900px) 40vw, 92vw" />
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--line">
        <div className="shell">
          <SectionHead
            eyebrow="03 — Offers"
            title={
              <>
                A better reason to <em>order.</em>
              </>
            }
            note="Live offers are applied straight to the cart at checkout — no codes to remember, no asterisks."
            action={
              <Link to="/offers" className="link-arrow">
                All offers <ArrowUpRight size={14} />
              </Link>
            }
          />
          {offers === null ? (
            <Spinner label="Loading offers" />
          ) : previewOffers.length === 0 ? (
            <div className="empty">
              <h3>No live offers right now</h3>
              <p>Join us on Instagram — new drops land there first.</p>
            </div>
          ) : (
            <div className="offer-grid">
              {previewOffers.map((offer) => (
                <Link to="/offers" className="offer-card" key={offer.slug}>
                  <ProductImage
                    src={offer.image ?? offer.product?.image ?? '/img/offer-duo.jpg'}
                    alt={offer.title}
                    sizes="(min-width: 900px) 46vw, 92vw"
                  />
                  <div className="offer-card__body">
                    {offer.badge ? <span className="badge offer-card__badge">{offer.badge}</span> : null}
                    <h3 className="offer-card__title">{offer.title}</h3>
                    <p className="offer-card__sub">{offer.subtitle}</p>
                    <div className="offer-card__prices">
                      <span className="offer-card__price">{formatMoney(offer.offerCents, settings.currency)}</span>
                      <span className="offer-card__was">{formatMoney(offer.originalCents, settings.currency)}</span>
                    </div>
                    <span className="link-arrow" style={{ marginTop: '0.4rem' }}>
                      View offer <ArrowRight size={14} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section section--tight">
        <div className="shell">
          <div className="grid-2" style={{ alignItems: 'center', gap: 'clamp(1.4rem, 4vw, 3rem)' }}>
            <Reveal>
              <span className="eyebrow">04 — Why Komandra</span>
              <h2 className="h2" style={{ marginTop: '0.9rem' }}>
                Fast food, <em>properly made.</em>
              </h2>
              <p className="lede" style={{ marginTop: '1rem' }}>
                Real ingredients, transparent pricing and a kitchen you can watch. Order for delivery in under thirty-five
                minutes, or collect from the counter without waiting in a queue.
              </p>
              <div className="stack" style={{ marginTop: '1.4rem', gap: '0.55rem' }}>
                {['Live stock on every item', 'Delivery and pickup in one flow', 'Order tracking from kitchen to door'].map(
                  (line) => (
                    <span key={line} className="avail" style={{ color: 'var(--muted)' }}>
                      <Check size={13} style={{ color: 'var(--gold)' }} /> {line}
                    </span>
                  ),
                )}
              </div>
              <div className="hero__cta" style={{ marginTop: '1.6rem' }}>
                <Magnetic>
                  <Link to="/menu" className="btn btn--gold">
                    Start an order <ArrowUpRight size={15} className="btn__arrow" />
                  </Link>
                </Magnetic>
                <Magnetic>
                  <Link to="/reservations" className="btn btn--ghost">
                    Reserve a table
                  </Link>
                </Magnetic>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div className="wide-media">
                <ProductImage
                  src="/img/story-platter.jpg"
                  alt="A table spread of Komandra chicken and sides"
                  sizes="(min-width: 900px) 46vw, 92vw"
                />
                <div className="wide-media__caption">
                  <span>KOMANDRA kitchen</span>
                  <span>
                    <Star size={11} style={{ display: 'inline', verticalAlign: '-1px' }} /> Since 2026
                  </span>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="cta__glow" aria-hidden="true" />
        <div className="shell">
          <span className="eyebrow">05 — Let&apos;s talk</span>
          <h2 className="cta__title">
            Let&apos;s Make Your Next Meal <em>Special.</em>
          </h2>
          <p className="cta__desc">
            Catering for sixty, a private tasting, or a table for the whole team — tell us the occasion and we will build the
            menu around it.
          </p>
          <div className="cta__actions">
            <button type="button" className="btn btn--gold btn--lg" onClick={openContact}>
              Send a message <ArrowRight size={16} className="btn__arrow" />
            </button>
            <a
              href={`https://wa.me/${settings.whatsapp.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn--ghost btn--lg"
            >
              WhatsApp us <ArrowUpRight size={16} className="btn__arrow" />
            </a>
          </div>
          <div className="cta__foot">
            <span>{settings.phone}</span>
            <span>{settings.email}</span>
            <span>{settings.address}</span>
          </div>
        </div>
      </section>
    </>
  );
}

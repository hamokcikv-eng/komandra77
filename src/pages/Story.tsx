import { Link } from 'react-router-dom';
import { usePageMeta } from '../lib/seo';
import { useUI } from '../store/UIContext';
import { useSettings } from '../store/SettingsContext';
import { ArrowUpRight, Sparkle, Star } from '../components/Icons';
import { Magnetic, ProductImage, Reveal } from '../components/ui';

const PILLARS = [
  {
    number: '01',
    title: 'Quality Ingredients',
    image: '/img/story-seeds.jpg',
    alt: 'Sesame seeds and ingredients on a dark kitchen surface',
    body: [
      'We keep the supply list short. Beef with a known origin, aged cheddar, brioche baked before service, produce delivered the same morning.',
      'If an ingredient cannot be traced, it does not make it onto the pass.',
    ],
  },
  {
    number: '02',
    title: 'Extraordinary Flavor',
    image: '/img/story-burger.jpg',
    alt: 'A stacked burger lit cinematically',
    body: [
      'Each build starts with a flavour thesis: smoke, acid, fat and heat, in a deliberate order. Our signature sauce ferments for three days; pickles are brined in-house.',
      'Familiar enough to crave. Different enough to remember.',
    ],
  },
  {
    number: '03',
    title: 'A Different Experience',
    image: '/img/story-tray.jpg',
    alt: 'Burgers and loaded fries on a serving tray',
    body: [
      'Order from your phone, watch the kitchen move in real time, and collect food that still steams when it reaches you.',
      'Fast food without the feeling of a drive-through — that is the Komandra difference.',
    ],
  },
];

const VALUES = [
  { title: 'Cooked to order', body: 'Nothing is held under a lamp. Your order starts when it is confirmed.' },
  { title: 'Transparent pricing', body: 'Server-side totals, itemised receipts and offers that apply themselves.' },
  { title: 'Real availability', body: 'Live stock on every dish. If it is sold out, you will know before checkout.' },
  { title: 'Built for Riyadh', body: 'Late kitchens, fast delivery, and a counter that opens at noon.' },
];

export function StoryPage() {
  usePageMeta(
    'Our Story',
    'KOMANDRA is a futuristic premium fast food house built on three principles: quality ingredients, extraordinary flavor and a different experience.',
  );
  const { openContact } = useUI();
  const { settings } = useSettings();

  return (
    <>
      <section className="page-head">
        <div className="shell">
          <span className="eyebrow">Our story</span>
          <h1 className="display page-head__title">
            Not a faster restaurant. A <em>better</em> one.
          </h1>
          <p className="lede" style={{ marginTop: '1.3rem' }}>
            KOMANDRA began with a question the team could not answer: why does fast food have to feel this disposable? We
            spent two years rebuilding the format — the ingredients, the kitchen, the interface — until the answer felt
            obvious.
          </p>
        </div>
      </section>

      <section className="section section--tight" style={{ paddingTop: 0 }}>
        <div className="shell">
          <div className="wide-media">
            <ProductImage
              src="/img/story-platter.jpg"
              alt="The Komandra kitchen table spread"
              sizes="100vw"
              eager
            />
            <div className="wide-media__caption">
              <span>KOMANDRA · KAFD, Riyadh</span>
              <span>Est. 2026</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <div className="story-intro">
            <div>
              <span className="eyebrow">The philosophy</span>
              <h2 className="h2" style={{ marginTop: '0.9rem' }}>
                More Than <em>Fast Food.</em>
              </h2>
            </div>
            <p className="lede">
              Three principles run through everything we cook, plate and hand across the counter. They are not a manifesto —
              they are the operating manual for a kitchen that refuses to cut the interesting corners.
            </p>
          </div>

          <div style={{ marginTop: 'clamp(1.5rem, 4vw, 2.5rem)' }}>
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

      <section className="stats" aria-label="Komandra principles">
        {[
          { value: '180g', label: 'Hand-pressed patties' },
          { value: '24h', label: 'Buttermilk brine' },
          { value: '03', label: 'House-made sauces' },
          { value: '100%', label: 'Cooked to order' },
        ].map((stat) => (
          <div className="stat" key={stat.label}>
            <div className="stat__value">{stat.value}</div>
            <div className="stat__label">{stat.label}</div>
          </div>
        ))}
      </section>

      <section className="section">
        <div className="shell">
          <div className="section-head">
            <div>
              <span className="eyebrow">What we hold to</span>
              <h2 className="h2 section-head__title">
                Small promises, <em>kept.</em>
              </h2>
            </div>
          </div>
          <div className="grid-2" style={{ gap: '0.8rem' }}>
            {VALUES.map((value, index) => (
              <Reveal key={value.title} delay={index * 50}>
                <div className="panel" style={{ height: '100%' }}>
                  <div style={{ display: 'flex', gap: '0.7rem', alignItems: 'center', marginBottom: '0.6rem' }}>
                    <Sparkle size={15} style={{ color: 'var(--gold)' }} />
                    <h3 className="h3" style={{ fontSize: '1.1rem' }}>
                      {value.title}
                    </h3>
                  </div>
                  <p className="muted" style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.65 }}>
                    {value.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--tight">
        <div className="shell">
          <div className="panel" style={{ padding: 'clamp(1.4rem, 4vw, 2.6rem)' }}>
            <div className="grid-2" style={{ alignItems: 'center', gap: '1.6rem' }}>
              <div>
                <span className="eyebrow">The kitchen</span>
                <h2 className="h2" style={{ marginTop: '0.8rem', fontSize: 'clamp(1.8rem, 4vw, 3rem)' }}>
                  Come taste the <em>difference.</em>
                </h2>
                <p className="lede" style={{ marginTop: '0.9rem' }}>
                  {settings.address}, {settings.city}. Open late, seven days a week — walk in, or reserve a table and let us
                  set the pace.
                </p>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', justifyContent: 'flex-start' }}>
                <Magnetic>
                  <Link to="/menu" className="btn btn--gold">
                    Order now <ArrowUpRight size={15} className="btn__arrow" />
                  </Link>
                </Magnetic>
                <Magnetic>
                  <Link to="/reservations" className="btn btn--ghost">
                    Reserve a table
                  </Link>
                </Magnetic>
                <button type="button" className="btn btn--quiet" onClick={openContact}>
                  Catering enquiry
                </button>
                <div className="avail" style={{ width: '100%', marginTop: '0.4rem' }}>
                  <Star size={12} /> {settings.prepTime} average · live tracking
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

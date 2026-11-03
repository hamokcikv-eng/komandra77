import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMenu, type Category, type Product } from '../lib/api';
import { usePageMeta } from '../lib/seo';
import { EditorialMenu } from '../components/EditorialMenu';
import { ProductImage, Spinner } from '../components/ui';
import { ArrowUpRight } from '../components/Icons';

export function MenuPage() {
  usePageMeta('The Menu', 'The full KOMANDRA menu — flame-grilled burgers, double-crusted chicken, loaded fries and signature meals. Live availability, delivery and pickup.');
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let alive = true;
    getMenu()
      .then((data) => {
        if (!alive) return;
        setCategories(data.categories);
        setProducts(data.products);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const list = products ?? [];
    const search = query.trim().toLowerCase();
    return list.filter((product) => {
      const matchesCategory = active === 'all' || product.category.slug === active;
      if (!matchesCategory) return false;
      if (!search) return true;
      return (
        product.name.toLowerCase().includes(search) ||
        product.tagline.toLowerCase().includes(search) ||
        product.ingredients.join(' ').toLowerCase().includes(search)
      );
    });
  }, [products, active, query]);

  const groups = useMemo(() => {
    const order = categories.map((category) => category.slug);
    return order
      .map((slug) => ({
        category: categories.find((category) => category.slug === slug),
        items: filtered.filter((product) => product.category.slug === slug),
      }))
      .filter((group) => group.items.length > 0 && group.category);
  }, [categories, filtered]);

  return (
    <>
      <div className="page-head">
        <div className="shell">
          <span className="eyebrow">The menu</span>
          <h1 className="display page-head__title">
            Order the <em>experience.</em>
          </h1>
          <p className="lede" style={{ marginTop: '1.2rem' }}>
            Every item is cooked to order and priced live. Choose a dish to customise it — sizes, extras and quantity are
            carried straight through checkout.
          </p>
        </div>
      </div>

      <section className="section section--tight" style={{ paddingTop: 0 }}>
        <div className="shell">
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.7rem',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.6rem',
            }}
          >
            <div className="chips" role="tablist" aria-label="Menu categories">
              <button
                type="button"
                role="tab"
                aria-selected={active === 'all'}
                className={`chip ${active === 'all' ? 'is-active' : ''}`}
                onClick={() => setActive('all')}
              >
                All items
              </button>
              {categories.map((category) => (
                <button
                  key={category.slug}
                  type="button"
                  role="tab"
                  aria-selected={active === category.slug}
                  className={`chip ${active === category.slug ? 'is-active' : ''}`}
                  onClick={() => setActive(category.slug)}
                >
                  {category.name}
                </button>
              ))}
            </div>
            <label className="sr-only" htmlFor="menu-search">
              Search the menu
            </label>
            <input
              id="menu-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search dishes or ingredients"
              style={{
                flex: '1 1 220px',
                maxWidth: '320px',
                padding: '0.62rem 0.9rem',
                borderRadius: '999px',
                border: '1px solid var(--line)',
                background: 'rgba(8,10,11,0.7)',
                fontSize: '0.85rem',
              }}
            />
          </div>

          {failed ? (
            <div className="empty">
              <h3>Menu unavailable</h3>
              <p>We could not reach the kitchen. Please refresh and try again.</p>
            </div>
          ) : products === null ? (
            <Spinner label="Loading the menu" />
          ) : filtered.length === 0 ? (
            <div className="empty">
              <h3>No dishes match that search</h3>
              <p>Try a different ingredient, or clear the filters to see everything.</p>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => {
                  setQuery('');
                  setActive('all');
                }}
              >
                Clear filters
              </button>
            </div>
          ) : active === 'all' && !query ? (
            groups.map((group) =>
              group.category ? (
                <div key={group.category.slug} style={{ marginBottom: 'clamp(2rem, 5vw, 3.5rem)' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      gap: '1rem',
                      marginBottom: '0.8rem',
                    }}
                  >
                    <h2 className="h3">{group.category.name}</h2>
                    <span className="eyebrow eyebrow--plain" style={{ fontSize: '0.56rem' }}>
                      {String(group.items.length).padStart(2, '0')} items
                    </span>
                  </div>
                  <p className="muted" style={{ fontSize: '0.84rem', marginTop: 0, marginBottom: '0.9rem' }}>
                    {group.category.tagline}
                  </p>
                  <EditorialMenu products={group.items} showCategory={false} />
                </div>
              ) : null,
            )
          ) : (
            <EditorialMenu products={filtered} />
          )}
        </div>
      </section>

      <section className="section section--tight">
        <div className="shell">
          <div className="grid-2" style={{ gap: '1rem' }}>
            <Link to="/offers" className="panel" style={{ display: 'block' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: 88, height: 88, borderRadius: 14, overflow: 'hidden', flex: 'none' }}>
                  <ProductImage src="/img/double-cheese.jpg" alt="Double cheese burger offer" sizes="88px" />
                </div>
                <div>
                  <span className="eyebrow eyebrow--plain">Live offers</span>
                  <h3 className="h3" style={{ marginTop: '0.35rem' }}>
                    Save on signature builds
                  </h3>
                  <span className="link-arrow" style={{ marginTop: '0.6rem' }}>
                    See offers <ArrowUpRight size={14} />
                  </span>
                </div>
              </div>
            </Link>
            <Link to="/reservations" className="panel" style={{ display: 'block' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: 88, height: 88, borderRadius: 14, overflow: 'hidden', flex: 'none' }}>
                  <ProductImage src="/img/story-burger.jpg" alt="Dining at Komandra" sizes="88px" />
                </div>
                <div>
                  <span className="eyebrow eyebrow--plain">In-restaurant</span>
                  <h3 className="h3" style={{ marginTop: '0.35rem' }}>
                    Reserve a table
                  </h3>
                  <span className="link-arrow" style={{ marginTop: '0.6rem' }}>
                    Book a seat <ArrowUpRight size={14} />
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

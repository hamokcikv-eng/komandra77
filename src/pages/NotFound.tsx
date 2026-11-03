import { Link } from 'react-router-dom';
import { usePageMeta } from '../lib/seo';
import { ArrowUpRight } from '../components/Icons';

export function NotFoundPage() {
  usePageMeta('Page not found', 'That page is not on the menu.');

  return (
    <div className="shell page-head" style={{ textAlign: 'center', minHeight: '70vh' }}>
      <span className="eyebrow" style={{ justifyContent: 'center' }}>
        Error 404
      </span>
      <h1 className="display" style={{ marginTop: '1rem' }}>
        Off the <em>menu.</em>
      </h1>
      <p className="lede" style={{ margin: '1.2rem auto 0' }}>
        That page does not exist — or it has been retired. The kitchen is still open.
      </p>
      <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '1.6rem' }}>
        <Link to="/menu" className="btn btn--gold">
          Browse the menu <ArrowUpRight size={15} className="btn__arrow" />
        </Link>
        <Link to="/" className="btn btn--ghost">
          Back home
        </Link>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getOffers, type Offer } from '../lib/api';
import { formatMoney } from '../lib/format';
import { usePageMeta } from '../lib/seo';
import { useCart } from '../store/CartContext';
import { useSettings } from '../store/SettingsContext';
import { useUI } from '../store/UIContext';
import { ArrowUpRight, Sparkle } from '../components/Icons';
import { EmptyState, ProductImage, Reveal, Spinner } from '../components/ui';

export function OffersPage() {
  usePageMeta('Offers', 'Live KOMANDRA offers — limited builds and meal deals applied automatically at checkout.');
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [failed, setFailed] = useState(false);
  const { settings } = useSettings();
  const cart = useCart();
  const { notify } = useUI();

  useEffect(() => {
    let alive = true;
    getOffers()
      .then((data) => alive && setOffers(data.offers))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const addOffer = (offer: Offer) => {
    if (!offer.product) return;
    cart.addItem(offer.product, { offerSlug: offer.slug, qty: 1 });
    notify(`${offer.title} added at the offer price.`, 'success');
    cart.openCart();
  };

  return (
    <>
      <div className="page-head">
        <div className="shell">
          <span className="eyebrow">Offers</span>
          <h1 className="display page-head__title">
            Better than <em>full price.</em>
          </h1>
          <p className="lede" style={{ marginTop: '1.2rem' }}>
            Limited builds, meal deals and kitchen specials. Offers are priced server-side, so the number you see is the
            number you pay.
          </p>
        </div>
      </div>

      <section className="section section--tight" style={{ paddingTop: 0 }}>
        <div className="shell">
          {failed ? (
            <EmptyState title="Offers unavailable" body="We could not load the current offers. Please refresh." />
          ) : offers === null ? (
            <Spinner label="Loading offers" />
          ) : offers.length === 0 ? (
            <EmptyState
              icon={<Sparkle size={20} />}
              title="No live offers right now"
              body="The kitchen rotates offers weekly. Follow us on Instagram to catch the next drop."
              action={
                <Link to="/menu" className="btn btn--gold btn--sm">
                  Browse the menu
                </Link>
              }
            />
          ) : (
            <div className="offer-grid">
              {offers.map((offer, index) => (
                <Reveal key={offer.slug} delay={index * 70}>
                  <article className="offer-card">
                    <ProductImage
                      src={offer.image ?? offer.product?.image ?? '/img/offer-duo.jpg'}
                      alt={offer.product?.name ?? offer.title}
                      sizes="(min-width: 900px) 46vw, 92vw"
                    />
                    <div className="offer-card__body">
                      {offer.badge ? <span className="badge offer-card__badge">{offer.badge}</span> : null}
                      <h2 className="offer-card__title">{offer.title}</h2>
                      <p className="offer-card__sub">{offer.subtitle}</p>
                      <div className="offer-card__prices">
                        <span className="offer-card__price">{formatMoney(offer.offerCents, settings.currency)}</span>
                        <span className="offer-card__was">{formatMoney(offer.originalCents, settings.currency)}</span>
                      </div>
                      <div className="offer-card__cta">
                        <button
                          type="button"
                          className="btn btn--gold btn--sm"
                          onClick={() => addOffer(offer)}
                          disabled={!offer.product || !offer.product.available || offer.product.stock <= 0}
                        >
                          {offer.product && offer.product.available && offer.product.stock > 0 ? 'Add to order' : 'Sold out'}
                          <ArrowUpRight size={15} className="btn__arrow" />
                        </button>
                        {offer.product ? (
                          <Link to={`/menu/${offer.product.slug}`} className="btn btn--ghost btn--sm">
                            View dish
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

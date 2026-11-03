import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '../lib/api';
import { formatMoney } from '../lib/format';
import { useSettings } from '../store/SettingsContext';
import { ArrowUpRight } from './Icons';
import { ProductImage } from './ui';

type Preview = { product: Product; x: number; y: number } | null;

export function EditorialMenu({ products, showCategory = true }: { products: Product[]; showCategory?: boolean }) {
  const { settings } = useSettings();
  const [preview, setPreview] = useState<Preview>(null);

  if (products.length === 0) {
    return (
      <div className="empty">
        <h3>Nothing on this shelf yet</h3>
        <p>We are plating something new. Try another category or come back shortly.</p>
      </div>
    );
  }

  return (
    <>
      <div className="rows">
        {products.map((product, index) => {
          const price = product.offer ? product.offer.offerCents : product.priceCents;
          const compareAt = product.offer ? product.offer.originalCents : product.compareAtCents;
          const soldOut = !product.available || product.stock <= 0;
          return (
            <Link
              key={product.id}
              to={`/menu/${product.slug}`}
              className={`row ${soldOut ? 'row--sold' : ''}`}
              onPointerEnter={(event) => {
                if (event.pointerType !== 'mouse') return;
                setPreview({ product, x: event.clientX, y: event.clientY });
              }}
              onPointerMove={(event) => {
                if (event.pointerType !== 'mouse') return;
                setPreview((current) => (current ? { ...current, x: event.clientX, y: event.clientY } : current));
              }}
              onPointerLeave={() => setPreview(null)}
              onFocus={() => setPreview(null)}
            >
              <span className="row__num">{String(index + 1).padStart(2, '0')}</span>
              <span className="row__thumb">
                <ProductImage src={product.image} alt={product.name} sizes="84px" />
              </span>
              <span className="row__main">
                <span className="row__name">
                  {product.name}
                  {product.badge ? <span className="badge">{product.badge}</span> : null}
                  {product.offer ? <span className="badge">Offer</span> : null}
                </span>
                <span className="row__meta">
                  {showCategory ? <span>{product.category.name}</span> : null}
                  <span>{product.prepMinutes} min</span>
                  {soldOut ? <span className="avail avail--out">Sold out</span> : <span className="avail">Available</span>}
                </span>
              </span>
              <span className="row__price">
                {compareAt ? <span className="row__was">{formatMoney(compareAt, settings.currency)}</span> : null}
                <span className="row__amount">{formatMoney(price, settings.currency)}</span>
                <span className="row__arrow" aria-hidden="true">
                  <ArrowUpRight size={15} />
                </span>
              </span>
            </Link>
          );
        })}
      </div>

      {preview ? (
        <div
          className="row-preview is-visible"
          style={{ left: preview.x, top: preview.y }}
          aria-hidden="true"
        >
          <ProductImage src={preview.product.image} alt="" sizes="268px" />
          <div className="row-preview__badge">
            <span>{preview.product.category.name}</span>
            <span>{formatMoney(preview.product.offer?.offerCents ?? preview.product.priceCents, settings.currency)}</span>
          </div>
        </div>
      ) : null}
    </>
  );
}

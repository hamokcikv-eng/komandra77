import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { imageSrcSet } from '../lib/images';

export function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${visible ? 'is-in' : ''} ${className}`.trim()}
      style={{ '--d': `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}

export function Magnetic({ children, strength = 10 }: { children: ReactNode; strength?: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  const handleMove = (event: React.PointerEvent<HTMLSpanElement>) => {
    const node = ref.current;
    if (!node || event.pointerType !== 'mouse') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = node.getBoundingClientRect();
    const x = (event.clientX - (rect.left + rect.width / 2)) / rect.width;
    const y = (event.clientY - (rect.top + rect.height / 2)) / rect.height;
    node.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
  };

  const reset = () => {
    if (ref.current) ref.current.style.transform = '';
  };

  return (
    <span ref={ref} className="magnetic" onPointerMove={handleMove} onPointerLeave={reset}>
      {children}
    </span>
  );
}

export function ProductImage({
  src,
  alt,
  sizes = '100vw',
  className,
  eager = false,
}: {
  src: string;
  alt: string;
  sizes?: string;
  className?: string;
  eager?: boolean;
}) {
  return (
    <img
      src={src}
      srcSet={imageSrcSet(src)}
      sizes={sizes}
      alt={alt}
      className={className}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={eager ? 'high' : 'auto'}
    />
  );
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <span className="loading-block" role="status" aria-live="polite">
      <span className="spinner" />
      {label}
    </span>
  );
}

export function SectionHead({
  eyebrow,
  title,
  note,
  action,
}: {
  eyebrow: string;
  title: ReactNode;
  note?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-head">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2 className="h2 section-head__title">{title}</h2>
      </div>
      <div className="section-head__aside">
        {note ? <p className="section-head__note">{note}</p> : null}
        {action}
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      {icon ? <span className="empty__icon">{icon}</span> : null}
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}

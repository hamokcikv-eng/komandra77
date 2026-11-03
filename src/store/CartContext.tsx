import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Product } from '../lib/api';

export type CartItem = {
  key: string;
  productId: number;
  slug: string;
  name: string;
  image: string;
  sizeId: number | null;
  sizeName: string | null;
  addonIds: number[];
  addonNames: string[];
  unitPriceCents: number;
  qty: number;
  offerSlug: string | null;
};

type AddOptions = {
  sizeId?: number | null;
  addonIds?: number[];
  qty?: number;
  offerSlug?: string | null;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotalCents: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (product: Product, options?: AddOptions) => void;
  setQty: (key: string, qty: number) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

const STORAGE_KEY = 'komandra.cart.v1';
const CartContext = createContext<CartContextValue | null>(null);

function isItem(value: unknown): value is CartItem {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.key === 'string' &&
    typeof row.productId === 'number' &&
    typeof row.name === 'string' &&
    typeof row.unitPriceCents === 'number' &&
    typeof row.qty === 'number' &&
    row.qty > 0 &&
    Array.isArray(row.addonIds)
  );
}

function read(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isItem).slice(0, 40) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => (typeof window === 'undefined' ? [] : read()));
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage unavailable — cart stays in memory */
    }
  }, [items]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  const addItem = useCallback((product: Product, options: AddOptions = {}) => {
    const qty = Math.max(1, Math.min(20, options.qty ?? 1));
    const size = options.sizeId
      ? product.sizes.find((entry) => entry.id === options.sizeId) ?? null
      : product.sizes.find((entry) => entry.isDefault) ?? product.sizes[0] ?? null;
    const addonIds = [...new Set(options.addonIds ?? [])];
    const chosenAddons = addonIds
      .map((id) => product.addons.find((addon) => addon.id === id))
      .filter((addon): addon is NonNullable<typeof addon> => Boolean(addon));
    const offerSlug = options.offerSlug ?? null;
    const offer = offerSlug && product.offer?.slug === offerSlug ? product.offer : null;
    const base = offer ? offer.offerCents : product.priceCents;
    const unitPriceCents = base + (size?.priceDeltaCents ?? 0) + chosenAddons.reduce((sum, addon) => sum + addon.priceCents, 0);
    const key = `${product.id}:${size?.id ?? 0}:${[...addonIds].sort((a, b) => a - b).join('-')}:${offerSlug ?? ''}`;

    setItems((current) => {
      const existing = current.find((item) => item.key === key);
      if (existing) {
        return current.map((item) =>
          item.key === key ? { ...item, qty: Math.min(20, item.qty + qty) } : item,
        );
      }
      const next: CartItem = {
        key,
        productId: product.id,
        slug: product.slug,
        name: product.name,
        image: product.image,
        sizeId: size?.id ?? null,
        sizeName: size?.name ?? null,
        addonIds,
        addonNames: chosenAddons.map((addon) => addon.name),
        unitPriceCents,
        qty,
        offerSlug,
      };
      return [...current, next];
    });
  }, []);

  const setQty = useCallback((key: string, qty: number) => {
    setItems((current) =>
      qty <= 0
        ? current.filter((item) => item.key !== key)
        : current.map((item) => (item.key === key ? { ...item, qty: Math.min(20, qty) } : item)),
    );
  }, []);

  const removeItem = useCallback((key: string) => {
    setItems((current) => current.filter((item) => item.key !== key));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.reduce((sum, item) => sum + item.qty, 0),
      subtotalCents: items.reduce((sum, item) => sum + item.unitPriceCents * item.qty, 0),
      isOpen,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      addItem,
      setQty,
      removeItem,
      clear,
    }),
    [items, isOpen, addItem, setQty, removeItem, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside CartProvider');
  return context;
}

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getSettings, type Settings } from '../lib/api';

const FALLBACK: Settings = {
  name: 'KOMANDRA',
  slogan: 'Taste The Komandra Experience.',
  sloganAr: 'أكلك المفضل... بطريقة مختلفة.',
  phone: '+966 55 812 4091',
  whatsapp: '966558124091',
  email: 'hello@komandra.com',
  address: 'KAFD, King Fahd Road, Riyadh',
  city: 'Riyadh, Saudi Arabia',
  mapQuery: 'KAFD Riyadh',
  hours: [
    { day: 'Sunday — Thursday', open: '12:00', close: '02:00' },
    { day: 'Friday — Saturday', open: '13:00', close: '03:00' },
  ],
  deliveryFeeCents: 1500,
  freeDeliveryThresholdCents: 12000,
  minOrderCents: 3000,
  prepTime: '25 — 35 min',
  instagram: 'https://instagram.com/',
  tiktok: 'https://tiktok.com/',
  x: 'https://x.com/',
  currency: 'SAR',
  cardPayments: false,
};

type SettingsContextValue = {
  settings: Settings;
  loading: boolean;
  refresh: () => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue>({ settings: FALLBACK, loading: true, refresh: async () => {} });

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(FALLBACK);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await getSettings();
      setSettings({ ...FALLBACK, ...data.settings });
    } catch {
      setSettings(FALLBACK);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(() => ({ settings, loading, refresh }), [settings, loading, refresh]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  return useContext(SettingsContext);
}

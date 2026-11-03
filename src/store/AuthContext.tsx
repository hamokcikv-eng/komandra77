import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, getSession, type Address, type User } from '../lib/api';

type AuthContextValue = {
  user: User | null;
  addresses: Address[];
  stats: { orders: number; spentCents: number };
  loading: boolean;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<User>;
  register: (input: { name: string; email: string; password: string; phone?: string }) => Promise<User>;
  logout: () => Promise<void>;
  addAddress: (input: Omit<Address, 'id'>) => Promise<Address>;
  deleteAddress: (id: number) => Promise<void>;
  setDefaultAddress: (id: number) => Promise<void>;
  updateProfile: (input: { name: string; phone: string }) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [stats, setStats] = useState({ orders: 0, spentCents: 0 });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await getSession();
      setUser(data.user);
      setAddresses(data.addresses ?? []);
      setStats(data.stats ?? { orders: 0, spentCents: 0 });
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await api<{ user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      await refresh();
      return data.user;
    },
    [refresh],
  );

  const register = useCallback(
    async (input: { name: string; email: string; password: string; phone?: string }) => {
      const data = await api<{ user: User }>('/auth/register', { method: 'POST', body: JSON.stringify(input) });
      await refresh();
      return data.user;
    },
    [refresh],
  );

  const logout = useCallback(async () => {
    await api('/auth/logout', { method: 'POST' });
    setUser(null);
    setAddresses([]);
    setStats({ orders: 0, spentCents: 0 });
  }, []);

  const addAddress = useCallback(
    async (input: Omit<Address, 'id'>) => {
      const data = await api<{ address: Address }>('/addresses', { method: 'POST', body: JSON.stringify(input) });
      await refresh();
      return data.address;
    },
    [refresh],
  );

  const deleteAddress = useCallback(
    async (id: number) => {
      await api(`/addresses/${id}`, { method: 'DELETE' });
      await refresh();
    },
    [refresh],
  );

  const setDefaultAddress = useCallback(
    async (id: number) => {
      await api(`/addresses/${id}/default`, { method: 'POST' });
      await refresh();
    },
    [refresh],
  );

  const updateProfile = useCallback(
    async (input: { name: string; phone: string }) => {
      await api('/auth/me', { method: 'PATCH', body: JSON.stringify(input) });
      await refresh();
    },
    [refresh],
  );

  const value = useMemo(
    () => ({ user, addresses, stats, loading, refresh, login, register, logout, addAddress, deleteAddress, setDefaultAddress, updateProfile }),
    [user, addresses, stats, loading, refresh, login, register, logout, addAddress, deleteAddress, setDefaultAddress, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

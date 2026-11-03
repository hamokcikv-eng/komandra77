import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type Toast = { id: number; message: string; tone: 'success' | 'error' | 'info' };

type UIContextValue = {
  toasts: Toast[];
  notify: (message: string, tone?: Toast['tone']) => void;
  dismiss: (id: number) => void;
  contactOpen: boolean;
  openContact: () => void;
  closeContact: () => void;
};

const UIContext = createContext<UIContextValue | null>(null);
let counter = 0;

export function UIProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [contactOpen, setContactOpen] = useState(false);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, tone: Toast['tone'] = 'info') => {
      counter += 1;
      const id = counter;
      setToasts((current) => [...current.slice(-2), { id, message, tone }]);
      window.setTimeout(() => dismiss(id), 4200);
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      toasts,
      notify,
      dismiss,
      contactOpen,
      openContact: () => setContactOpen(true),
      closeContact: () => setContactOpen(false),
    }),
    [toasts, notify, dismiss, contactOpen],
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI(): UIContextValue {
  const context = useContext(UIContext);
  if (!context) throw new Error('useUI must be used inside UIProvider');
  return context;
}

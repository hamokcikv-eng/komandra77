import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { api, ApiError } from '../lib/api';
import { Close } from '../components/Icons';

export function useFetch<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const result = await api<T>(path);
      setData(result);
      setError('');
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Could not load data.');
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, loading, reload, setData };
}

export function AdminPage({
  title,
  sub,
  action,
  children,
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="admin-topbar">
        <div>
          <h1 className="admin-title">{title}</h1>
          {sub ? <p className="admin-sub">{sub}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function AdminModal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className={`modal ${wide ? 'modal--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="icon-btn modal__close" onClick={onClose} aria-label="Close dialog">
          <Close size={16} />
        </button>
        <h2 className="modal__title" style={{ fontSize: '1.4rem', marginTop: 0 }}>
          {title}
        </h2>
        <div style={{ marginTop: '1rem' }}>{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="field">
      <span className="field__label">{label}</span>
      {children}
      {hint ? <p className="field__hint">{hint}</p> : null}
    </div>
  );
}

export function AdminError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="form-error" role="alert">
      {message}
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const tone =
    status === 'completed'
      ? 'green'
      : status === 'cancelled'
        ? 'red'
        : status === 'pending'
          ? 'muted'
          : 'gold';
  return <span className={`status-pill status-pill--${tone}`}>{status.replace(/_/g, ' ')}</span>;
}

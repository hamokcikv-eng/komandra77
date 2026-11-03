import { useUI } from '../store/UIContext';
import { Check, Close, Sparkle } from './Icons';

export function Toasts() {
  const { toasts, dismiss } = useUI();
  if (toasts.length === 0) return null;

  return (
    <div className="toasts" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.tone}`} role="status">
          <span className="toast__icon">
            {toast.tone === 'success' ? <Check size={15} /> : toast.tone === 'error' ? <Close size={15} /> : <Sparkle size={15} />}
          </span>
          <span style={{ flex: 1 }}>{toast.message}</span>
          <button type="button" onClick={() => dismiss(toast.id)} aria-label="Dismiss notification" style={{ color: 'var(--muted)' }}>
            <Close size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}

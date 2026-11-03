export function formatMoney(cents: number, currency = 'SAR'): string {
  const amount = (Math.round(cents) / 100).toFixed(2);
  return `${currency} ${amount}`;
}

export function formatAmount(cents: number): string {
  return (Math.round(cents) / 100).toFixed(2);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '';
  const normalised = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const date = new Date(normalised);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDay(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export const ORDER_FLOW = ['pending', 'confirmed', 'preparing', 'ready', 'completed'] as const;

export const STATUS_LABEL: Record<string, string> = {
  pending: 'Received',
  confirmed: 'Confirmed',
  preparing: 'In the kitchen',
  ready: 'Ready',
  out_for_delivery: 'Out for delivery',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export function statusLabel(status: string): string {
  return STATUS_LABEL[status] ?? status.replace(/_/g, ' ');
}

export function statusTone(status: string): 'gold' | 'green' | 'red' | 'muted' {
  if (status === 'completed') return 'green';
  if (status === 'cancelled') return 'red';
  if (status === 'pending') return 'muted';
  return 'gold';
}

export function timeAgo(value: string | null | undefined): string {
  if (!value) return '';
  const normalised = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const then = new Date(normalised).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Math.max(0, Date.now() - then);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

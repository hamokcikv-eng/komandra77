import type { Env } from './types';

const API = 'https://api.stripe.com/v1';

export function stripeEnabled(env: Env): boolean {
  return Boolean(env.STRIPE_SECRET_KEY);
}

type CheckoutInput = {
  orderCode: string;
  amountCents: number;
  currency: string;
  description: string;
  customerEmail?: string | null;
  origin: string;
};

/** Creates a hosted Stripe Checkout session. No card data ever reaches KOMANDRA. */
export async function createCheckoutSession(env: Env, input: CheckoutInput): Promise<{ id: string; url: string } | null> {
  if (!env.STRIPE_SECRET_KEY) return null;

  const params = new URLSearchParams();
  params.set('mode', 'payment');
  params.set('success_url', `${input.origin}/orders/${input.orderCode}?paid=1`);
  params.set('cancel_url', `${input.origin}/orders/${input.orderCode}?cancelled=1`);
  params.set('client_reference_id', input.orderCode);
  params.set('line_items[0][quantity]', '1');
  params.set('line_items[0][price_data][currency]', input.currency.toLowerCase());
  params.set('line_items[0][price_data][unit_amount]', String(input.amountCents));
  params.set('line_items[0][price_data][product_data][name]', input.description.slice(0, 120));
  if (input.customerEmail) params.set('customer_email', input.customerEmail);
  params.set('metadata[order_code]', input.orderCode);

  const response = await fetch(`${API}/checkout/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    console.error('Stripe checkout failed', response.status, await response.text());
    return null;
  }

  const data = (await response.json()) as { id?: string; url?: string };
  if (!data.id || !data.url) return null;
  return { id: data.id, url: data.url };
}

export async function retrieveSession(env: Env, sessionId: string): Promise<{ id: string; payment_status: string } | null> {
  if (!env.STRIPE_SECRET_KEY) return null;
  const response = await fetch(`${API}/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
  });
  if (!response.ok) {
    console.error('Stripe session lookup failed', response.status);
    return null;
  }
  return (await response.json()) as { id: string; payment_status: string };
}

/** Optional WhatsApp Cloud API push. Silently no-ops unless configured. */
export async function notifyWhatsApp(env: Env, to: string, text: string): Promise<void> {
  if (!env.WHATSAPP_TOKEN || !env.WHATSAPP_PHONE_ID) return;
  try {
    const response = await fetch(`https://graph.facebook.com/v21.0/${env.WHATSAPP_PHONE_ID}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      }),
    });
    if (!response.ok) console.error('WhatsApp notification failed', response.status);
  } catch (error) {
    console.error('WhatsApp notification error', error);
  }
}

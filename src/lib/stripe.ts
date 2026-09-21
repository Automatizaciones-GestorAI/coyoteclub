import Stripe from 'stripe';

// Configuración de Stripe. Se lee en ejecución (con el nombre en una variable, para que no quede "congelada" en el build).
const env = (name: string) => (process.env[name] ?? '').trim();

export class StripeNotConfiguredError extends Error {
  problems: string[];
  constructor(problems: string[]) {
    super('Stripe no está configurado: ' + problems.join('; '));
    this.name = 'StripeNotConfiguredError';
    this.problems = problems;
  }
}

// Sin enseñar nunca los valores de las claves.
function keyProblems(): string[] {
  const key = env('STRIPE_SECRET_KEY');
  if (!key) return ['falta STRIPE_SECRET_KEY'];
  if (key.startsWith('pk_')) return ['STRIPE_SECRET_KEY es la clave PÚBLICA (pk_): hace falta la clave secreta (sk_test_… o sk_live_…)'];
  if (!/^(sk|rk)_(test|live)_[A-Za-z0-9]+$/.test(key)) return ['STRIPE_SECRET_KEY no tiene el formato de una clave secreta de Stripe (empieza por sk_test_ o sk_live_)'];
  return [];
}
function webhookProblems(): string[] {
  const secret = env('STRIPE_WEBHOOK_SECRET');
  if (!secret) return ['falta STRIPE_WEBHOOK_SECRET (el secreto del aviso de Stripe, empieza por whsec_)'];
  if (!/^whsec_[A-Za-z0-9]+$/.test(secret)) return ['STRIPE_WEBHOOK_SECRET no tiene el formato correcto (empieza por whsec_)'];
  return [];
}

export function getStripeStatus(): { ok: boolean; mode: 'test' | 'live'; problems: string[] } {
  const mode = env('STRIPE_SECRET_KEY').includes('_live_') ? 'live' : 'test';
  const problems = [...keyProblems(), ...webhookProblems()];
  return { ok: problems.length === 0, mode, problems };
}

let cached: { key: string; client: Stripe } | null = null;

// Cliente de Stripe. STRIPE_API_BASE solo se usa en las pruebas automáticas (apunta a un Stripe falso local).
export function getStripe(): Stripe {
  const problems = keyProblems();
  if (problems.length) throw new StripeNotConfiguredError(problems);
  const key = env('STRIPE_SECRET_KEY');
  if (cached && cached.key === key) return cached.client;
  const base = env('STRIPE_API_BASE');
  const client = base
    ? (() => {
        const u = new URL(base);
        return new Stripe(key, { host: u.hostname, port: u.port || (u.protocol === 'https:' ? '443' : '80'), protocol: u.protocol.replace(':', '') as 'http' | 'https', maxNetworkRetries: 0 });
      })()
    : new Stripe(key, { maxNetworkRetries: 2, timeout: 20_000 });
  cached = { key, client };
  return client;
}

export function getWebhookSecret(): string {
  const problems = webhookProblems();
  if (problems.length) throw new StripeNotConfiguredError(problems);
  return env('STRIPE_WEBHOOK_SECRET');
}

// Enlace al cobro en el panel de Stripe (para hacer devoluciones o ver el detalle).
export function stripeDashboardUrl(paymentIntent: string | null | undefined): string | null {
  if (!paymentIntent) return null;
  return `https://dashboard.stripe.com/${getStripeStatus().mode === 'test' ? 'test/' : ''}payments/${paymentIntent}`;
}

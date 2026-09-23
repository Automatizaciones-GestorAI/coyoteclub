import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { addHit, clientIp, retryAfter } from '@/lib/ratelimit';

// Seguimiento propio, sin cookies: cuenta visitas a páginas y clics en botones clave, para enseñarlo en el
// panel de Admin. No se guarda IP, user-agent ni nada que identifique a quien visita, solo el conteo.
// Se llama con sendBeacon/fetch(keepalive) desde la propia web: si falla, no rompe nada para quien navega.

const PATHS = ['/', '/entradas'];
const LABELS = ['nav_entradas', 'whatsapp_nav', 'hero_entradas', 'card_entradas', 'whatsapp_footer', 'mapa'];

export async function POST(req: NextRequest) {
  // Límite generoso: esto no es una acción sensible, solo evita que alguien lo use para llenar la tabla.
  const limitKey = `track:${clientIp(req)}`;
  if (retryAfter(limitKey, 120)) return NextResponse.json({ ok: false }, { status: 429 });
  addHit(limitKey, 60_000);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const kind = body?.kind === 'pageview' || body?.kind === 'click' ? body.kind : null;
  if (!kind) return NextResponse.json({ ok: false }, { status: 400 });

  const path = kind === 'pageview' && PATHS.includes(body?.path) ? body.path : null;
  const label = kind === 'click' && LABELS.includes(body?.label) ? body.label : null;
  if (kind === 'pageview' && !path) return NextResponse.json({ ok: false }, { status: 400 });
  if (kind === 'click' && !label) return NextResponse.json({ ok: false }, { status: 400 });

  // No se espera a que termine: a quien navega no le tiene que afectar si esto falla o va lento.
  supabaseAdmin.from('site_events').insert({ kind, path, label }).then(({ error }) => {
    if (error) console.error('[track] no se pudo guardar', error.message);
  });

  return new NextResponse(null, { status: 204 });
}

import { supabaseAdmin } from '@/lib/supabase';
import { esc, formatEventDate, formatPrice } from '@/lib/format';
import { availability } from '@/lib/stock';
import { expirePending } from '@/lib/stock-db';
import { legalLinksHtml, paymentLogosHtml } from '@/lib/legal-ui';

export const dynamic = 'force-dynamic';

const ACCENT = '#ff149c';
const MAP_QUERY = encodeURIComponent('Coyote Club, C. Trillo, 15, Seseña, Toledo');

export default async function Home() {
  await expirePending();
  const [{ data: events }, { data: tiers }, { data: gallery }] = await Promise.all([
    supabaseAdmin
      .from('events')
      .select('*')
      .eq('is_published', true)
      .order('sort_order', { ascending: true }),
    supabaseAdmin
      .from('price_tiers')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabaseAdmin.from('gallery_images').select('*').order('sort_order', { ascending: true })
  ]);

  const eventsHtml = (events || [])
    .map((evt, i) => {
      const badge = `${evt.event_date ? formatEventDate(evt.event_date) : ''}`;
      const sub = [evt.dj, evt.event_time].filter(Boolean).join(' · ');
      const poster = evt.poster_url || '';
      const revealClass = i % 3 === 1 ? 'reveal reveal-d1' : i % 3 === 2 ? 'reveal reveal-d2' : 'reveal';
      return `
      <div class="${revealClass}" style="display: flex; flex-direction: column; border-radius: 20px; overflow: hidden; background: var(--bg-card); border: 1px solid var(--line);">
        <div style="position: relative; width: 100%; background: var(--bg-alt); border-bottom: 1px solid var(--line); min-height: 200px;">
          ${poster ? `<img src="${esc(poster)}" alt="${esc(evt.title)}" style="width: 100%; height: auto; display: block;">` : ''}
          <div style="position: absolute; top: 16px; left: 16px; background: ${ACCENT}; color: #0b0b0c; font-weight: 700; font-size: 13px; letter-spacing: 0.05em; padding: 8px 14px; border-radius: 999px;">${esc(badge)}</div>
        </div>
        <div style="display: flex; flex-direction: column; justify-content: space-between; gap: 24px; padding: clamp(20px, 5vw, 32px); flex-grow: 1;">
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div class="display" style="font-size: 36px; color: var(--text);">${esc(evt.title)}</div>
            <div style="font-size: 15px; color: var(--text-dim);">${esc(sub)}</div>
          </div>
          <a href="/entradas" class="btn event-cta">Apúntate →</a>
        </div>
      </div>`;
    })
    .join('');

  const tiersHtml = (tiers || [])
    .map((tier) => {
      const price = formatPrice(tier.price_cents);
      const state = availability(tier); // solo el estado sale al HTML, nunca el número
      const cta =
        tier.kind === 'door'
          ? `<div class="btn-outline" style="text-align: center;">Pago en caja</div>`
          : state === 'soldout'
            ? `<div class="btn-outline" style="text-align: center;">Agotado</div>`
            : `<a href="/entradas" class="btn" style="text-align: center;">${tier.kind === 'standing' ? 'Comprar' : 'Comprar entrada'}</a>`;
      const badge = state === 'low' ? `<span class="badge-low">Quedan pocas</span>` : '';
      return `
      <div style="display: flex; flex-direction: column; gap: 24px; padding: clamp(28px, 6vw, 44px) clamp(22px, 5vw, 32px); border-radius: 20px; background: var(--bg-card); border: 1px solid var(--line);${state === 'soldout' ? ' opacity: 0.6;' : ''}">
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; min-height: 26px;">
            <div style="font-size: 14px; font-weight: 700; letter-spacing: 0.1em; color: ${tier.kind === 'door' ? 'var(--text-dim)' : ACCENT};">${esc(tier.label)}</div>
            ${badge}
          </div>
          <div class="display" style="font-size: 52px; color: var(--text);">${price}</div>
          <div style="font-size: 15px; color: var(--text-dim);">${esc(tier.description)}</div>
        </div>
        ${cta}
      </div>`;
    })
    .join('');

  const galleryHtml = (gallery || [])
    .map((img, i) => {
      const revealClass = i % 3 === 1 ? 'reveal reveal-d1' : i % 3 === 2 ? 'reveal reveal-d2' : 'reveal';
      return `<div class="${revealClass} img-hover gallery-item"><img src="${esc(img.url)}" alt="${esc(img.alt)}"></div>`;
    })
    .join('');

  const html = `
<div style="width: 100%; background: var(--bg); display: flex; flex-direction: column;">

  <!-- TOP BAR -->
  <div class="topbar" style="width: 100%; box-sizing: border-box; padding: 10px var(--px); display: flex; align-items: center; justify-content: space-between; background: #050505; border-bottom: 1px solid var(--line);">
    <div style="font-size: 12px; letter-spacing: 0.05em; color: var(--text-dim);">ABIERTO · VIERNES Y SÁBADO · 00:00 — 06:00</div>
    <div style="font-size: 12px; letter-spacing: 0.05em; color: var(--text-dim);">+34 653 53 35 49 · Seseña Viejo, Toledo</div>
  </div>

  <!-- NAV -->
  <div class="site-nav" style="position: sticky; top: 0; z-index: 20; width: 100%; box-sizing: border-box; display: flex; align-items: center; justify-content: space-between; padding: 14px var(--px); background: rgba(11,11,12,0.94); backdrop-filter: blur(6px); border-bottom: 1px solid var(--line);">
    <a href="/" style="display: flex; align-items: center;">
      <img src="/images/logo.png" alt="Coyote Club" style="height: 30px; width: auto; display: block; filter: drop-shadow(0 0 10px rgba(255,20,150,0.4));">
    </a>
    <input type="checkbox" id="nav-toggle" class="nav-toggle" aria-label="Abrir o cerrar el menú">
    <label for="nav-toggle" class="nav-burger" aria-hidden="true"><span></span><span></span><span></span></label>
    <div class="nav-links">
      <a class="link-underline" href="#coyote" style="font-size: 14px; font-weight: 600; letter-spacing: 0.05em; color: var(--text-dim);">EL CLUB</a>
      <a class="link-underline" href="#eventos" style="font-size: 14px; font-weight: 600; letter-spacing: 0.05em; color: var(--text-dim);">EVENTOS</a>
      <a class="link-underline" href="/entradas" style="font-size: 14px; font-weight: 600; letter-spacing: 0.05em; color: var(--text-dim);">ENTRADAS</a>
      <a class="link-underline" href="#galeria" style="font-size: 14px; font-weight: 600; letter-spacing: 0.05em; color: var(--text-dim);">GALERÍA</a>
      <a class="link-underline" href="#como-llegar" style="font-size: 14px; font-weight: 600; letter-spacing: 0.05em; color: var(--text-dim);">CÓMO LLEGAR</a>
      <a href="https://wa.me/34653533549" class="btn" style="font-size: 13px; padding: 12px 22px;">RESERVA POR WHATSAPP</a>
    </div>
  </div>

  <!-- HERO -->
  <div style="position: relative; width: 100%; box-sizing: border-box; overflow: hidden; padding: clamp(48px, 10vw, 100px) var(--px) clamp(56px, 9vw, 90px) var(--px); display: flex; flex-direction: column; align-items: flex-start; gap: 28px; background-image: radial-gradient(ellipse at 15% 0%, rgba(255,42,122,0.28), transparent 55%), radial-gradient(ellipse at 85% 20%, rgba(130,60,255,0.18), transparent 50%), linear-gradient(90deg, rgba(11,11,12,0.98) 0%, rgba(11,11,12,0.92) 30%, rgba(11,11,12,0.72) 55%, rgba(11,11,12,0.4) 80%, rgba(11,11,12,0.15) 100%), url(/images/hero.png); background-size: auto, auto, auto, cover; background-position: center, center, center, center 30%; background-repeat: no-repeat, no-repeat, no-repeat, no-repeat;">
    <svg style="position: absolute; inset: 0; width: 100%; height: 100%; z-index: 0;" viewBox="0 0 1440 640" preserveAspectRatio="none">
      <line x1="1180" y1="-40" x2="900" y2="680" stroke="${ACCENT}" stroke-width="2" opacity="0.35"></line>
      <line x1="1260" y1="-40" x2="980" y2="680" stroke="#823cff" stroke-width="2" opacity="0.25"></line>
      <line x1="1340" y1="-40" x2="1060" y2="680" stroke="${ACCENT}" stroke-width="1.5" opacity="0.18"></line>
    </svg>
    <div style="position: relative; z-index: 1; filter: drop-shadow(0 0 24px rgba(255,20,150,0.5));">
      <div id="logo-box" style="position: relative; width: min(665px, calc(100vw - 2 * var(--px)));">
        <video id="logo-matte-video" src="/video/logo-loop.mp4" autoplay loop muted playsinline preload="auto" aria-hidden="true" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; pointer-events: none; z-index: -1;"></video>
        <canvas id="logo-canvas" width="640" height="154" role="img" aria-label="Coyote Club" style="width: 100%; height: auto; display: block;"></canvas>
        <img class="logo-fallback" src="/images/logo.png" alt="" aria-hidden="true">
      </div>
    </div>
    <div style="position: relative; z-index: 1; font-size: clamp(12px, 3.4vw, 15px); font-weight: 600; letter-spacing: 0.14em; color: ${ACCENT};">SESEÑA (TOLEDO) · VIERNES Y SÁBADOS</div>
    <h1 style="position: relative; z-index: 1; margin: 0; font-size: clamp(42px, 13vw, 100px); line-height: 0.95; max-width: 900px; color: var(--text);">LA MEJOR<br>SALA DE LA ZONA</h1>
    <p style="position: relative; z-index: 1; margin: 0; max-width: 560px; font-size: clamp(16px, 4.6vw, 19px); line-height: 1.5; color: var(--text-dim);">Pista, barra y la mejor selección de cócteles, abierto hasta las 6 de la mañana.</p>
    <div class="cta-row" style="position: relative; z-index: 1; display: flex; flex-wrap: wrap; gap: 16px; margin-top: 12px;">
      <a href="/entradas" class="btn" style="font-size: 15px; padding: 18px 34px;">ENTRADAS →</a>
      <a href="#eventos" class="btn-outline" style="font-size: 15px; padding: 18px 34px;">VER EVENTOS</a>
    </div>
  </div>

  <!-- STATS BAR -->
  <div class="stats">
    <div class="stat">
      <div class="display" style="font-size: 32px; color: var(--text);">4.0 <span style="color: ${ACCENT};">★</span></div>
      <div style="font-size: 13px; color: var(--text-dim);">174 reseñas en Google</div>
    </div>
    <div class="stat stat-mid">
      <div class="display" style="font-size: 32px; color: var(--text);">00:00–06:00</div>
      <div style="font-size: 13px; color: var(--text-dim);">Viernes y sábados</div>
    </div>
    <div class="stat stat-last">
      <div class="display" style="font-size: 32px; color: var(--text);">SESEÑA VIEJO</div>
      <div style="font-size: 13px; color: var(--text-dim);">C/ Trillo · Toledo</div>
    </div>
  </div>

  <!-- EL CLUB -->
  <div id="coyote" style="width: 100%; box-sizing: border-box; padding: clamp(64px, 12vw, 120px) var(--px) clamp(32px, 6vw, 64px) var(--px); display: flex; flex-direction: column; gap: 40px;">
    <div style="display: flex; flex-direction: column; gap: 16px; max-width: 760px;">
      <h2 style="margin: 0; font-size: clamp(34px, 9vw, 56px); color: var(--text);">EL CLUB</h2>
      <p style="margin: 0; font-size: 17px; line-height: 1.6; color: var(--text-dim);">Coyote Club es la sala de referencia de Seseña, con pista, barra y zona de reservados en un único espacio pensado para bailar hasta que salga el sol.</p>
    </div>
    <div class="club-grid">
      <div class="reveal" style="display: flex; flex-direction: column; gap: 16px;">
        <div style="aspect-ratio: 4 / 3; border-radius: 16px; overflow: hidden; background: var(--bg-alt);" class="img-hover">
          <img src="/images/pista.png" alt="Pista de baile" style="width: 100%; height: 100%; object-fit: cover; display: block;">
        </div>
        <div style="display: flex; flex-direction: column; gap: 2px;">
          <div class="display" style="font-size: 26px; color: var(--text);">PISTA DE BAILE</div>
          <div style="font-size: 13px; color: var(--text-dim);">Sonido y luces toda la noche</div>
        </div>
      </div>
      <div class="reveal reveal-d1" style="display: flex; flex-direction: column; gap: 16px;">
        <div style="aspect-ratio: 4 / 3; border-radius: 16px; overflow: hidden; background: var(--bg-alt);" class="img-hover">
          <img src="/images/barra.png" alt="Barra" style="width: 100%; height: 100%; object-fit: cover; display: block;">
        </div>
        <div style="display: flex; flex-direction: column; gap: 2px;">
          <div class="display" style="font-size: 26px; color: var(--text);">BARRA Y CÓCTELES</div>
          <div style="font-size: 13px; color: var(--text-dim);">Selección premium toda la noche</div>
        </div>
      </div>
      <div class="reveal reveal-d2" style="display: flex; flex-direction: column; gap: 16px;">
        <div style="aspect-ratio: 4 / 3; border-radius: 16px; overflow: hidden; background: var(--bg-alt);" class="img-hover">
          <img src="/images/reservados.jpg" alt="Zona reservados" style="width: 100%; height: 100%; object-fit: cover; display: block;">
        </div>
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <div class="display" style="font-size: 26px; color: var(--text);">ZONA RESERVADOS</div>
          <div style="font-size: 13px; color: var(--text-dim);">Mesas junto a la pista</div>
          <a href="https://wa.me/34653533549" style="font-size: 13px; font-weight: 700; color: ${ACCENT}; margin-top: 4px;">Resérvala por WhatsApp →</a>
        </div>
      </div>
    </div>
  </div>

  <!-- EVENTOS -->
  <div id="eventos" style="width: 100%; box-sizing: border-box; padding: clamp(32px, 6vw, 64px) var(--px) clamp(64px, 12vw, 120px) var(--px); display: flex; flex-direction: column; gap: clamp(28px, 5vw, 48px);">
    <div style="display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 12px 24px;">
      <h2 style="margin: 0; font-size: clamp(34px, 9vw, 56px); color: var(--text);">ESTA SEMANA EN COYOTE</h2>
      <a class="link-underline" href="https://instagram.com/coyotteclub" style="font-size: 14px; font-weight: 600; color: var(--text-dim);">Cartel completo en Instagram →</a>
    </div>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); gap: 20px; max-width: 1400px;">
      ${eventsHtml || '<div style="color: var(--text-dim); font-size: 15px;">Sin eventos publicados por ahora.</div>'}
    </div>
  </div>

  <!-- ENTRADAS -->
  <div id="entradas-preview" style="width: 100%; box-sizing: border-box; padding: 0 var(--px) clamp(64px, 12vw, 120px) var(--px); display: flex; flex-direction: column; gap: 40px;">
    <div style="display: flex; flex-direction: column; gap: 16px; max-width: 760px;">
      <h2 style="margin: 0; font-size: clamp(34px, 9vw, 56px); color: var(--text);">ENTRADAS</h2>
      <p style="margin: 0; font-size: 17px; line-height: 1.6; color: var(--text-dim);">Asegura tu entrada online. El precio sube según se acerca la fecha, así que cuanto antes la compres, menos pagas.</p>
    </div>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: 24px; max-width: 1320px;">
      ${tiersHtml}
    </div>
    <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 12px; font-size: 13px; color: var(--text-dim);">${paymentLogosHtml()}<span>Pago seguro con tarjeta · Redsys · Precios con IVA incluido</span></div>
  </div>

  <!-- GALERÍA -->
  <div id="galeria" style="width: 100%; box-sizing: border-box; padding: 0 0 8px 0; display: flex; flex-direction: column; gap: 24px;">
    <div style="padding: 0 var(--px); display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 12px 24px;">
      <h2 style="margin: 0; font-size: clamp(30px, 8vw, 44px); color: var(--text);">GALERÍA</h2>
      <a class="link-underline" href="https://instagram.com/coyotteclub" style="font-size: 14px; font-weight: 600; color: var(--text-dim);">@coyotteclub en Instagram →</a>
    </div>
    <div class="gallery-wrap">
      ${galleryHtml}
    </div>
    <div style="padding: 0 var(--px); text-align: center;">
      <div style="font-size: 13px; color: var(--text-dim);">Más fotos próximamente</div>
    </div>
  </div>

  <!-- COMO LLEGAR -->
  <div id="como-llegar" style="width: 100%; box-sizing: border-box; padding: clamp(56px, 10vw, 100px) var(--px); display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr)); gap: clamp(32px, 5vw, 64px); background: var(--bg-alt); border-top: 1px solid var(--line);">
    <div style="display: flex; flex-direction: column; gap: 28px;">
      <h2 style="margin: 0; font-size: clamp(30px, 8vw, 44px); color: var(--text);">CÓMO LLEGAR</h2>
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <div style="font-size: 13px; font-weight: 700; letter-spacing: 0.1em; color: ${ACCENT};">DIRECCIÓN</div>
          <div style="font-size: 18px; color: var(--text);">C. Trillo, 15, Seseña (Toledo)</div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <div style="font-size: 13px; font-weight: 700; letter-spacing: 0.1em; color: ${ACCENT};">HORARIO</div>
          <div style="font-size: 18px; color: var(--text);">Viernes y sábado · 00:00 — 06:00</div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <div style="font-size: 13px; font-weight: 700; letter-spacing: 0.1em; color: ${ACCENT};">RESERVAS</div>
          <div style="font-size: 18px; color: var(--text);">+34 653 53 35 49</div>
        </div>
      </div>
      <div class="cta-row" style="display: flex; flex-wrap: wrap; gap: 12px; margin-top: 8px;">
        <a href="https://wa.me/34653533549" class="btn" style="font-size: 15px; padding: 16px 30px;">ESCRÍBENOS POR WHATSAPP</a>
        <a href="https://www.google.com/maps/search/?api=1&amp;query=${MAP_QUERY}" target="_blank" rel="noopener" class="btn-outline" style="font-size: 15px; padding: 16px 30px;">ABRIR EN GOOGLE MAPS</a>
      </div>
    </div>
    <div id="map-box" style="position: relative; min-height: clamp(300px, 80vw, 420px); border-radius: 20px; overflow: hidden; border: 1px solid var(--line); background: var(--bg-card); display: flex; align-items: center; justify-content: center; padding: 24px; box-sizing: border-box;">
      <div id="map-gate" style="display: flex; flex-direction: column; align-items: center; gap: 14px; max-width: 360px; text-align: center;">
        <div class="display" style="font-size: 30px; color: var(--text);">MAPA</div>
        <p style="margin: 0; font-size: 13px; line-height: 1.5; color: var(--text-dim);">Al pulsar, se carga el mapa de Google Maps y tu navegador se conecta con Google. <a href="/cookies" style="text-decoration: underline;">Más información</a></p>
        <button type="button" id="map-load" class="btn" data-src="https://www.google.com/maps?q=${MAP_QUERY}&amp;output=embed&amp;hl=es">VER MAPA</button>
      </div>
    </div>
  </div>

  <!-- FOOTER -->
  <div style="width: 100%; box-sizing: border-box; padding: clamp(40px, 6vw, 64px) var(--px) 32px var(--px); background: var(--bg);" class="footer-grid">
    <div style="display: flex; flex-direction: column; gap: 12px;">
      <img src="/images/logo.png" alt="Coyote Club" style="height: 34px; width: auto; align-self: flex-start; display: block;">
      <div style="font-size: 14px; line-height: 1.5; color: var(--text-dim);">La sala de referencia de Seseña. Pista, barra y reservados hasta que salga el sol.</div>
    </div>
    <div style="display: flex; flex-direction: column; gap: 10px;">
      <div style="font-size: 13px; font-weight: 700; letter-spacing: 0.08em; color: var(--text);">HORARIO</div>
      <div style="font-size: 14px; color: var(--text-dim);">Viernes: 00:00 — 06:00</div>
      <div style="font-size: 14px; color: var(--text-dim);">Sábado: 00:00 — 06:00</div>
    </div>
    <div style="display: flex; flex-direction: column; gap: 10px;">
      <div style="font-size: 13px; font-weight: 700; letter-spacing: 0.08em; color: var(--text);">VISÍTANOS</div>
      <div style="font-size: 14px; color: var(--text-dim);">C. Trillo, 15, Seseña (Toledo)</div>
      <div style="font-size: 14px; color: var(--text-dim);">+34 653 53 35 49</div>
    </div>
    <div style="display: flex; flex-direction: column; gap: 10px;">
      <div style="font-size: 13px; font-weight: 700; letter-spacing: 0.08em; color: var(--text);">SÍGUENOS</div>
      <div style="display: flex; gap: 16px;">
        <a href="https://instagram.com/coyotteclub" aria-label="Instagram" style="display: flex; align-items: center;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="5"></rect><circle cx="12" cy="12" r="4"></circle><circle cx="17.2" cy="6.8" r="1"></circle></svg>
        </a>
        <a href="https://wa.me/34653533549" aria-label="WhatsApp" style="display: flex; align-items: center;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" stroke-width="1.6"><path d="M20 12a8 8 0 1 1-3.6-6.7"></path><path d="M20 12 L16 8"></path></svg>
        </a>
      </div>
    </div>
  </div>
  <div style="width: 100%; box-sizing: border-box; padding: 20px var(--px) 28px; border-top: 1px solid var(--line); display: flex; flex-direction: column; align-items: center; gap: 14px; text-align: center;">
    ${paymentLogosHtml()}
    ${legalLinksHtml()}
    <div style="font-size: 12px; color: var(--text-dim);">© Coyote Club · Seseña, Toledo</div>
  </div>

</div>`;

  const pageCss = `
    :root{--px:clamp(20px,5vw,64px);}
    [id]{scroll-margin-top:72px;}
    /* Misma posición y tamaño que el logo dentro del fotograma del vídeo, para que el cambio no dé salto */
    .logo-fallback{position:absolute;left:22%;top:12.3%;width:56.4%;height:71.5%;object-fit:contain;transition:opacity .5s ease;pointer-events:none;}
    .logo-live .logo-fallback{opacity:0;}
    .nav-links{display:flex;align-items:center;gap:clamp(24px,3vw,40px);}
    .nav-toggle,.nav-burger{display:none;}
    .stats{width:100%;box-sizing:border-box;padding:32px var(--px);display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);background:var(--bg-alt);}
    .stat{display:flex;flex-direction:column;gap:4px;}
    .stat-mid{border-left:1px solid var(--line);border-right:1px solid var(--line);padding-left:24px;}
    .stat-last{padding-left:24px;}
    .club-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;}
    .event-cta{align-self:flex-start;}
    .gallery-wrap{padding:0 var(--px);display:flex;flex-wrap:wrap;gap:4px;justify-content:center;}
    .gallery-item{height:380px;max-width:100%;overflow:hidden;}
    .gallery-item img{height:100%;width:auto;max-width:100%;object-fit:cover;display:block;}
    .footer-grid{width:100%;box-sizing:border-box;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:40px;}
    @media (max-width:1180px){
      .nav-toggle{display:block;position:absolute;right:var(--px);top:50%;transform:translateY(-50%);width:44px;height:44px;margin:0;padding:0;border:0;opacity:0;z-index:2;cursor:pointer;}
      .nav-burger{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;width:44px;height:44px;}
      .nav-burger span{display:block;width:24px;height:2px;background:var(--text);border-radius:2px;transition:transform .2s ease,opacity .2s ease;}
      .nav-toggle:checked + .nav-burger span:nth-child(1){transform:translateY(7px) rotate(45deg);}
      .nav-toggle:checked + .nav-burger span:nth-child(2){opacity:0;}
      .nav-toggle:checked + .nav-burger span:nth-child(3){transform:translateY(-7px) rotate(-45deg);}
      .nav-toggle:focus-visible + .nav-burger{outline:2px solid var(--accent);outline-offset:2px;border-radius:8px;}
      .nav-links{display:none;position:absolute;top:100%;left:0;right:0;flex-direction:column;align-items:stretch;gap:0;padding:6px var(--px) 22px;background:rgba(11,11,12,0.98);border-bottom:1px solid var(--line);max-height:calc(100vh - 70px);overflow-y:auto;}
      .nav-toggle:checked ~ .nav-links{display:flex;}
      .nav-links a.link-underline{padding:16px 0;border-bottom:1px solid var(--line);font-size:16px !important;}
      .nav-links .btn{margin-top:18px;padding:16px 22px !important;font-size:15px !important;}
    }
    @media (max-width:1000px){
      .footer-grid{grid-template-columns:repeat(2,minmax(0,1fr));}
    }
    @media (max-width:700px){
      .topbar{flex-direction:column;justify-content:center !important;gap:2px;text-align:center;}
      .stats{grid-template-columns:1fr;gap:0;}
      .stat{padding:16px 0;}
      .stat-mid{border-left:0;border-right:0;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding-left:0;}
      .stat-last{padding-left:0;}
      .cta-row > a,.cta-row > div{flex:1 1 100%;}
      .event-cta{align-self:stretch;}
      .gallery-wrap{gap:6px;}
      .gallery-item{height:auto;aspect-ratio:1/1;flex:1 1 calc(50% - 6px);max-width:calc(50% - 3px);}
      .gallery-item img{width:100%;height:100%;}
    }
    @media (max-width:640px){
      .club-grid{grid-template-columns:1fr;}
      .footer-grid{grid-template-columns:1fr;}
    }
    a.link-underline:hover{color:${ACCENT};}
    @keyframes reveal-up{from{opacity:0;transform:translateY(28px);}to{opacity:1;transform:translateY(0);}}
    .reveal,.reveal-d1,.reveal-d2{opacity:0;transform:translateY(28px);transition:opacity 0.6s ease-out, transform 0.6s ease-out;}
    .reveal.is-visible,.reveal-d1.is-visible,.reveal-d2.is-visible{opacity:1;transform:translateY(0);}
    .reveal-d1{transition-delay:0.15s;}
    .reveal-d2{transition-delay:0.3s;}
    .img-hover{overflow:hidden;}
    .img-hover img{transition:transform 0.5s ease, filter 0.5s ease;}
    .img-hover:hover img{transform:scale(1.08);filter:brightness(0.75);}
  `;

  const pageScript = `
    (function () {
      var els = document.querySelectorAll('.reveal, .reveal-d1, .reveal-d2');
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
      els.forEach(function (el) { io.observe(el); });

      var navToggle = document.getElementById('nav-toggle');
      if (navToggle) {
        document.querySelectorAll('.nav-links a').forEach(function (a) {
          a.addEventListener('click', function () { navToggle.checked = false; });
        });
      }

      var mapBtn = document.getElementById('map-load');
      var mapBox = document.getElementById('map-box');
      if (mapBtn && mapBox) {
        mapBtn.addEventListener('click', function () {
          var f = document.createElement('iframe');
          f.title = 'Ubicación de Coyote Club en Google Maps';
          f.src = mapBtn.getAttribute('data-src');
          f.setAttribute('allowfullscreen', '');
          f.referrerPolicy = 'no-referrer-when-downgrade';
          f.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;';
          mapBox.appendChild(f);
          var gate = document.getElementById('map-gate');
          if (gate) gate.style.display = 'none';
        });
      }

      var video = document.getElementById('logo-matte-video');
      var canvas = document.getElementById('logo-canvas');
      var box = document.getElementById('logo-box');
      if (video && canvas && box && canvas.getContext) {
        var ctx = canvas.getContext('2d');
        var off = document.createElement('canvas');
        var offCtx = off.getContext('2d', { willReadFrequently: true });
        var out = null;
        var lastT = -1;
        var live = false;
        function tryPlay() {
          video.muted = true;
          var p = video.play();
          if (p && p.catch) p.catch(function () {});
        }
        function draw() {
          requestAnimationFrame(draw);
          // Mientras el vídeo no esté reproduciéndose (autoplay bloqueado, ahorro de batería...) se ve el logo estático.
          var playing = !video.paused && !video.ended && video.currentTime > 0;
          if (playing !== live) { live = playing; box.classList.toggle('logo-live', live); }
          if (document.hidden || !video.videoWidth || video.readyState < 2) return;
          if (video.currentTime === lastT) return; // no hay fotograma nuevo: no se repinta
          lastT = video.currentTime;
          var w = video.videoWidth;
          var fullH = video.videoHeight;
          var h = fullH / 2;
          if (!out || off.width !== w || off.height !== fullH) {
            off.width = w; off.height = fullH;
            canvas.width = w; canvas.height = h;
            out = ctx.createImageData(w, h);
          }
          offCtx.drawImage(video, 0, 0, w, fullH);
          var src = offCtx.getImageData(0, 0, w, fullH).data;
          var dst = out.data;
          var half = w * h * 4;
          for (var i = 0; i < half; i += 4) {
            dst[i] = src[i];
            dst[i + 1] = src[i + 1];
            dst[i + 2] = src[i + 2];
            dst[i + 3] = src[i + half];
          }
          ctx.putImageData(out, 0, 0);
        }
        // Algunos móviles (iPhone en ahorro de batería, ahorro de datos...) bloquean el autoplay hasta que se toca la pantalla.
        var gestures = ['touchend', 'pointerup', 'click', 'keydown'];
        function onGesture() { if (video.paused) tryPlay(); }
        gestures.forEach(function (ev) { window.addEventListener(ev, onGesture, { passive: true }); });
        video.addEventListener('playing', function () {
          gestures.forEach(function (ev) { window.removeEventListener(ev, onGesture); });
        });
        video.addEventListener('canplay', function () { if (video.paused) tryPlay(); });
        video.addEventListener('ended', function () {
          video.currentTime = 0;
          tryPlay();
        });
        document.addEventListener('visibilitychange', function () {
          if (!document.hidden && video.paused) tryPlay();
        });
        if (window.IntersectionObserver) {
          new IntersectionObserver(function (entries) {
            if (entries[0].isIntersecting && video.paused) tryPlay();
          }).observe(box);
        }
        tryPlay();
        draw();
      }
    })();
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: pageCss }} />
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <script dangerouslySetInnerHTML={{ __html: pageScript }} />
    </>
  );
}

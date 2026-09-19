import { supabaseAdmin } from '@/lib/supabase';
import { esc, formatEventDate, formatPrice } from '@/lib/format';

export const dynamic = 'force-dynamic';

const ACCENT = '#ff149c';
const MAP_QUERY = encodeURIComponent('Coyote Club, C. Trillo, 15, Seseña, Toledo');

export default async function Home() {
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
        <div style="display: flex; flex-direction: column; justify-content: space-between; gap: 24px; padding: 32px; flex-grow: 1;">
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div class="display" style="font-size: 36px; color: var(--text);">${esc(evt.title)}</div>
            <div style="font-size: 15px; color: var(--text-dim);">${esc(sub)}</div>
          </div>
          <a href="/entradas" class="btn" style="align-self: flex-start;">Apúntate →</a>
        </div>
      </div>`;
    })
    .join('');

  const tiersHtml = (tiers || [])
    .map((tier) => {
      const price = formatPrice(tier.price_cents);
      const cta =
        tier.kind === 'door'
          ? `<div class="btn-outline" style="text-align: center;">Pago en caja</div>`
          : `<a href="/entradas" class="btn" style="text-align: center;">${tier.kind === 'standing' ? 'Comprar' : 'Comprar entrada'}</a>`;
      return `
      <div style="display: flex; flex-direction: column; gap: 24px; padding: 44px 32px; border-radius: 20px; background: var(--bg-card); border: 1px solid var(--line);">
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <div style="font-size: 14px; font-weight: 700; letter-spacing: 0.1em; color: ${tier.kind === 'door' ? 'var(--text-dim)' : ACCENT};">${esc(tier.label)}</div>
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
      return `<div class="${revealClass} img-hover" style="height: 380px; overflow: hidden;"><img src="${esc(img.url)}" alt="${esc(img.alt)}" style="height: 100%; width: auto; object-fit: cover; display: block;"></div>`;
    })
    .join('');

  const html = `
<div style="width: 100%; background: var(--bg); display: flex; flex-direction: column;">

  <!-- TOP BAR -->
  <div style="width: 100%; box-sizing: border-box; padding: 10px 64px; display: flex; align-items: center; justify-content: space-between; background: #050505; border-bottom: 1px solid var(--line);">
    <div style="font-size: 12px; letter-spacing: 0.05em; color: var(--text-dim);">ABIERTO · VIERNES Y SÁBADO · 00:00 — 06:00</div>
    <div style="font-size: 12px; letter-spacing: 0.05em; color: var(--text-dim);">+34 653 53 35 49 · Seseña Viejo, Toledo</div>
  </div>

  <!-- NAV -->
  <div style="position: sticky; top: 0; z-index: 20; width: 100%; box-sizing: border-box; display: flex; align-items: center; justify-content: space-between; padding: 18px 64px; background: rgba(11,11,12,0.9); backdrop-filter: blur(6px); border-bottom: 1px solid var(--line);">
    <a href="/" style="display: flex; align-items: center;">
      <img src="/images/logo.png" alt="Coyote Club" style="height: 30px; width: auto; display: block; filter: drop-shadow(0 0 10px rgba(255,20,150,0.4));">
    </a>
    <div style="display: flex; align-items: center; gap: 40px;">
      <a class="link-underline" href="#coyote" style="font-size: 14px; font-weight: 600; letter-spacing: 0.05em; color: var(--text-dim);">EL CLUB</a>
      <a class="link-underline" href="#eventos" style="font-size: 14px; font-weight: 600; letter-spacing: 0.05em; color: var(--text-dim);">EVENTOS</a>
      <a class="link-underline" href="/entradas" style="font-size: 14px; font-weight: 600; letter-spacing: 0.05em; color: var(--text-dim);">ENTRADAS</a>
      <a class="link-underline" href="#galeria" style="font-size: 14px; font-weight: 600; letter-spacing: 0.05em; color: var(--text-dim);">GALERÍA</a>
      <a class="link-underline" href="#como-llegar" style="font-size: 14px; font-weight: 600; letter-spacing: 0.05em; color: var(--text-dim);">CÓMO LLEGAR</a>
      <a href="https://wa.me/34653533549" class="btn" style="font-size: 13px; padding: 12px 22px;">RESERVA POR WHATSAPP</a>
    </div>
  </div>

  <!-- HERO -->
  <div style="position: relative; width: 100%; box-sizing: border-box; overflow: hidden; padding: 100px 64px 90px 64px; display: flex; flex-direction: column; align-items: flex-start; gap: 28px; background-image: radial-gradient(ellipse at 15% 0%, rgba(255,42,122,0.28), transparent 55%), radial-gradient(ellipse at 85% 20%, rgba(130,60,255,0.18), transparent 50%), linear-gradient(90deg, rgba(11,11,12,0.98) 0%, rgba(11,11,12,0.92) 30%, rgba(11,11,12,0.72) 55%, rgba(11,11,12,0.4) 80%, rgba(11,11,12,0.15) 100%), url(/images/hero.png); background-size: auto, auto, auto, cover; background-position: center, center, center, center 30%; background-repeat: no-repeat, no-repeat, no-repeat, no-repeat;">
    <svg style="position: absolute; inset: 0; width: 100%; height: 100%; z-index: 0;" viewBox="0 0 1440 640" preserveAspectRatio="none">
      <line x1="1180" y1="-40" x2="900" y2="680" stroke="${ACCENT}" stroke-width="2" opacity="0.35"></line>
      <line x1="1260" y1="-40" x2="980" y2="680" stroke="#823cff" stroke-width="2" opacity="0.25"></line>
      <line x1="1340" y1="-40" x2="1060" y2="680" stroke="${ACCENT}" stroke-width="1.5" opacity="0.18"></line>
    </svg>
    <div style="position: relative; z-index: 1; filter: drop-shadow(0 0 24px rgba(255,20,150,0.5));">
      <video id="logo-matte-video" src="/video/logo-loop.mp4" autoplay loop muted playsinline style="position: absolute; top: 0; left: 0; height: 160px; width: auto; opacity: 0; pointer-events: none; z-index: -1;"></video>
      <canvas id="logo-canvas" style="height: 160px; width: auto; display: block;"></canvas>
    </div>
    <div style="position: relative; z-index: 1; font-size: 15px; font-weight: 600; letter-spacing: 0.14em; color: ${ACCENT};">SESEÑA (TOLEDO) · VIERNES Y SÁBADOS</div>
    <h1 style="position: relative; z-index: 1; margin: 0; font-size: 100px; line-height: 0.95; max-width: 900px; color: var(--text);">LA MEJOR<br>SALA DE LA ZONA</h1>
    <p style="position: relative; z-index: 1; margin: 0; max-width: 560px; font-size: 19px; line-height: 1.5; color: var(--text-dim);">Pista, barra y la mejor selección de cócteles, abierto hasta las 6 de la mañana.</p>
    <div style="position: relative; z-index: 1; display: flex; gap: 16px; margin-top: 12px;">
      <a href="/entradas" class="btn" style="font-size: 15px; padding: 18px 34px;">ENTRADAS →</a>
      <a href="#eventos" class="btn-outline" style="font-size: 15px; padding: 18px 34px;">VER EVENTOS</a>
    </div>
  </div>

  <!-- STATS BAR -->
  <div style="width: 100%; box-sizing: border-box; padding: 32px 64px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); background: var(--bg-alt);">
    <div style="display: flex; flex-direction: column; gap: 4px;">
      <div class="display" style="font-size: 32px; color: var(--text);">4.0 <span style="color: ${ACCENT};">★</span></div>
      <div style="font-size: 13px; color: var(--text-dim);">174 reseñas en Google</div>
    </div>
    <div style="display: flex; flex-direction: column; gap: 4px; border-left: 1px solid var(--line); border-right: 1px solid var(--line); padding-left: 24px;">
      <div class="display" style="font-size: 32px; color: var(--text);">00:00–06:00</div>
      <div style="font-size: 13px; color: var(--text-dim);">Viernes y sábados</div>
    </div>
    <div style="display: flex; flex-direction: column; gap: 4px; padding-left: 24px;">
      <div class="display" style="font-size: 32px; color: var(--text);">SESEÑA VIEJO</div>
      <div style="font-size: 13px; color: var(--text-dim);">C/ Trillo · Toledo</div>
    </div>
  </div>

  <!-- EL CLUB -->
  <div id="coyote" style="width: 100%; box-sizing: border-box; padding: 120px 64px 64px 64px; display: flex; flex-direction: column; gap: 40px;">
    <div style="display: flex; flex-direction: column; gap: 16px; max-width: 760px;">
      <h2 style="margin: 0; font-size: 56px; color: var(--text);">EL CLUB</h2>
      <p style="margin: 0; font-size: 17px; line-height: 1.6; color: var(--text-dim);">Coyote Club es la sala de referencia de Seseña, con pista, barra y zona de reservados en un único espacio pensado para bailar hasta que salga el sol.</p>
    </div>
    <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px;">
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
  <div id="eventos" style="width: 100%; box-sizing: border-box; padding: 64px 64px 120px 64px; display: flex; flex-direction: column; gap: 48px;">
    <div style="display: flex; align-items: flex-end; justify-content: space-between;">
      <h2 style="margin: 0; font-size: 56px; color: var(--text);">ESTA SEMANA EN COYOTE</h2>
      <a class="link-underline" href="https://instagram.com/coyotteclub" style="font-size: 14px; font-weight: 600; color: var(--text-dim);">Cartel completo en Instagram →</a>
    </div>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; max-width: 1400px;">
      ${eventsHtml || '<div style="color: var(--text-dim); font-size: 15px;">Sin eventos publicados por ahora.</div>'}
    </div>
  </div>

  <!-- ENTRADAS -->
  <div id="entradas-preview" style="width: 100%; box-sizing: border-box; padding: 0 64px 120px 64px; display: flex; flex-direction: column; gap: 40px;">
    <div style="display: flex; flex-direction: column; gap: 16px; max-width: 760px;">
      <h2 style="margin: 0; font-size: 56px; color: var(--text);">ENTRADAS</h2>
      <p style="margin: 0; font-size: 17px; line-height: 1.6; color: var(--text-dim);">Asegura tu entrada online. El precio sube según se acerca la fecha, así que cuanto antes la compres, menos pagas.</p>
    </div>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 24px; max-width: 1320px;">
      ${tiersHtml}
    </div>
    <div style="font-size: 13px; color: var(--text-dim);">Pago seguro con tarjeta · Redsys</div>
  </div>

  <!-- GALERÍA -->
  <div id="galeria" style="width: 100%; box-sizing: border-box; padding: 0 0 8px 0; display: flex; flex-direction: column; gap: 24px;">
    <div style="padding: 0 64px; display: flex; align-items: flex-end; justify-content: space-between;">
      <h2 style="margin: 0; font-size: 44px; color: var(--text);">GALERÍA</h2>
      <a class="link-underline" href="https://instagram.com/coyotteclub" style="font-size: 14px; font-weight: 600; color: var(--text-dim);">@coyotteclub en Instagram →</a>
    </div>
    <div style="padding: 0 64px; display: flex; flex-wrap: wrap; gap: 4px; justify-content: center;">
      ${galleryHtml}
    </div>
    <div style="padding: 0 64px; text-align: center;">
      <div style="font-size: 13px; color: var(--text-dim);">Más fotos próximamente</div>
    </div>
  </div>

  <!-- COMO LLEGAR -->
  <div id="como-llegar" style="width: 100%; box-sizing: border-box; padding: 100px 64px; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 64px; background: var(--bg-alt); border-top: 1px solid var(--line);">
    <div style="display: flex; flex-direction: column; gap: 28px;">
      <h2 style="margin: 0; font-size: 44px; color: var(--text);">CÓMO LLEGAR</h2>
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
      <div style="display: flex; flex-wrap: wrap; gap: 12px; margin-top: 8px;">
        <a href="https://wa.me/34653533549" class="btn" style="font-size: 15px; padding: 16px 30px;">ESCRÍBENOS POR WHATSAPP</a>
        <a href="https://www.google.com/maps/search/?api=1&amp;query=${MAP_QUERY}" target="_blank" rel="noopener" class="btn-outline" style="font-size: 15px; padding: 16px 30px;">ABRIR EN GOOGLE MAPS</a>
      </div>
    </div>
    <div style="position: relative; min-height: 420px; border-radius: 20px; overflow: hidden; border: 1px solid var(--line); background: var(--bg-card);">
      <iframe title="Ubicación de Coyote Club en Google Maps" src="https://www.google.com/maps?q=${MAP_QUERY}&amp;output=embed&amp;hl=es" style="position: absolute; inset: 0; width: 100%; height: 100%; border: 0;" loading="lazy" allowfullscreen referrerpolicy="no-referrer-when-downgrade"></iframe>
    </div>
  </div>

  <!-- FOOTER -->
  <div style="width: 100%; box-sizing: border-box; padding: 64px 64px 32px 64px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 40px; background: var(--bg);">
    <div style="display: flex; flex-direction: column; gap: 12px;">
      <div class="display" style="font-size: 24px; line-height: 1; color: var(--text);">COYOTE <span style="color: ${ACCENT};">CLUB</span></div>
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
  <div style="width: 100%; box-sizing: border-box; padding: 20px 64px; border-top: 1px solid var(--line); text-align: center;">
    <div style="font-size: 12px; color: var(--text-dim);">© Coyote Club · Seseña, Toledo</div>
  </div>

</div>`;

  const pageCss = `
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

      var video = document.getElementById('logo-matte-video');
      var canvas = document.getElementById('logo-canvas');
      if (video && canvas && canvas.getContext) {
        var ctx = canvas.getContext('2d');
        var off = document.createElement('canvas');
        var offCtx = off.getContext('2d');
        function draw() {
          requestAnimationFrame(draw);
          if (!video.videoWidth || video.readyState < 2) return;
          var w = video.videoWidth;
          var fullH = video.videoHeight;
          var h = fullH / 2;
          if (off.width !== w || off.height !== fullH) {
            off.width = w; off.height = fullH;
            canvas.width = w; canvas.height = h;
          }
          offCtx.drawImage(video, 0, 0, w, fullH);
          var colorData = offCtx.getImageData(0, 0, w, h);
          var alphaData = offCtx.getImageData(0, h, w, h);
          var out = ctx.createImageData(w, h);
          for (var i = 0; i < colorData.data.length; i += 4) {
            out.data[i] = colorData.data[i];
            out.data[i + 1] = colorData.data[i + 1];
            out.data[i + 2] = colorData.data[i + 2];
            out.data[i + 3] = alphaData.data[i];
          }
          ctx.putImageData(out, 0, 0);
        }
        video.play().catch(function () {});
        video.addEventListener('ended', function () {
          video.currentTime = 0;
          video.play().catch(function () {});
        });
        document.addEventListener('visibilitychange', function () {
          if (!document.hidden && video.paused) video.play().catch(function () {});
        });
        draw();
      }
    })();
  `;

  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@400;500;600;700&display=swap"
      />
      <style dangerouslySetInnerHTML={{ __html: pageCss }} />
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <script dangerouslySetInnerHTML={{ __html: pageScript }} />
    </>
  );
}

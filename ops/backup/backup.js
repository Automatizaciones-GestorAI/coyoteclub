#!/usr/bin/env node
/*
 * Copia de seguridad de los datos de Coyote Club (Supabase) en un archivo local comprimido.
 *
 * - Exporta las tablas de la web (entradas, cobros, eventos, tramos, usuarios del panel...) a
 *   /root/backups/coyote-club/coyote-AAAA-MM-DD_HHMMSS.json.gz  (permisos 600) y guarda las últimas 30.
 * - Vuelve a leer el archivo y comprueba que los recuentos coinciden ANTES de darlo por bueno.
 * - La clave de Supabase se lee del contenedor en marcha (docker inspect): no se guarda en ningún archivo.
 * - Si falla, sale con código 1 y lo deja escrito en el log.
 *
 * Variables opcionales: SUPABASE_URL + SUPABASE_SERVICE_KEY (para otro proyecto o pruebas),
 * BACKUP_DIR (carpeta), BACKUP_KEEP (cuántas copias guardar, mínimo 3).
 * Las imágenes subidas desde el panel (Storage) NO se incluyen: solo la base de datos.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { execFileSync } = require('child_process');

const DIR = process.env.BACKUP_DIR || '/root/backups/coyote-club';
const KEEP = Math.max(3, Number(process.env.BACKUP_KEEP || 30));
const PAGE = 1000;
// Orden pensado para poder restaurar (las tablas con claves ajenas van después de las que referencian).
const TABLES = ['events', 'price_tiers', 'gallery_images', 'tickets', 'payment_events', 'ticket_audit', 'admin_users'];

const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function credentials() {
  const url = (process.env.SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_KEY || '').trim();
  if (url && key) return { url: url.replace(/\/+$/, ''), key };
  const id = execFileSync('docker', ['ps', '-q', '--filter', 'name=coyote-club_web']).toString().trim().split('\n')[0];
  if (!id) throw new Error('no encuentro el contenedor coyote-club_web (¿está parado?)');
  const env = JSON.parse(execFileSync('docker', ['inspect', id, '--format', '{{json .Config.Env}}']).toString());
  const get = (name) => (env.find((e) => e.startsWith(name + '=')) || '').slice(name.length + 1).trim();
  const u = get('NEXT_PUBLIC_SUPABASE_URL');
  const k = get('SUPABASE_SERVICE_ROLE_KEY');
  if (!u || !k) throw new Error('el contenedor no tiene NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  return { url: u.replace(/\/+$/, ''), key: k };
}

async function request(ctx, pathAndQuery) {
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(`${ctx.url}/rest/v1/${pathAndQuery}`, {
        headers: { apikey: ctx.key, Authorization: `Bearer ${ctx.key}`, Prefer: 'count=exact' },
        signal: AbortSignal.timeout(60_000)
      });
      if (res.ok) return res;
      const body = (await res.text().catch(() => '')).slice(0, 200);
      lastError = new Error(`HTTP ${res.status} ${body}`);
      if (res.status < 500 && res.status !== 429) break; // un error de petición no se arregla reintentando
    } catch (e) {
      lastError = e;
    }
    await sleep(1500 * attempt);
  }
  throw lastError;
}

// Lee la tabla entera por páginas, siguiendo el id (así no se pierde ni se repite nada si entra una venta mientras tanto).
async function dumpTable(ctx, table) {
  const rows = [];
  let last = null;
  let expected = null;
  for (;;) {
    const res = await request(ctx, `${table}?select=*&order=id.asc&limit=${PAGE}` + (last ? `&id=gt.${last}` : ''));
    if (expected === null) {
      const m = (res.headers.get('content-range') || '').match(/\/(\d+)$/);
      expected = m ? Number(m[1]) : null;
    }
    const page = await res.json();
    rows.push(...page);
    if (page.length < PAGE) break;
    last = page[page.length - 1].id;
  }
  if (expected !== null && rows.length < expected) throw new Error(`${table}: se esperaban ${expected} filas y se leyeron ${rows.length}`);
  return rows;
}

(async () => {
  const ctx = credentials();
  fs.mkdirSync(DIR, { recursive: true, mode: 0o700 });
  fs.chmodSync(DIR, 0o700);
  for (const f of fs.readdirSync(DIR)) if (f.endsWith('.part')) fs.unlinkSync(path.join(DIR, f)); // restos de un intento anterior

  const tables = {};
  const counts = {};
  for (const t of TABLES) {
    tables[t] = await dumpTable(ctx, t);
    counts[t] = tables[t].length;
  }

  const now = new Date();
  const stamp = now.toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15); // AAAAMMDD_HHMMSS (UTC)
  const payload = { format: 'coyote-club-backup', version: 1, exported_at: now.toISOString(), source: new URL(ctx.url).host, counts, tables };
  const gz = zlib.gzipSync(Buffer.from(JSON.stringify(payload)), { level: 9 });
  const file = path.join(DIR, `coyote-${stamp}.json.gz`);
  const tmp = file + '.part';
  fs.writeFileSync(tmp, gz, { mode: 0o600 });

  // Comprobación: se vuelve a leer lo escrito y se comparan los recuentos.
  const back = JSON.parse(zlib.gunzipSync(fs.readFileSync(tmp)).toString());
  for (const t of TABLES) {
    if (!Array.isArray(back.tables?.[t]) || back.tables[t].length !== counts[t]) throw new Error(`la comprobación falló en ${t}`);
  }
  fs.renameSync(tmp, file);
  fs.writeFileSync(path.join(DIR, 'ultima-copia-ok.txt'), `${now.toISOString()} ${path.basename(file)}\n`, { mode: 0o600 });

  const files = fs.readdirSync(DIR).filter((f) => /^coyote-.*\.json\.gz$/.test(f)).sort();
  while (files.length > KEEP) fs.unlinkSync(path.join(DIR, files.shift()));

  log(`copia OK: ${path.basename(file)} (${(gz.length / 1024).toFixed(1)} KB) · ` + Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(' ') + ` · guardadas ${files.length}`);
})().catch((e) => {
  log('ERROR: ' + (e && e.message ? e.message : e));
  process.exit(1);
});

#!/usr/bin/env node
/*
 * Restaura una copia hecha con backup.js en un proyecto de Supabase.
 *
 *   SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_KEY=... node restore.js <copia.json.gz> [--yes]
 *
 * - Por seguridad NO detecta el destino solo: hay que indicarlo, y sin --yes solo enseña lo que haría.
 * - Es una FUSIÓN: inserta lo que falta y sobrescribe las filas con el mismo id. No borra nada.
 * - El destino debe tener ya las tablas (aplica antes las migraciones de supabase/migrations en orden).
 */
'use strict';
const fs = require('fs');
const zlib = require('zlib');

const TABLES = ['events', 'price_tiers', 'gallery_images', 'tickets', 'payment_events', 'ticket_audit', 'admin_users'];
const BATCH = 500;

(async () => {
  const [file, flag] = process.argv.slice(2);
  const url = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const key = (process.env.SUPABASE_SERVICE_KEY || '').trim();
  if (!file || !url || !key) {
    console.error('Uso: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node restore.js <copia.json.gz> [--yes]');
    process.exit(2);
  }
  const data = JSON.parse(zlib.gunzipSync(fs.readFileSync(file)).toString());
  if (data.format !== 'coyote-club-backup') throw new Error('el archivo no es una copia de Coyote Club');

  console.log(`Copia del ${data.exported_at} (origen ${data.source}) → destino ${new URL(url).host}`);
  for (const t of TABLES) console.log(`  ${t.padEnd(16)} ${String(data.tables[t]?.length ?? 0).padStart(6)} filas`);
  if (flag !== '--yes') {
    console.log('\nNo se ha escrito nada. Para restaurar de verdad, repite el comando añadiendo --yes');
    process.exit(2);
  }

  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  for (const t of TABLES) {
    const rows = data.tables[t] || [];
    for (let i = 0; i < rows.length; i += BATCH) {
      const res = await fetch(`${url}/rest/v1/${t}?on_conflict=id`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(rows.slice(i, i + BATCH))
      });
      if (!res.ok) throw new Error(`${t}: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
    }
  }
  // Comprobación: el destino debe tener al menos tantas filas como la copia.
  let bad = 0;
  for (const t of TABLES) {
    const res = await fetch(`${url}/rest/v1/${t}?select=id&limit=1`, { headers: { ...headers, Prefer: 'count=exact' } });
    const total = Number(((res.headers.get('content-range') || '').match(/\/(\d+)$/) || [])[1]);
    const want = data.tables[t]?.length ?? 0;
    const ok = total >= want;
    if (!ok) bad++;
    console.log(`  ${ok ? 'ok ' : 'MAL'} ${t.padEnd(16)} destino=${total} copia=${want}`);
  }
  if (bad) throw new Error('la comprobación final no cuadra');
  console.log('Restauración terminada.');
})().catch((e) => {
  console.error('ERROR: ' + (e && e.message ? e.message : e));
  process.exit(1);
});

# Copias de seguridad de los datos

## Punto de partida (2026-09-21)

La base de datos está en **Supabase, plan gratuito** (proyecto `bfheyibfyiafznehjzjf`, región UE-Irlanda, ~11 MB). En ese plan:

- **No hay copias automáticas ni descargables.** Supabase recomienda que los proyectos gratuitos se exporten ellos mismos.
- **El proyecto se pausa** si tiene muy poca actividad durante 7 días (aviso por email una semana antes; se puede reanudar desde el panel
  durante 90 días). Con el proyecto pausado la web no puede leer ni vender.
- No hay soporte de Supabase.

El plan **Pro** (unos 25 $/mes por organización) da copias diarias con 7 días de historial, no se pausa y da soporte. Es lo recomendable
para un cliente real. Las copias de este documento son la red de seguridad mientras tanto (y siguen valiendo después como copia propia).

## Qué hay instalado

En el servidor (VPS), cada día a las **03:20** se ejecuta `/root/scripts/coyote-club/backup.js` (definido en `/etc/cron.d/coyote-club-backup`):

- Exporta las 7 tablas (`events`, `price_tiers`, `gallery_images`, `tickets`, `payment_events`, `ticket_audit`, `admin_users`) a
  `/root/backups/coyote-club/coyote-AAAAMMDD_HHMMSS.json.gz` (hora UTC), con permisos 600 (solo root). Guarda las **últimas 30**.
- Vuelve a leer el archivo y comprueba los recuentos antes de darlo por bueno; si algo falla, sale con error y lo escribe en `backup.log`.
- La clave de Supabase se lee del contenedor de la web en el momento; **no se guarda en ningún archivo**.
- Efecto secundario útil: la lectura diaria cuenta como actividad de la base de datos (ayuda a que no se pause, aunque no lo garantiza).

Comprobar que funciona:

```bash
cat /root/backups/coyote-club/ultima-copia-ok.txt   # fecha y archivo de la última copia correcta
tail -3 /root/backups/coyote-club/backup.log         # resultado de las últimas ejecuciones
```

Hacer una copia ahora mismo: `node /root/scripts/coyote-club/backup.js`. Para copiar más a menudo (por ejemplo cada hora los días de venta fuerte)
cambia `20 3 * * *` por `0 * * * *` en `/etc/cron.d/coyote-club-backup`. Para desinstalarlo: borra ese archivo.

## Restaurar (por ejemplo, a un proyecto Supabase nuevo)

1. Crea el proyecto en Supabase (o vacía las tablas del que tengas).
2. En el editor SQL del proyecto ejecuta, en este orden: `ops/backup/schema-base.sql` y después cada archivo de `supabase/migrations/`
   por orden alfabético.
3. Restaura los datos (sin `--yes` solo enseña lo que haría; con `--yes` escribe):

   ```bash
   SUPABASE_URL=https://NUEVO.supabase.co SUPABASE_SERVICE_KEY=LA_CLAVE_DE_SERVIDOR \
     node /root/scripts/coyote-club/restore.js /root/backups/coyote-club/coyote-XXXX.json.gz --yes
   ```
4. En EasyPanel (servicio `coyote-club / web`) actualiza `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y
   `SUPABASE_SERVICE_ROLE_KEY` con los del proyecto nuevo y despliega.

La restauración es una **fusión**: inserta lo que falta y sobrescribe las filas con el mismo id; no borra nada, y repetirla no duplica.
Está probada: con 1.234 entradas y datos en todas las tablas, tras vaciar la base y restaurar, quedó idéntica (recuento y contenido).

## Limitaciones

- La copia está en **el mismo servidor** que la web: si el servidor se pierde, se pierde también la copia. Falta enviarla fuera
  (por ejemplo a Google Drive con rclone, como las otras copias del servidor). Ojo: son datos personales de clientes (nombres y
  teléfonos), así que ese destino pasa a ser un proveedor más en la política de privacidad.
- Se pueden perder hasta 24 horas de datos entre una copia y la siguiente.
- **No incluye las imágenes subidas desde el panel** (carteles y galería en Supabase Storage), solo la base de datos.
- Ninguna copia avisa por sí sola si falla: hay que mirar `ultima-copia-ok.txt` o añadir un aviso (por ejemplo por Telegram).

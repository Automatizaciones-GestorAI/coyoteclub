'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { isUpcoming } from '@/lib/stock';

type Evt = {
  id: string;
  title: string;
  dj: string | null;
  event_date: string;
  event_time: string | null;
  poster_url: string | null;
  is_published: boolean;
  free_entry: boolean;
  sort_order: number;
  capacity: number | null;
};

const BLANK = { title: '', dj: '', event_date: '', event_time: '', poster_url: '', capacity: '264' };

export default function EventsClient({ initialEvents }: { initialEvents: Evt[] }) {
  const [events, setEvents] = useState(initialEvents);
  const [form, setForm] = useState(BLANK);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: '', dj: '', event_date: '', event_time: '', capacity: '' });
  const [notice, setNotice] = useState('');
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  async function uploadPoster(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', 'posters');
    const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
    const json = await res.json();
    setUploading(false);
    if (json.url) setForm((f) => ({ ...f, poster_url: json.url }));
  }

  async function createEvent(e: React.FormEvent) {
    e.preventDefault();
    setNotice('');
    const res = await fetch('/api/admin/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    const created = await res.json();
    if (!res.ok) return setNotice(created.error || 'No se pudo crear el evento.');
    setEvents((prev) => [...prev, created]);
    setForm(BLANK);
  }

  function startEdit(evt: Evt) {
    setNotice('');
    setEditing(evt.id);
    setDraft({ title: evt.title, dj: evt.dj || '', event_date: evt.event_date, event_time: evt.event_time || '', capacity: evt.capacity === null ? '' : String(evt.capacity) });
  }

  async function saveEdit(evt: Evt) {
    setNotice('');
    const res = await fetch(`/api/admin/events/${evt.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...evt, ...draft })
    });
    const updated = await res.json();
    if (!res.ok) return setNotice(updated.error || 'No se pudo guardar el evento.');
    setEvents((prev) => prev.map((e) => (e.id === evt.id ? updated : e)));
    setEditing(null);
    setNotice('Cambios guardados. Ya se ven en la web.');
  }

  async function togglePublished(evt: Evt) {
    const res = await fetch(`/api/admin/events/${evt.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...evt, is_published: !evt.is_published })
    });
    const updated = await res.json();
    if (!res.ok) return setNotice(updated.error || 'No se pudo cambiar el evento.');
    setEvents((prev) => prev.map((e) => (e.id === evt.id ? updated : e)));
  }

  async function toggleFreeEntry(evt: Evt) {
    const res = await fetch(`/api/admin/events/${evt.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...evt, free_entry: !evt.free_entry })
    });
    const updated = await res.json();
    if (!res.ok) return setNotice(updated.error || 'No se pudo cambiar el evento.');
    setEvents((prev) => prev.map((e) => (e.id === evt.id ? updated : e)));
  }

  async function deleteEvent(id: string) {
    if (!confirm('¿Borrar este evento? Si ya tuvo ventas, mejor ocúltalo en vez de borrarlo: las entradas vendidas se quedan pero pierden la noche a la que pertenecían.')) return;
    await fetch(`/api/admin/events/${id}`, { method: 'DELETE' });
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  // Las pasadas no se pierden (ni sus ventas): solo se pliegan aquí abajo para que el panel no se haga eterno.
  const upcoming = events.filter((e) => isUpcoming(e.event_date));
  const past = events.filter((e) => !isUpcoming(e.event_date));

  function renderCard(evt: Evt) {
    return (
      <div key={evt.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {evt.poster_url && (
          <img src={evt.poster_url} alt={evt.title} style={{ width: '100%', borderRadius: 10 }} />
        )}
        {editing === evt.id ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div><label className="label">Título / noche</label><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></div>
            <div><label className="label">DJ / lineup</label><input value={draft.dj} onChange={(e) => setDraft({ ...draft, dj: e.target.value })} /></div>
            <div><label className="label">Fecha</label><input type="date" value={draft.event_date} onChange={(e) => setDraft({ ...draft, event_date: e.target.value })} /></div>
            <div><label className="label">Hora</label><input value={draft.event_time} onChange={(e) => setDraft({ ...draft, event_time: e.target.value })} /></div>
            <div><label className="label">Aforo (personas)</label><input type="number" inputMode="numeric" min={0} step={1} value={draft.capacity} onChange={(e) => setDraft({ ...draft, capacity: e.target.value })} placeholder="Sin límite" /></div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontWeight: 700 }}>{evt.title}</div>
              {evt.free_entry && <span className="badge-low badge-green">Entrada gratis</span>}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>{evt.dj}</div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
              {evt.event_date} {evt.event_time}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
              Aforo: <strong style={{ color: 'var(--text)' }}>{evt.capacity === null ? 'sin límite' : `${evt.capacity} personas`}</strong>
            </div>
          </>
        )}
        <div className="actions">
          {editing === evt.id ? (
            <>
              <button className="btn btn-sm" onClick={() => saveEdit(evt)}>Guardar</button>
              <button className="btn-outline btn-sm" onClick={() => setEditing(null)}>Cancelar</button>
            </>
          ) : (
            <>
              <button className="btn-outline btn-sm" onClick={() => startEdit(evt)}>Editar</button>
              <button className="btn-outline btn-sm" onClick={() => togglePublished(evt)}>
                {evt.is_published ? 'Publicado' : 'Oculto'}
              </button>
              <button className="btn-outline btn-sm" onClick={() => toggleFreeEntry(evt)} title="Mientras esté activo, esta noche no se puede comprar online: no se llama a Stripe para nada de ella.">
                {evt.free_entry ? 'Entrada gratis' : 'De pago'}
              </button>
              <button className="btn-outline btn-sm btn-danger" onClick={() => deleteEvent(evt.id)}>
                Borrar
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <h1 style={{ fontSize: 32, margin: 0 }}>Eventos</h1>
      {notice && (
        <div role="status" className="card" style={{ maxWidth: 700, padding: '12px 16px', fontSize: 14, borderColor: /no se pudo|no es válido/i.test(notice) ? 'rgba(255,190,60,0.6)' : 'rgba(46,204,113,0.5)' }}>
          {notice}
        </div>
      )}

      <form onSubmit={createEvent} className="card grid-2" style={{ maxWidth: 700 }}>
        <div>
          <label className="label">Título / noche</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="DJ JUANJOOY" required />
        </div>
        <div>
          <label className="label">DJ / lineup</label>
          <input value={form.dj} onChange={(e) => setForm({ ...form, dj: e.target.value })} placeholder="Warmup: DJ Garci" />
        </div>
        <div>
          <label className="label">Fecha</label>
          <input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} required />
        </div>
        <div>
          <label className="label">Hora</label>
          <input value={form.event_time} onChange={(e) => setForm({ ...form, event_time: e.target.value })} placeholder="00:30" />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label className="label">Aforo de la noche (personas)</label>
          <input type="number" inputMode="numeric" min={0} step={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} placeholder="Sin límite" />
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 6 }}>Máximo de entradas que se venden para esa noche: cada entrada cuenta 1, sea del tramo que sea. El aforo completo del local son 264.</div>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label className="label">Cartel</label>
          <input type="file" accept="image/*" onChange={(e) => e.target.files && uploadPoster(e.target.files[0])} />
          {uploading && <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 6 }}>Subiendo…</div>}
          {form.poster_url && (
            <img src={form.poster_url} alt="preview" style={{ maxWidth: 160, marginTop: 10, borderRadius: 8 }} />
          )}
        </div>
        <div className="center-row" style={{ gridColumn: '1 / -1' }}>
          <button className="btn" type="submit">Crear evento</button>
        </div>
      </form>

      <div>
        <h2 style={{ fontSize: 18, margin: '0 0 12px' }}>Próximas ({upcoming.length})</h2>
        {upcoming.length === 0 ? (
          <p style={{ fontSize: 14, color: 'var(--text-dim)' }}>No hay ninguna noche futura creada todavía.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 220px), 1fr))', gap: 16 }}>
            {upcoming.map(renderCard)}
          </div>
        )}
      </div>

      {past.length > 0 && (
        <details>
          <summary style={{ cursor: 'pointer', fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Pasadas ({past.length})</summary>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '10px 0 16px' }}>
            Ya no se ven en la web. Se guardan aquí junto con sus ventas: mejor no borrarlas, solo consultarlas si hace falta.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 220px), 1fr))', gap: 16 }}>
            {past.map(renderCard)}
          </div>
        </details>
      )}
    </div>
  );
}

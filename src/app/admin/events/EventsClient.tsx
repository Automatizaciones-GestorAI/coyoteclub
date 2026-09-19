'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Evt = {
  id: string;
  title: string;
  dj: string | null;
  event_date: string;
  event_time: string | null;
  poster_url: string | null;
  is_published: boolean;
  sort_order: number;
};

export default function EventsClient({ initialEvents }: { initialEvents: Evt[] }) {
  const [events, setEvents] = useState(initialEvents);
  const [form, setForm] = useState({ title: '', dj: '', event_date: '', event_time: '', poster_url: '' });
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
    const res = await fetch('/api/admin/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    const created = await res.json();
    setEvents((prev) => [...prev, created]);
    setForm({ title: '', dj: '', event_date: '', event_time: '', poster_url: '' });
  }

  async function togglePublished(evt: Evt) {
    const res = await fetch(`/api/admin/events/${evt.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...evt, is_published: !evt.is_published })
    });
    const updated = await res.json();
    setEvents((prev) => prev.map((e) => (e.id === evt.id ? updated : e)));
  }

  async function deleteEvent(id: string) {
    if (!confirm('¿Borrar este evento?')) return;
    await fetch(`/api/admin/events/${id}`, { method: 'DELETE' });
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <h1 style={{ fontSize: 32, margin: 0 }}>Eventos</h1>

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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 220px), 1fr))', gap: 16 }}>
        {events.map((evt) => (
          <div key={evt.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {evt.poster_url && (
              <img src={evt.poster_url} alt={evt.title} style={{ width: '100%', borderRadius: 10 }} />
            )}
            <div style={{ fontWeight: 700 }}>{evt.title}</div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>{evt.dj}</div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
              {evt.event_date} {evt.event_time}
            </div>
            <div className="actions">
              <button className="btn-outline btn-sm" onClick={() => togglePublished(evt)}>
                {evt.is_published ? 'Publicado' : 'Oculto'}
              </button>
              <button className="btn-outline btn-sm btn-danger" onClick={() => deleteEvent(evt.id)}>
                Borrar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

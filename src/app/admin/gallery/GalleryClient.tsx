'use client';
import { useState } from 'react';

type Img = { id: string; url: string; alt: string | null };

export default function GalleryClient({ initialImages }: { initialImages: Img[] }) {
  const [images, setImages] = useState(initialImages);
  const [uploading, setUploading] = useState(false);
  const [alt, setAlt] = useState('');

  async function uploadImage(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', 'gallery');
    const uploadRes = await fetch('/api/admin/upload', { method: 'POST', body: fd });
    const { url } = await uploadRes.json();

    const res = await fetch('/api/admin/gallery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, alt: alt.trim() || null, sort_order: images.length })
    });
    const created = await res.json();
    setImages((prev) => [...prev, created]);
    setAlt('');
    setUploading(false);
  }

  async function deleteImage(id: string) {
    if (!confirm('¿Quitar esta foto de la galería?')) return;
    await fetch(`/api/admin/gallery/${id}`, { method: 'DELETE' });
    setImages((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={{ fontSize: 32, margin: 0 }}>Galería</h1>
      <div className="card" style={{ maxWidth: 400, width: '100%' }}>
        <label className="label" htmlFor="gal-alt">Qué se ve en la foto</label>
        <input id="gal-alt" value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Ej. Pista de baile llena de gente" maxLength={120} style={{ marginBottom: 10 }} />
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 10 }}>
          Ayuda a que la foto salga en las búsquedas de imágenes de Google y a las personas que usan lector de pantalla. Escríbelo antes de elegir el archivo.
        </div>
        <label className="label">Añadir foto</label>
        <input type="file" accept="image/*" onChange={(e) => e.target.files && uploadImage(e.target.files[0])} />
        {uploading && <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 6 }}>Subiendo…</div>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 140px), 1fr))', gap: 12 }}>
        {images.map((img) => (
          <div key={img.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <img src={img.url} alt={img.alt || ''} style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', borderRadius: 10 }} />
            <button className="btn-outline btn-sm btn-danger" onClick={() => deleteImage(img.id)}>
              Quitar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

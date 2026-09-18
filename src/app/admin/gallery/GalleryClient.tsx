'use client';
import { useState } from 'react';

type Img = { id: string; url: string; alt: string | null };

export default function GalleryClient({ initialImages }: { initialImages: Img[] }) {
  const [images, setImages] = useState(initialImages);
  const [uploading, setUploading] = useState(false);

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
      body: JSON.stringify({ url, sort_order: images.length })
    });
    const created = await res.json();
    setImages((prev) => [...prev, created]);
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
      <div className="card" style={{ maxWidth: 400 }}>
        <label className="label">Añadir foto</label>
        <input type="file" accept="image/*" onChange={(e) => e.target.files && uploadImage(e.target.files[0])} />
        {uploading && <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 6 }}>Subiendo…</div>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
        {images.map((img) => (
          <div key={img.id} style={{ position: 'relative' }}>
            <img src={img.url} alt={img.alt || ''} style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', borderRadius: 10 }} />
            <button
              onClick={() => deleteImage(img.id)}
              style={{ position: 'absolute', top: 6, right: 6, background: '#0b0b0cdd', color: '#fff', border: 'none', borderRadius: 8, padding: '4px 8px', fontSize: 11 }}
            >
              Quitar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

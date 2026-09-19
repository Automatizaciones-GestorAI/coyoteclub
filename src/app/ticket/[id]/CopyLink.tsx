'use client';
import { useState } from 'react';

export default function CopyLink({ url }: { url: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setDone(true);
      setTimeout(() => setDone(false), 2500);
    } catch {
      window.prompt('Copia este enlace:', url);
    }
  }
  return (
    <button type="button" className="btn-outline btn-sm" onClick={copy}>
      {done ? '¡Enlace copiado!' : 'Copiar enlace'}
    </button>
  );
}

'use client';
import { useEffect, useRef, useState } from 'react';

type Result = { valid: boolean; reason?: string; ticket?: any };

export default function ScanClient() {
  const scannerRef = useRef<any>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    let html5QrCode: any;
    import('html5-qrcode').then(({ Html5Qrcode }) => {
      html5QrCode = new Html5Qrcode('qr-reader');
      scannerRef.current = html5QrCode;
      html5QrCode
        .start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: 250 },
          async (decodedText: string) => {
            if (!scanning) return;
            setScanning(false);
            const res = await fetch('/api/tickets/validate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ qr_code: decodedText })
            });
            const json = await res.json();
            setResult(json);
          },
          () => {}
        )
        .catch(() => {});
    });
    return () => {
      html5QrCode?.stop().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function scanNext() {
    setResult(null);
    setScanning(true);
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px', gap: 20, background: 'radial-gradient(ellipse at 20% 0%, rgba(255,20,156,0.14), transparent 55%), var(--bg)' }}>
      <div className="display" style={{ fontSize: 28 }}>ESCANEAR ENTRADA</div>
      <div id="qr-reader" style={{ width: 'min(320px, 100%)', borderRadius: 16, overflow: 'hidden' }} />

      {result && (
        <div
          className="card"
          style={{
            width: 'min(320px, 100%)',
            textAlign: 'center',
            borderColor: result.valid ? '#2ecc71' : '#ff4d4d',
            background: result.valid ? 'rgba(46,204,113,0.1)' : 'rgba(255,77,77,0.1)'
          }}
        >
          <div className="display" style={{ fontSize: 26, color: result.valid ? '#2ecc71' : '#ff4d4d' }}>
            {result.valid ? '✔ VÁLIDA' : '✕ ' + result.reason}
          </div>
          {result.ticket && (
            <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text-dim)' }}>
              {result.ticket.buyer_name} — {result.ticket.price_tiers?.label}
            </div>
          )}
          <button className="btn" style={{ marginTop: 16 }} onClick={scanNext}>
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}

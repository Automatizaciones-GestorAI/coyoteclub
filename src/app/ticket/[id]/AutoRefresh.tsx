'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Mientras el banco no confirma el pago, vuelve a pedir la página cada pocos segundos para que
// el QR aparezca solo en cuanto la entrada pase a válida (sin que el comprador recargue).
export default function AutoRefresh({ everyMs = 3000 }: { everyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) router.refresh();
    }, everyMs);
    return () => clearInterval(id);
  }, [router, everyMs]);
  return null;
}

// Datos del titular y valores variables de las páginas legales (/aviso-legal, /privacidad, /condiciones, /cookies).
// Los campos vacíos salen en esas páginas como «[COMPLETAR: …]» y el panel (Ventas) avisa de lo que falta.
// Rellénalos con los datos reales del negocio y despliega. Guía: docs/TEXTOS-LEGALES.md

export const LEGAL = {
  tradeName: 'Coyote Club',

  // ── Titular de la web (obligatorio: art. 10 de la Ley 34/2002, LSSI-CE) ──────────────────────────────
  holderName: '', // nombre y apellidos (autónomo) o razón social (sociedad)
  holderTaxId: '', // NIF / CIF
  holderAddress: '', // domicilio fiscal completo
  holderEmail: '', // email de contacto (también para ejercer los derechos de protección de datos)
  holderRegistry: '', // SOLO sociedades: datos de inscripción en el Registro Mercantil. Vacío si es autónomo.

  phone: '+34 653 53 35 49',
  venueAddress: 'C. Trillo, 15, Seseña (Toledo)',

  // ── Proveedores que tratan datos (política de privacidad) ────────────────────────────────────────────
  hostingProvider: 'Hostinger International Ltd.', // servidor de la web (París, UE)

  // ── Condiciones de compra: valores que el negocio debe confirmar ─────────────────────────────────────
  minAge: 18, // edad mínima de acceso
  refundDays: 14, // plazo máximo para devolver el importe si el evento se cancela
  holderConfirmed: false, // pon true cuando el titular haya revisado edad, plazo de devolución y el resto de textos

  // Versión de los textos: se guarda con cada compra como prueba de qué aceptó el cliente.
  version: '2026-09-21'
};

// Campos obligatorios que aún están vacíos (etiqueta legible para el panel y para las páginas).
export const LEGAL_FIELDS: { key: 'holderName' | 'holderTaxId' | 'holderAddress' | 'holderEmail'; label: string }[] = [
  { key: 'holderName', label: 'nombre o razón social del titular' },
  { key: 'holderTaxId', label: 'NIF/CIF' },
  { key: 'holderAddress', label: 'domicilio' },
  { key: 'holderEmail', label: 'email de contacto' }
];

export function legalMissing(): string[] {
  const out = LEGAL_FIELDS.filter((f) => !LEGAL[f.key].trim()).map((f) => f.label);
  if (!LEGAL.holderConfirmed) out.push('revisión del titular (edad mínima, plazo de devolución y textos)');
  return out;
}

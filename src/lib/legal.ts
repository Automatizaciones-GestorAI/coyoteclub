// Datos del titular y valores variables de las páginas legales (/aviso-legal, /privacidad, /condiciones, /cookies).
// Los campos vacíos salen en esas páginas como «[COMPLETAR: …]» y el panel (Ventas) avisa de lo que falta.
// Los datos del titular se ponen en EasyPanel (variables LEGAL_*). Guía: docs/TEXTOS-LEGALES.md

// Los datos personales del titular NO están en el código (el repositorio de GitHub es público): se leen, en ejecución, de las
// variables de entorno del servicio (EasyPanel → Entorno). Con la variable vacía, la página muestra «[COMPLETAR: …]».
const env = (name: string) => (process.env[name] ?? '').trim();

export const LEGAL = {
  tradeName: 'Coyote Club',

  // ── Titular de la web (obligatorio: art. 10 de la Ley 34/2002, LSSI-CE) ──────────────────────────────
  get holderName() { return env('LEGAL_HOLDER_NAME'); }, // nombre y apellidos (autónomo) o razón social (sociedad)
  get holderTaxId() { return env('LEGAL_HOLDER_TAX_ID'); }, // NIF / CIF
  get holderAddress() { return env('LEGAL_HOLDER_ADDRESS'); }, // domicilio fiscal completo
  get holderEmail() { return env('LEGAL_HOLDER_EMAIL'); }, // email de contacto (también para ejercer los derechos de protección de datos)
  get holderRegistry() { return env('LEGAL_HOLDER_REGISTRY'); }, // SOLO sociedades: datos del Registro Mercantil. Vacío si es autónomo.

  phone: '+34 653 53 35 49',
  venueAddress: 'C. Trillo, 15, Seseña (Toledo)',

  // ── Proveedores que tratan datos (política de privacidad) ────────────────────────────────────────────
  hostingProvider: 'Hostinger International Ltd.', // servidor de la web (París, UE)

  // ── Condiciones de compra: valores que el negocio debe confirmar ─────────────────────────────────────
  minAge: 18, // edad mínima de acceso
  refundDays: 14, // plazo máximo para devolver el importe si el evento se cancela
  // Pon LEGAL_CONFIRMED=true cuando el titular (o su gestor) haya revisado edad, plazo de devolución y el resto de textos.
  get holderConfirmed() { return env('LEGAL_CONFIRMED') === 'true'; },

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

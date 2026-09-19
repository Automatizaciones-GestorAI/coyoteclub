import crypto from 'crypto';

/**
 * Integración estándar de Redsys (TPV Virtual - Redirección).
 * Documentación oficial: https://pagosonline.redsys.es
 *
 * Datos que da el banco al dar de alta el TPV virtual del comercio:
 *   - REDSYS_MERCHANT_CODE (FUC): código de comercio, 9 dígitos
 *   - REDSYS_TERMINAL: normalmente "001"
 *   - REDSYS_SECRET_KEY: clave de firma en base64 (32 caracteres, 24 bytes)
 * Y en la web:
 *   - NEXT_PUBLIC_SITE_URL: URL pública con https:// (Redsys avisa del pago a esta dirección)
 *   - REDSYS_ENV=test usa el entorno de pruebas (sis-t.redsys.es:25443); REDSYS_ENV=live el real
 *     (sis.redsys.es): cambiar SOLO cuando el banco confirme que el comercio está activo.
 */

export class RedsysNotConfiguredError extends Error {
  constructor(public problems: string[]) {
    super('Redsys no está listo: ' + problems.join('; '));
  }
}

export interface RedsysConfig {
  merchantCode: string;
  terminal: string;
  secretKey: Buffer;
  siteUrl: string;
  live: boolean;
}

// Se leen en cada llamada y con el nombre en una variable: así valen los valores del contenedor
// en ejecución y no unos "congelados" durante el build.
const env = (name: string): string => (process.env[name] ?? '').trim();

export function getRedsysConfig(): RedsysConfig {
  const missing: string[] = [];
  const merchantCode = env('REDSYS_MERCHANT_CODE');
  const secret = env('REDSYS_SECRET_KEY');
  const siteUrl = (env('SITE_URL') || env('NEXT_PUBLIC_SITE_URL')).replace(/\/+$/, '');
  if (!merchantCode) missing.push('falta REDSYS_MERCHANT_CODE');
  if (!secret) missing.push('falta REDSYS_SECRET_KEY');
  if (!siteUrl) missing.push('falta NEXT_PUBLIC_SITE_URL');
  if (missing.length) throw new RedsysNotConfiguredError(missing);

  const live = env('REDSYS_ENV') === 'live';
  const terminal = env('REDSYS_TERMINAL') || '001';
  const secretKey = Buffer.from(secret, 'base64');
  const invalid: string[] = [];
  if (!/^\d{9}$/.test(merchantCode)) invalid.push('REDSYS_MERCHANT_CODE debe tener 9 dígitos');
  if (secretKey.length !== 24) invalid.push('REDSYS_SECRET_KEY no parece la clave de firma de Redsys (base64, 32 caracteres)');
  if (!/^\d{1,3}$/.test(terminal)) invalid.push('REDSYS_TERMINAL debe ser numérico (normalmente 001)');
  if (!/^https?:\/\//.test(siteUrl)) invalid.push('NEXT_PUBLIC_SITE_URL debe empezar por https://');
  else if (live && !siteUrl.startsWith('https://')) invalid.push('en modo real NEXT_PUBLIC_SITE_URL debe ser https://');
  if (invalid.length) throw new RedsysNotConfiguredError(invalid);

  return { merchantCode, terminal, secretKey, siteUrl, live };
}

// Estado legible para el panel (nunca incluye valores secretos).
export function getRedsysStatus(): { ok: boolean; mode: 'test' | 'live'; problems: string[] } {
  const mode = env('REDSYS_ENV') === 'live' ? 'live' : 'test';
  try {
    getRedsysConfig();
    return { ok: true, mode, problems: [] };
  } catch (e) {
    if (e instanceof RedsysNotConfiguredError) return { ok: false, mode, problems: e.problems };
    throw e;
  }
}

const redsysUrl = (live: boolean) =>
  live ? 'https://sis.redsys.es/sis/realizarPago' : 'https://sis-t.redsys.es:25443/sis/realizarPago';

// Genera un número de pedido válido para Redsys: 4 dígitos numéricos + 8 alfanuméricos (12 en total)
export function generateRedsysOrderId(): string {
  const numeric = Date.now().toString().slice(-4);
  const rand = crypto.randomBytes(6).toString('hex').slice(0, 8).toUpperCase();
  return `${numeric}${rand}`;
}

function encrypt3DES(orderId: string, key: Buffer): Buffer {
  // Redsys deriva una clave distinta por pedido cifrando el order id con 3DES-CBC, IV en ceros.
  const iv = Buffer.alloc(8, 0);
  const cipher = crypto.createCipheriv('des-ede3-cbc', key, iv);
  cipher.setAutoPadding(false);
  // El order id se rellena con ceros hasta múltiplo de 8 bytes
  const padded = Buffer.from(orderId, 'utf8');
  const padLength = Math.ceil(padded.length / 8) * 8;
  const paddedBuf = Buffer.concat([padded, Buffer.alloc(padLength - padded.length, 0)]);
  return Buffer.concat([cipher.update(paddedBuf), cipher.final()]);
}

function hmacSha256(data: string, key: Buffer): Buffer {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest();
}

export interface RedsysChargeParams {
  orderId: string;
  ticketToken: string; // identificador público e impredecible de la entrada (va en la URL de vuelta)
  amountCents: number; // importe en céntimos, ej. 800 = 8,00€
  description: string; // ej. "Entrada Coyote Club - Tramo 1"
  buyerName?: string;
}

/**
 * Construye los campos del formulario que hay que auto-enviar (POST) a Redsys
 * para redirigir al comprador a la pasarela de pago.
 */
export function buildRedsysForm(config: RedsysConfig, params: RedsysChargeParams) {
  const merchantParams = {
    DS_MERCHANT_AMOUNT: String(params.amountCents),
    DS_MERCHANT_ORDER: params.orderId,
    DS_MERCHANT_MERCHANTCODE: config.merchantCode,
    DS_MERCHANT_CURRENCY: '978', // EUR
    DS_MERCHANT_TRANSACTIONTYPE: '0', // autorización estándar
    DS_MERCHANT_TERMINAL: config.terminal,
    DS_MERCHANT_MERCHANTURL: `${config.siteUrl}/api/checkout/redsys/notify`,
    DS_MERCHANT_URLOK: `${config.siteUrl}/ticket/${params.ticketToken}?pago=ok`,
    DS_MERCHANT_URLKO: `${config.siteUrl}/entradas?pago=ko`,
    DS_MERCHANT_PRODUCTDESCRIPTION: params.description.slice(0, 125),
    DS_MERCHANT_TITULAR: params.buyerName?.slice(0, 60) || '',
    DS_MERCHANT_MERCHANTNAME: 'Coyote Club',
    DS_MERCHANT_CONSUMERLANGUAGE: '001' // castellano
  };

  const merchantParamsBase64 = Buffer.from(JSON.stringify(merchantParams), 'utf8').toString('base64');
  const derivedKey = encrypt3DES(params.orderId, config.secretKey);
  const signature = hmacSha256(merchantParamsBase64, derivedKey).toString('base64');

  return {
    url: redsysUrl(config.live),
    fields: {
      Ds_SignatureVersion: 'HMAC_SHA256_V1',
      Ds_MerchantParameters: merchantParamsBase64,
      Ds_Signature: signature
    }
  };
}

// Redsys no es consistente con las mayúsculas de las claves (Ds_Order / DS_ORDER ...).
export function pick(decoded: Record<string, string>, name: string): string | undefined {
  const wanted = name.toLowerCase().replace(/_/g, '');
  for (const [k, v] of Object.entries(decoded)) if (k.toLowerCase().replace(/_/g, '') === wanted) return v;
  return undefined;
}

/**
 * Verifica la notificación (webhook) que Redsys envía tras el pago.
 * Devuelve los parámetros decodificados si la firma es válida, o null si no.
 */
export function verifyRedsysNotification(
  config: RedsysConfig,
  merchantParametersBase64: string,
  receivedSignature: string
): Record<string, string> | null {
  let decoded: Record<string, string>;
  try {
    decoded = JSON.parse(Buffer.from(merchantParametersBase64, 'base64').toString('utf8'));
  } catch {
    return null;
  }
  const orderId = pick(decoded, 'Ds_Order');
  if (!orderId) return null;

  const derivedKey = encrypt3DES(orderId, config.secretKey);
  // Redsys firma la respuesta con base64 "url-safe": se normalizan ambos lados
  const normalize = (b64: string) => b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const expected = Buffer.from(normalize(hmacSha256(merchantParametersBase64, derivedKey).toString('base64')));
  const received = Buffer.from(normalize(receivedSignature));
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) return null;
  return decoded;
}

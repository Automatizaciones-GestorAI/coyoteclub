import crypto from 'crypto';

/**
 * Integración estándar de Redsys (TPV Virtual - Redirección).
 * Documentación oficial: https://pagosonline.redsys.es
 *
 * Necesitas 3 datos que solo te puede dar el banco del cliente (Coyote Club),
 * al darse de alta como comercio con TPV virtual:
 *   - REDSYS_MERCHANT_CODE (FUC): código de comercio, 9 dígitos
 *   - REDSYS_TERMINAL: normalmente "001"
 *   - REDSYS_SECRET_KEY: clave de firma en base64 que da el banco
 *
 * REDSYS_ENV=test usa el entorno de pruebas (sis-t.redsys.es:25443),
 * REDSYS_ENV=live usa el real (sis.redsys.es) — cambia esto SOLO cuando
 * el banco confirme que el comercio está activo en producción.
 */

const REDSYS_URL =
  process.env.REDSYS_ENV === 'live'
    ? 'https://sis.redsys.es/sis/realizarPago'
    : 'https://sis-t.redsys.es:25443/sis/realizarPago';

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
  const padded = Buffer.concat([Buffer.from(orderId, 'utf8')]);
  const blockSize = 8;
  const padLength = Math.ceil(padded.length / blockSize) * blockSize;
  const paddedBuf = Buffer.concat([padded, Buffer.alloc(padLength - padded.length, 0)]);
  return Buffer.concat([cipher.update(paddedBuf), cipher.final()]);
}

function hmacSha256(data: string, key: Buffer): Buffer {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest();
}

export interface RedsysChargeParams {
  orderId: string;
  amountCents: number; // importe en céntimos, ej. 800 = 8,00€
  description: string; // ej. "Entrada Coyote Club - Tramo 1"
  buyerName?: string;
}

/**
 * Construye los campos del formulario que hay que auto-enviar (POST) a Redsys
 * para redirigir al comprador a la pasarela de pago.
 */
export function buildRedsysForm(params: RedsysChargeParams) {
  const merchantCode = process.env.REDSYS_MERCHANT_CODE!;
  const terminal = process.env.REDSYS_TERMINAL || '001';
  const secretKey = Buffer.from(process.env.REDSYS_SECRET_KEY!, 'base64');
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;

  const merchantParams = {
    DS_MERCHANT_AMOUNT: String(params.amountCents),
    DS_MERCHANT_ORDER: params.orderId,
    DS_MERCHANT_MERCHANTCODE: merchantCode,
    DS_MERCHANT_CURRENCY: '978', // EUR
    DS_MERCHANT_TRANSACTIONTYPE: '0', // autorización estándar
    DS_MERCHANT_TERMINAL: terminal,
    DS_MERCHANT_MERCHANTURL: `${siteUrl}/api/checkout/redsys/notify`,
    DS_MERCHANT_URLOK: `${siteUrl}/ticket/${params.orderId}?pago=ok`,
    DS_MERCHANT_URLKO: `${siteUrl}/entradas?pago=ko`,
    DS_MERCHANT_PRODUCTDESCRIPTION: params.description.slice(0, 125),
    DS_MERCHANT_TITULAR: params.buyerName?.slice(0, 60) || '',
    DS_MERCHANT_MERCHANTNAME: 'Coyote Club'
  };

  const merchantParamsBase64 = Buffer.from(JSON.stringify(merchantParams), 'utf8').toString(
    'base64'
  );
  const derivedKey = encrypt3DES(params.orderId, secretKey);
  const signature = hmacSha256(merchantParamsBase64, derivedKey).toString('base64');

  return {
    url: REDSYS_URL,
    fields: {
      Ds_SignatureVersion: 'HMAC_SHA256_V1',
      Ds_MerchantParameters: merchantParamsBase64,
      Ds_Signature: signature
    }
  };
}

/**
 * Verifica la notificación (webhook) que Redsys envía tras el pago.
 * Devuelve los parámetros decodificados si la firma es válida, o null si no.
 */
export function verifyRedsysNotification(
  merchantParametersBase64: string,
  receivedSignature: string
): Record<string, string> | null {
  const secretKey = Buffer.from(process.env.REDSYS_SECRET_KEY!, 'base64');
  const decoded = JSON.parse(
    Buffer.from(merchantParametersBase64, 'base64').toString('utf8')
  ) as Record<string, string>;

  const orderId = decoded.Ds_Order || decoded.DS_MERCHANT_ORDER;
  const derivedKey = encrypt3DES(orderId, secretKey);
  const expected = hmacSha256(merchantParametersBase64, derivedKey)
    .toString('base64')
    // Redsys usa base64 "url-safe" en la respuesta
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const normalizedReceived = receivedSignature.replace(/\+/g, '-').replace(/\//g, '_');

  if (expected !== normalizedReceived) return null;
  return decoded;
}

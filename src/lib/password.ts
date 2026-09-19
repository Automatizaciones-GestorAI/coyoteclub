import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'crypto';

// Contraseñas con scrypt (incluido en Node, sin dependencias). Formato: scrypt$N$r$p$sal$hash
const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;
const MAXMEM = 64 * 1024 * 1024;

const derive = (password: string, salt: Buffer, keylen: number, n: number, r: number, p: number) =>
  new Promise<Buffer>((resolve, reject) =>
    scryptCb(password, salt, keylen, { N: n, r, p, maxmem: MAXMEM }, (err, key) => (err ? reject(err) : resolve(key as Buffer)))
  );

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, KEYLEN, N, R, P);
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [alg, n, r, p, saltB64, hashB64] = stored.split('$');
    if (alg !== 'scrypt') return false;
    const expected = Buffer.from(hashB64, 'base64');
    const key = await derive(password, Buffer.from(saltB64, 'base64'), expected.length, +n, +r, +p);
    return key.length === expected.length && timingSafeEqual(key, expected);
  } catch {
    return false;
  }
}

// Cuando el usuario no existe se hace igualmente una comprobación, para que responder tarde lo mismo
// que con un usuario real y no se pueda averiguar qué usuarios existen midiendo tiempos.
let dummy: string | null = null;
export async function dummyVerify(password: string): Promise<void> {
  dummy ??= await hashPassword('contraseña-de-relleno-que-no-vale-para-nada');
  await verifyPassword(password, dummy);
}

export function passwordProblem(password: unknown): string | null {
  if (typeof password !== 'string' || password.length === 0) return 'Escribe una contraseña.';
  if (password.length < 10) return 'La contraseña debe tener al menos 10 caracteres.';
  if (password.length > 100) return 'La contraseña es demasiado larga (máximo 100).';
  return null;
}

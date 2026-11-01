/**
 * A password on a map. The packed bytes are encrypted with AES-256-GCM under a key from PBKDF2-HMAC-SHA-256
 * (600,000 iterations, OWASP 2023+) over the NFKC-normalised password and a random 16-byte salt. Wire form:
 *
 *   "E" base64url( 0x01 | salt[16] | iv[12] | AES-GCM( flag-byte | packed-bytes ) + tag[16] )
 *
 * The leading 0x01 is the crypto-parameter version, so the KDF can be strengthened later without breaking links.
 * AES-GCM's additional data is "linkmap/seal/1". A Locker holds the derived key for one document in memory only:
 * each re-encryption after an edit reuses the key and salt but always draws a fresh random IV. Never persist a key
 * or a password; never put either in a URL, log or error.
 */
import { decodeBase64Url, encodeBase64Url } from './base64url.ts';
import { LinkError } from './errors.ts';
import { LIMITS } from './limits.ts';
import type { Flag } from './pack.ts';

export const SEAL_PREFIX = 'E';
const CRYPTO_VERSION = 1;
export const PBKDF2_ITERATIONS = 600_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const AAD = new TextEncoder().encode('linkmap/seal/1');

export interface Locker {
  readonly key: CryptoKey;
  readonly salt: Uint8Array;
}

const subtle = () => {
  const s = globalThis.crypto?.subtle;
  if (!s) throw new Error('Web Crypto unavailable (a password needs a secure context: https or localhost)');
  return s;
};
const random = (n: number) => crypto.getRandomValues(new Uint8Array(n));
const buf = (u: Uint8Array): Uint8Array<ArrayBuffer> => new Uint8Array(u);

async function deriveKey(password: string, salt: Uint8Array, iterations = PBKDF2_ITERATIONS): Promise<CryptoKey> {
  const base = await subtle().importKey('raw', new TextEncoder().encode(password.normalize('NFKC')), 'PBKDF2', false, ['deriveKey']);
  return subtle().deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: buf(salt), iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** A new locker for a password: a fresh salt and its key. */
export async function newLocker(password: string, iterations = PBKDF2_ITERATIONS): Promise<Locker> {
  if (!password) throw new Error('empty password');
  const salt = random(SALT_BYTES);
  return { key: await deriveKey(password, salt, iterations), salt };
}

export async function seal(locker: Locker, flag: Flag, packed: Uint8Array): Promise<string> {
  const plain = new Uint8Array(1 + packed.length);
  plain[0] = flag.charCodeAt(0);
  plain.set(packed, 1);
  const iv = random(IV_BYTES);
  const ct = new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv, additionalData: AAD }, locker.key, plain));
  const out = new Uint8Array(1 + SALT_BYTES + IV_BYTES + ct.length);
  out[0] = CRYPTO_VERSION;
  out.set(locker.salt, 1);
  out.set(iv, 1 + SALT_BYTES);
  out.set(ct, 1 + SALT_BYTES + IV_BYTES);
  return SEAL_PREFIX + encodeBase64Url(out);
}

export const isSealed = (payload: string) => payload.startsWith(SEAL_PREFIX);

/**
 * Open a sealed payload. Throws LinkError('password') for a wrong password OR a tampered link (GCM cannot tell them
 * apart, and the UI must not pretend it can). Returns the locker so later edits re-seal under the same password.
 */
export async function unseal(
  payload: string,
  password: string,
  iterations = PBKDF2_ITERATIONS,
): Promise<{ flag: string; packed: Uint8Array; locker: Locker }> {
  if (!isSealed(payload)) throw new LinkError('sealed', 'not sealed');
  const all = decodeBase64Url(payload.slice(1), LIMITS.packedBytes);
  if (all.length < 1 + SALT_BYTES + IV_BYTES + 16 + 1) throw new LinkError('malformed', 'sealed payload too short');
  if (all[0] !== CRYPTO_VERSION) throw new LinkError('version', 'unsupported seal version');
  const salt = all.slice(1, 1 + SALT_BYTES);
  const iv = all.slice(1 + SALT_BYTES, 1 + SALT_BYTES + IV_BYTES);
  const ct = all.slice(1 + SALT_BYTES + IV_BYTES);
  const key = await deriveKey(password, salt, iterations);
  let plain: Uint8Array;
  try {
    plain = new Uint8Array(await subtle().decrypt({ name: 'AES-GCM', iv, additionalData: AAD }, key, ct));
  } catch {
    throw new LinkError('password', 'wrong password or damaged link');
  }
  return { flag: String.fromCharCode(plain[0]!), packed: plain.slice(1), locker: { key, salt } };
}

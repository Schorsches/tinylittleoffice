/**
 * base64url (RFC 4648 §5) without padding, with one change: "~" stands for 62 where the RFC has "-". A hyphen is a
 * place where mail and chat clients break a long line, which cuts the link; "~" is unreserved in URLs and never
 * breaks. Reading is lenient: "-" is read as 62 too, and "+" (inserted every BREAK_EVERY characters, see link.ts) is skipped.
 */
import { LinkError } from './errors.ts';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789~_';
const REVERSE = new Int16Array(128).fill(-1);
for (let i = 0; i < ALPHABET.length; i++) REVERSE[ALPHABET.charCodeAt(i)] = i;
REVERSE['-'.charCodeAt(0)] = 62;

export function encodeBase64Url(bytes: Uint8Array): string {
  let out = '';
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i]! << 16) | (bytes[i + 1]! << 8) | bytes[i + 2]!;
    out += ALPHABET[n >> 18]! + ALPHABET[(n >> 12) & 63]! + ALPHABET[(n >> 6) & 63]! + ALPHABET[n & 63]!;
  }
  const rest = bytes.length - i;
  if (rest === 1) {
    const n = bytes[i]! << 16;
    out += ALPHABET[n >> 18]! + ALPHABET[(n >> 12) & 63]!;
  } else if (rest === 2) {
    const n = (bytes[i]! << 16) | (bytes[i + 1]! << 8);
    out += ALPHABET[n >> 18]! + ALPHABET[(n >> 12) & 63]! + ALPHABET[(n >> 6) & 63]!;
  }
  return out;
}

export function decodeBase64Url(input: string, maxBytes: number): Uint8Array {
  const s = input.replace(/\+|%2B/gi, '');
  if (s.length % 4 === 1) throw new LinkError('base64', 'bad length');
  if (Math.floor((s.length * 3) / 4) > maxBytes) throw new LinkError('too-large', 'payload too large');
  const out = new Uint8Array(Math.floor((s.length * 3) / 4));
  let o = 0;
  let acc = 0;
  let bits = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    const v = c < 128 ? REVERSE[c]! : -1;
    if (v < 0) throw new LinkError('base64', 'bad character');
    acc = ((acc << 6) | v) & 0xffffff;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (acc >> bits) & 0xff;
    }
  }
  return out;
}

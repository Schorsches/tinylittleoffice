/**
 * Bytes <-> packed bytes with a one-letter flag: "z" deflate-raw (fflate, level 9), "r" raw, whichever is shorter.
 * "y" is reserved for a future preset dictionary; "E" is a sealed (password) payload (seal.ts). Inflating is streamed
 * and stops at LIMITS.inflatedBytes, so a tiny hostile payload cannot expand into gigabytes.
 */
import { Inflate, deflateSync } from 'fflate';
import { LinkError } from './errors.ts';
import { LIMITS } from './limits.ts';

export type Flag = 'z' | 'r';

export function pack(raw: Uint8Array): { flag: Flag; bytes: Uint8Array } {
  const z = deflateSync(raw, { level: 9, mem: 12 });
  return z.length < raw.length ? { flag: 'z', bytes: z } : { flag: 'r', bytes: raw };
}

function inflate(bytes: Uint8Array): Uint8Array {
  const parts: Uint8Array[] = [];
  let size = 0;
  let ended = false;
  const inf = new Inflate((chunk, final) => {
    size += chunk.length;
    if (size > LIMITS.inflatedBytes) throw new LinkError('too-large', 'document too large');
    parts.push(chunk);
    if (final) ended = true;
  });
  try {
    inf.push(bytes, true);
  } catch (e) {
    if (e instanceof LinkError) throw e;
    throw new LinkError('inflate', 'damaged compressed data');
  }
  if (!ended) throw new LinkError('inflate', 'truncated compressed data');
  const out = new Uint8Array(size);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

export function unpack(flag: string, bytes: Uint8Array): Uint8Array {
  if (flag === 'z') return inflate(bytes);
  if (flag === 'r') {
    if (bytes.length > LIMITS.inflatedBytes) throw new LinkError('too-large', 'document too large');
    return bytes;
  }
  throw new LinkError('flag', 'unknown packing');
}

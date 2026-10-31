/**
 * MapDoc <-> the link's fragment. The fragment ("#...") is never sent to any server by the browser: that is what
 * makes the app private. Shape:
 *
 *   https://<host>/#/v1/<payload>        payload = flag + base64url(packed), "+" every 300 characters
 *
 * flag "z" deflate, "r" raw, "E" sealed under a password (seal.ts). An empty payload is an empty map.
 */
import { decodeBase64Url, encodeBase64Url } from './base64url.ts';
import { fromBytes, toBytes } from './binary.ts';
import { LinkError } from './errors.ts';
import { LIMITS } from './limits.ts';
import type { MapDoc } from './model.ts';
import { pack, unpack } from './pack.ts';
import { isSealed, seal, unseal, type Locker } from './seal.ts';

export const ROUTE = '#/v1/';
/** Messengers (iMessage, Signal) stop linkifying after ~301 unbroken word characters. "+" is not in the alphabet. */
export const BREAK = '+';
export const BREAK_EVERY = 300;

export const withBreaks = (p: string) => (p.match(new RegExp(`.{1,${BREAK_EVERY}}`, 'g')) ?? []).join(BREAK);

/** A map as a payload (no route, no breaks). */
export function encodeMap(doc: MapDoc): string {
  const { flag, bytes } = pack(toBytes(doc));
  return flag + encodeBase64Url(bytes);
}

/** A payload as a map. Throws LinkError; a sealed payload throws LinkError('sealed'): ask for the password and use openSealed. */
export function decodeMap(payload: string): MapDoc {
  const p = payload.replace(/\+|%2B/gi, '');
  if (!p) throw new LinkError('empty', 'empty');
  if (isSealed(p)) throw new LinkError('sealed', 'password required');
  return fromBytes(unpack(p[0]!, decodeBase64Url(p.slice(1), LIMITS.packedBytes)));
}

export async function encodeSealed(doc: MapDoc, locker: Locker): Promise<string> {
  const { flag, bytes } = pack(toBytes(doc));
  return seal(locker, flag, bytes);
}

export async function openSealed(payload: string, password: string, iterations?: number): Promise<{ doc: MapDoc; locker: Locker }> {
  const { flag, packed, locker } = await unseal(payload.replace(/\+|%2B/gi, ''), password, iterations);
  return { doc: fromBytes(unpack(flag, packed)), locker };
}

/** The fragment for a payload: "#/v1/<payload with breaks>", or "" for an empty map. */
export const toHash = (payload: string) => (payload ? ROUTE + withBreaks(payload) : '');

/** The payload in a fragment, or null when the fragment is not ours (e.g. "#about"). */
export function payloadOf(hash: string): string | null {
  if (hash === '' || hash === '#') return '';
  if (!hash.startsWith(ROUTE)) return null;
  return hash.slice(ROUTE.length).replace(/\+|%2B/gi, '');
}

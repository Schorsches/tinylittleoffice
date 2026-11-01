/** Version-2 JSON envelope, bounded and compressed by the existing packer; v1 bytes and crypto stay frozen. */
import { encodeMap, decodeMap, encodeSealed, openSealed, toHash, payloadOf } from './link.ts';
import { encodeBase64Url, decodeBase64Url } from './base64url.ts';
import { pack, unpack } from './pack.ts';
import { seal, unseal, type Locker } from './seal.ts';
import { LIMITS } from './limits.ts';
import { LinkError } from './errors.ts';
import { validDocument, quantizeDocument, type AtlasDoc } from './atlas-model.ts';
export {
  validDocument,
  quantizeDocument,
  defaultSettings,
  type AtlasDoc,
  type AtlasFeature,
  type PlaceInfo,
  type AtlasSettings,
} from './atlas-model.ts';
const extended = (d: AtlasDoc) => !!d.settings || d.features.some((f) => f.info || f.customColor);
function bytes(d: AtlasDoc) {
  if (!validDocument(d)) throw new LinkError('invalid', 'invalid document');
  const json = new TextEncoder().encode(JSON.stringify(quantizeDocument(d)));
  if (json.length + 1 > LIMITS.inflatedBytes) throw new LinkError('too-large', 'document limit');
  const out = new Uint8Array(json.length + 1);
  out[0] = 2;
  out.set(json, 1);
  return out;
}
function read(flag: string, packed: Uint8Array): AtlasDoc {
  const all = unpack(flag, packed);
  if (all[0] !== 2) throw new LinkError('version', 'unsupported version');
  try {
    const v: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(all.slice(1)));
    if (!validDocument(v)) throw Error();
    return quantizeDocument(v);
  } catch {
    throw new LinkError('invalid', 'invalid document');
  }
}
export function encodeDocument(doc: AtlasDoc): string {
  if (!extended(doc)) return encodeMap(doc);
  const p = pack(bytes(doc));
  if (p.bytes.length > LIMITS.packedBytes) throw new LinkError('too-large', 'packed limit');
  return '2' + p.flag + encodeBase64Url(p.bytes);
}
export function decodeDocument(payload: string): AtlasDoc {
  if (!payload.startsWith('2')) return decodeMap(payload);
  if (payload.startsWith('2E')) throw new LinkError('sealed', 'password required');
  return read(payload[1] ?? '', decodeBase64Url(payload.slice(2), LIMITS.packedBytes));
}
export async function encodeProtectedDocument(doc: AtlasDoc, locker: Locker) {
  if (!extended(doc)) return encodeSealed(doc, locker);
  const p = pack(bytes(doc));
  if (p.bytes.length > LIMITS.packedBytes - 64) throw new LinkError('too-large', 'packed limit');
  return '2' + (await seal(locker, p.flag, p.bytes));
}
export async function openProtectedDocument(payload: string, password: string, iterations?: number) {
  if (!payload.startsWith('2')) return openSealed(payload, password, iterations);
  const p = await unseal(payload.slice(1), password, iterations);
  return { doc: read(p.flag, p.packed), locker: p.locker };
}
export const documentHash = (p: string) => (p.startsWith('2') ? '#/v2/' + (p.slice(1).match(/.{1,300}/g) ?? []).join('+') : toHash(p));
export const documentPayload = (hash: string) => (hash.startsWith('#/v2/') ? '2' + hash.slice(5).replace(/\+|%2B/gi, '') : payloadOf(hash));

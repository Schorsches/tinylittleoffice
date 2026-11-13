/** Preflight an edit with the actual codecs: structurally valid input can still exceed their byte limits. */
import { validDocument, encodeDocument, decodeDocument, LIMITS, type AtlasDoc } from '../format/index.ts';
export function prepareDocument(doc: AtlasDoc): { doc: AtlasDoc; payload: string } | null {
  if (!validDocument(doc)) return null;
  try {
    const payload = encodeDocument(doc);
    const prefix = payload.startsWith('2') ? 2 : 1;
    // Match the v2 encoder's existing 64-byte reserve so a later password does not exceed packed capacity.
    if (Math.floor(((payload.length - prefix) * 3) / 4) > LIMITS.packedBytes - 64) return null;
    return { doc: decodeDocument(payload), payload };
  } catch {
    return null;
  }
}

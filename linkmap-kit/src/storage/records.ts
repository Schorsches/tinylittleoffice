/** Defensive read model only: damaged stored values are never rewritten or discarded while listing. */
// A storage read bound, large enough for the codec's 1 MiB packed payload plus base64/envelope overhead.
// Keep this module independent of the codec so restoring a language never preloads map serialization.
const MAX_PAYLOAD_CHARS = 1_400_000;
export interface SavedEntry {
  key: IDBValidKey;
  title: string;
  payload: string | null;
  savedAt: number | null;
}
export const record = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
export function readSavedEntry(key: IDBValidKey, value: unknown): SavedEntry {
  const v = record(value) ? value : {};
  const payload =
    typeof v.payload === 'string' && v.payload.length <= MAX_PAYLOAD_CHARS && /^(?:2)?[rzE][A-Za-z0-9~_-]+$/.test(v.payload)
      ? v.payload
      : null;
  const savedAt = typeof v.savedAt === 'number' && Number.isFinite(new Date(v.savedAt).getTime()) ? v.savedAt : null;
  return { key, title: typeof v.title === 'string' ? v.title.slice(0, 400) : '', payload, savedAt };
}

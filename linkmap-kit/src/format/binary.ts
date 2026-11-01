/**
 * MapDoc <-> bytes, format version 1. The exact layout is docs/FORMAT.md; this file and that page change together,
 * and a released version never changes (old links must open forever). A new layout is a new FORMAT byte.
 */
import { ByteReader, ByteWriter } from './bytes.ts';
import { LinkError } from './errors.ts';
import { LIMITS } from './limits.ts';
import {
  COORD_SCALE,
  KINDS,
  MAX_LAT,
  MAX_LNG,
  ZOOM_SCALE,
  problems,
  quantize,
  type ColorIndex,
  type Feature,
  type LngLat,
  type MapDoc,
} from './model.ts';

export const FORMAT = 1;

const HAS_NAME = 1 << 5;
const HAS_NOTE = 1 << 6;
const RESERVED = 1 << 7;

const int = (x: number) => Math.round(x * COORD_SCALE);

export function toBytes(input: MapDoc): Uint8Array {
  const issues = problems(input);
  if (issues.length) throw new LinkError('invalid', issues.join('; '));
  const doc = quantize(input);
  const w = new ByteWriter();
  w.u8(FORMAT);
  w.str(doc.title);
  const v = doc.view;
  const cx = int(v.lng);
  const cy = int(v.lat);
  w.svar(cx);
  w.svar(cy);
  w.uvar(Math.round(v.zoom * ZOOM_SCALE));
  w.uvar(v.bearing);
  w.uvar(v.pitch);
  w.uvar(doc.features.length);
  // Coordinates are deltas from the previous coordinate in the document, the first from the view's center.
  let px = cx;
  let py = cy;
  for (const f of doc.features) {
    w.u8(KINDS.indexOf(f.kind) | (f.color << 2) | (f.name ? HAS_NAME : 0) | (f.note ? HAS_NOTE : 0));
    if (f.kind !== 'point') w.uvar(f.coords.length);
    for (const [lng, lat] of f.coords) {
      const x = int(lng);
      const y = int(lat);
      w.svar(x - px);
      w.svar(y - py);
      px = x;
      py = y;
    }
    if (f.name) w.str(f.name);
    if (f.note) w.str(f.note);
  }
  return w.bytes();
}

export function fromBytes(bytes: Uint8Array): MapDoc {
  if (bytes.length > LIMITS.inflatedBytes) throw new LinkError('too-large', 'document too large');
  const r = new ByteReader(bytes);
  const version = r.u8();
  if (version !== FORMAT) throw new LinkError('version', `unsupported format ${version}`);
  const title = r.str(LIMITS.titleBytes);
  const cx = r.svar();
  const cy = r.svar();
  const zoom = r.uvar() / ZOOM_SCALE;
  const bearing = r.uvar();
  const pitch = r.uvar();
  const lng = cx / COORD_SCALE;
  const lat = cy / COORD_SCALE;
  if (Math.abs(lng) > MAX_LNG || Math.abs(lat) > MAX_LAT || zoom > 24 || bearing > 359 || pitch > 85)
    throw new LinkError('invalid', 'view out of range');
  const count = r.uvar();
  if (count > LIMITS.features) throw new LinkError('too-large', 'too many features');
  const features: Feature[] = [];
  let px = cx;
  let py = cy;
  let total = 0;
  for (let i = 0; i < count; i++) {
    const h = r.u8();
    const k = h & 3;
    if (k >= KINDS.length || h & RESERVED) throw new LinkError('malformed', 'bad feature header');
    const kind = KINDS[k]!;
    const n = kind === 'point' ? 1 : r.uvar();
    if (kind === 'line' && n < 2) throw new LinkError('invalid', 'line too short');
    if (kind === 'polygon' && n < 3) throw new LinkError('invalid', 'polygon too short');
    total += n;
    if (total > LIMITS.coords) throw new LinkError('too-large', 'too many coordinates');
    const coords: LngLat[] = [];
    for (let j = 0; j < n; j++) {
      px += r.svar();
      py += r.svar();
      const x = px / COORD_SCALE;
      const y = py / COORD_SCALE;
      if (Math.abs(x) > MAX_LNG || Math.abs(y) > MAX_LAT) throw new LinkError('invalid', 'coordinate out of range');
      coords.push([x, y]);
    }
    const name = h & HAS_NAME ? r.str(LIMITS.nameBytes) : '';
    const note = h & HAS_NOTE ? r.str(LIMITS.noteBytes) : '';
    features.push({ kind, coords, name, note, color: ((h >> 2) & 7) as ColorIndex });
  }
  if (!r.done) throw new LinkError('malformed', 'trailing bytes');
  return { title, view: { lng, lat, zoom, bearing, pitch }, features };
}

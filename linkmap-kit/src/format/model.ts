/**
 * The map document: what a link holds. Pure data, no DOM, no MapLibre. Everything the editor shows is derived
 * from a MapDoc; every edit produces a new MapDoc (immutable updates), which is then encoded into the address.
 */
import { LIMITS, utf8Length } from './limits.ts';

/** Eight colors, stored as an index (3 bits). Readable on the Liberty style, distinguishable for common color blindness. */
export const PALETTE = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#db2777', '#334155'] as const;
export type ColorIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type Kind = 'point' | 'line' | 'polygon';
export const KINDS: readonly Kind[] = ['point', 'line', 'polygon'];

/** [longitude, latitude] in decimal degrees, WGS84, the GeoJSON order. */
export type LngLat = readonly [lng: number, lat: number];

export interface Feature {
  kind: Kind;
  /** point: exactly 1; line: at least 2; polygon: at least 3, the outer ring, NOT closed (first != last). */
  coords: readonly LngLat[];
  name: string;
  note: string;
  color: ColorIndex;
}

export interface View {
  lng: number;
  lat: number;
  /** 0 to 24. */
  zoom: number;
  /** Degrees, 0 to 359. */
  bearing: number;
  /** Degrees, 0 to 85. */
  pitch: number;
}

export interface MapDoc {
  title: string;
  view: View;
  features: readonly Feature[];
}

export const emptyDoc = (): MapDoc => ({ title: '', view: { lng: 0, lat: 20, zoom: 1.5, bearing: 0, pitch: 0 }, features: [] });

/** Coordinates are stored as integers of 1e-5 degree: about 1.1 m at the equator. */
export const COORD_SCALE = 1e5;
export const ZOOM_SCALE = 100;
export const MAX_LAT = 90;
export const MAX_LNG = 180;

/** Rounded to the stored precision; "|| 0" turns -0 into 0, as decoding does. */
const q = (x: number) => Math.round(x * COORD_SCALE) / COORD_SCALE || 0;
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
/** Longitude wrapped into [-180, 180]. MapLibre reports longitudes beyond that after panning across the antimeridian. */
export const wrapLng = (lng: number) => (lng >= -180 && lng <= 180 ? lng : ((((lng + 180) % 360) + 360) % 360) - 180);

/** The document exactly as it will read back from its link (coordinates rounded, view normalised). */
export function quantize(doc: MapDoc): MapDoc {
  const v = doc.view;
  return {
    title: doc.title,
    view: {
      lng: q(wrapLng(v.lng)),
      lat: q(clamp(v.lat, -MAX_LAT, MAX_LAT)),
      zoom: Math.round(clamp(v.zoom, 0, 24) * ZOOM_SCALE) / ZOOM_SCALE || 0,
      bearing: ((Math.round(v.bearing) % 360) + 360) % 360 || 0,
      pitch: Math.round(clamp(v.pitch, 0, 85)) || 0,
    },
    features: doc.features.map((f) => ({ ...f, coords: f.coords.map(([lng, lat]) => [q(wrapLng(lng)), q(lat)] as const) })),
  };
}

/** Every reason a document cannot be written to a link; [] when it can. The editor must keep documents valid. */
export function problems(doc: MapDoc): string[] {
  const out: string[] = [];
  if (utf8Length(doc.title) > LIMITS.titleBytes) out.push(`title longer than ${LIMITS.titleBytes} bytes`);
  if (doc.features.length > LIMITS.features) out.push(`more than ${LIMITS.features} features`);
  let total = 0;
  doc.features.forEach((f, i) => {
    const n = f.coords.length;
    total += n;
    if (!KINDS.includes(f.kind)) out.push(`feature ${i}: unknown kind`);
    if (f.kind === 'point' && n !== 1) out.push(`feature ${i}: a point has exactly one coordinate`);
    if (f.kind === 'line' && n < 2) out.push(`feature ${i}: a line needs at least two coordinates`);
    if (f.kind === 'polygon' && n < 3) out.push(`feature ${i}: a polygon needs at least three coordinates`);
    if (!Number.isInteger(f.color) || f.color < 0 || f.color >= PALETTE.length) out.push(`feature ${i}: color out of range`);
    if (utf8Length(f.name) > LIMITS.nameBytes) out.push(`feature ${i}: name longer than ${LIMITS.nameBytes} bytes`);
    if (utf8Length(f.note) > LIMITS.noteBytes) out.push(`feature ${i}: note longer than ${LIMITS.noteBytes} bytes`);
    for (const [lng, lat] of f.coords) {
      if (!Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lat) > MAX_LAT || Math.abs(wrapLng(lng)) > MAX_LNG) {
        out.push(`feature ${i}: coordinate out of range`);
        break;
      }
    }
  });
  if (total > LIMITS.coords) out.push(`more than ${LIMITS.coords} coordinates`);
  const v = doc.view;
  if (![v.lng, v.lat, v.zoom, v.bearing, v.pitch].every(Number.isFinite)) out.push('view is not finite');
  return out;
}

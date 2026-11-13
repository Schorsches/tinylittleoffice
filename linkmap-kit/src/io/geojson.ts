import {
  emptyDoc,
  LIMITS,
  PALETTE,
  problems,
  validDocument,
  type AtlasFeature as Feature,
  type AtlasDoc as MapDoc,
  type LngLat,
} from '../format/index.ts';
export interface ImportResult {
  doc: MapDoc;
  skipped: string[];
}
export const FILE_LIMIT = 10 * 1024 * 1024;
export const bytes = (s: string) => new TextEncoder().encode(s).length;
export function limited(s: unknown, max: number) {
  if (typeof s !== 'string') return '';
  let out = '';
  for (const c of s) {
    if (bytes(out + c) > max) break;
    out += c;
  }
  return out;
}
export function validateImport(features: Feature[], skipped: string[], title = ''): ImportResult {
  const doc: MapDoc = emptyDoc();
  doc.title = limited(title, LIMITS.titleBytes);
  let total = 0;
  for (const f of features) {
    if (doc.features.length >= LIMITS.features || total + f.coords.length > LIMITS.coords) {
      skipped.push('limits');
      continue;
    }
    if (problems({ ...emptyDoc(), features: [f] }).length) {
      skipped.push('invalid');
      continue;
    }
    doc.features = [...doc.features, f];
    total += f.coords.length;
  }
  const first = doc.features[0]?.coords[0];
  if (first) doc.view = { ...doc.view, lng: first[0], lat: first[1], zoom: 12 };
  return { doc, skipped };
}
function record(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}
function positions(v: unknown): LngLat[] {
  if (!Array.isArray(v)) throw Error('invalid');
  return v.map((p: unknown) => {
    if (
      !Array.isArray(p) ||
      p.length < 2 ||
      typeof p[0] !== 'number' ||
      typeof p[1] !== 'number' ||
      !Number.isFinite(p[0]) ||
      !Number.isFinite(p[1]) ||
      Math.abs(p[0]) > 180 ||
      Math.abs(p[1]) > 90
    )
      throw Error('invalid');
    return [p[0], p[1]];
  });
}
export function fromGeoJson(text: string): ImportResult {
  if (bytes(text) > FILE_LIMIT) throw Error('size');
  const value: unknown = JSON.parse(text);
  const features: Feature[] = [];
  const skipped: string[] = [];
  const add = (raw: unknown, props: Record<string, unknown> = {}) => {
    const g = record(raw);
    if (!g) {
      skipped.push('invalid');
      return;
    }
    if (g.type === 'MultiPoint' || g.type === 'MultiLineString' || g.type === 'MultiPolygon') {
      if (!Array.isArray(g.coordinates)) {
        skipped.push('invalid');
        return;
      }
      for (const c of g.coordinates) add({ type: String(g.type).slice(5), coordinates: c }, props);
      return;
    }
    try {
      let kind: Feature['kind'], coords: LngLat[];
      if (g.type === 'Point') {
        kind = 'point';
        coords = positions([g.coordinates]);
      } else if (g.type === 'LineString') {
        kind = 'line';
        coords = positions(g.coordinates);
      } else if (g.type === 'Polygon' && Array.isArray(g.coordinates)) {
        kind = 'polygon';
        coords = positions(g.coordinates[0]);
        const first = coords[0],
          last = coords.at(-1);
        if (first && last && first[0] === last[0] && first[1] === last[1]) coords.pop();
        if (g.coordinates.length > 1) skipped.push('holes');
      } else {
        skipped.push(String(g.type ?? 'invalid'));
        return;
      }
      const name = limited(props.name, LIMITS.nameBytes),
        note = limited(props.note ?? props.description, LIMITS.noteBytes);
      if (
        name !== (typeof props.name === 'string' ? props.name : '') ||
        note !== (typeof (props.note ?? props.description) === 'string' ? (props.note ?? props.description) : '')
      )
        skipped.push('text');
      const color =
        typeof props.color === 'number' && Number.isInteger(props.color) && props.color >= 0 && props.color < PALETTE.length
          ? (props.color as Feature['color'])
          : 0;
      const candidate: Feature = { kind, coords, name, note, color };
      if (props.customColor !== undefined) {
        if (typeof props.customColor === 'string' && /^#[0-9a-f]{6}$/i.test(props.customColor)) candidate.customColor = props.customColor;
        else skipped.push('customColor: invalid');
      }
      if (props.info !== undefined) {
        const test = { ...emptyDoc(), features: [{ ...candidate, info: props.info }] };
        if (validDocument(test)) {
          const info = test.features[0]?.info;
          if (info) candidate.info = info;
        } else skipped.push('info: unsupported or invalid');
      }
      for (const key of Object.keys(props))
        if (!['name', 'note', 'description', 'color', 'info', 'customColor'].includes(key)) skipped.push('property: ' + key);
      features.push(candidate);
    } catch {
      skipped.push('invalid');
    }
  };
  const v = record(value);
  if (!v) throw Error('invalid');
  const item = (raw: unknown) => {
    const r = record(raw);
    if (r?.type === 'Feature') add(r.geometry, record(r.properties) ?? {});
    else add(raw);
  };
  if (v.type === 'FeatureCollection' && Array.isArray(v.features)) v.features.forEach(item);
  else item(value);
  const result = validateImport(features, skipped, typeof v.name === 'string' ? v.name : '');
  if (v.linkmap !== undefined) {
    const meta = record(v.linkmap);
    if (meta?.format === 'atlas-v2') {
      const candidate = {
        ...result.doc,
        ...(meta.settings !== undefined ? { settings: meta.settings } : {}),
        ...(meta.view !== undefined ? { view: meta.view } : {}),
      };
      if (validDocument(candidate)) result.doc = candidate;
      else result.skipped.push('settings: invalid');
    } else result.skipped.push('linkmap: unsupported profile');
  }
  return result;
}
export function toGeoJson(doc: MapDoc): string {
  return JSON.stringify(
    {
      type: 'FeatureCollection',
      name: doc.title,
      linkmap: { format: 'atlas-v2', view: doc.view, ...(doc.settings ? { settings: doc.settings } : {}) },
      features: doc.features.map((f) => {
        const c = f.coords.map((p) => [...p]);
        return {
          type: 'Feature',
          properties: {
            name: f.name,
            note: f.note,
            color: f.color,
            ...(f.info ? { info: f.info } : {}),
            ...(f.customColor ? { customColor: f.customColor } : {}),
          },
          geometry:
            f.kind === 'point'
              ? { type: 'Point', coordinates: c[0] }
              : f.kind === 'line'
                ? { type: 'LineString', coordinates: c }
                : { type: 'Polygon', coordinates: [[...c, c[0]]] },
        };
      }),
    },
    null,
    2,
  );
}

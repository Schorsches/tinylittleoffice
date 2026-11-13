/** Import-only flat GeoJSON profile. Native atlas-v2 and ordinary GeoJSON retain their existing behavior. */
import { emptyDoc, validDocument, LIMITS } from '../format/index.ts';
import { bytes, FILE_LIMIT, fromGeoJson, type ImportResult } from './geojson.ts';
const record = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const fields = ['name', 'note', 'address', 'category', 'services', 'hours', 'color'];

export function fromJson(text: string): ImportResult {
  if (bytes(text) > FILE_LIMIT) throw Error('size');
  const value: unknown = JSON.parse(text);
  if (!record(value)) throw Error('invalid');
  if (value.linkmap === undefined) return fromGeoJson(text);
  if (!record(value.linkmap)) throw Error('profile');
  if (value.linkmap.format === 'atlas-v2') return fromGeoJson(text);
  if (value.linkmap.format !== 'import-v1' || value.type !== 'FeatureCollection' || !Array.isArray(value.features)) throw Error('profile');
  if (value.name !== undefined && (typeof value.name !== 'string' || bytes(value.name) > LIMITS.titleBytes)) throw Error('title');
  const skipped = Object.keys(value)
    .filter((k) => !['type', 'name', 'linkmap', 'features'].includes(k))
    .map((k) => 'field: ' + k);
  for (const k of Object.keys(value.linkmap)) if (k !== 'format') skipped.push('linkmap field: ' + k);
  const features = value.features.flatMap((f: unknown, i: number) => {
    if (!record(f) || f.type !== 'Feature' || !record(f.properties)) {
      skipped.push(`feature ${i + 1}: invalid profile fields`);
      return [];
    }
    const p = f.properties;
    const optional = (key: string, fallback: unknown) => (p[key] === undefined ? fallback : p[key]);
    const candidate = {
      kind: 'point',
      coords: [[0, 0]],
      color: 0,
      name: optional('name', ''),
      note: optional('note', ''),
      info: {
        address: optional('address', ''),
        category: optional('category', ''),
        services: optional('services', []),
        hours: optional('hours', ''),
      },
      ...(p.color === undefined ? {} : { customColor: p.color }),
    };
    // Validate metadata before geometry conversion: malformed fields must not disappear silently.
    const envelope: unknown = { ...emptyDoc(), features: [candidate] };
    if (!validDocument(envelope)) {
      skipped.push(`feature ${i + 1}: invalid profile fields`);
      return [];
    }
    const validated = envelope.features[0];
    if (!validated) return [];
    for (const k of Object.keys(f)) if (!['type', 'properties', 'geometry'].includes(k)) skipped.push('feature field: ' + k);
    for (const k of Object.keys(p)) if (!fields.includes(k)) skipped.push('property: ' + k);
    return [
      {
        type: 'Feature',
        geometry: f.geometry,
        properties: {
          name: validated.name,
          note: validated.note,
          info: validated.info,
          ...(validated.customColor ? { customColor: validated.customColor } : {}),
        },
      },
    ];
  });
  const result = fromGeoJson(JSON.stringify({ type: 'FeatureCollection', name: value.name, features }));
  return { ...result, skipped: [...skipped, ...result.skipped] };
}

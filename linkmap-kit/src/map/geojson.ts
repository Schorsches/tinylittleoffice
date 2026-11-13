import type { FeatureCollection, Geometry, Point, LineString, Polygon } from 'geojson';
import { wrapLng, PALETTE, type Feature, type AtlasDoc as MapDoc, type LngLat } from '../format/index.ts';
export function geometry(f: Feature): Point | LineString | Polygon {
  const c = f.coords.map((p) => [...p]);
  if (f.kind === 'point') return { type: 'Point', coordinates: c[0] ?? [0, 0] };
  if (f.kind === 'line') return { type: 'LineString', coordinates: c };
  return { type: 'Polygon', coordinates: [[...c, c[0] ?? [0, 0]]] };
}
export function toGeoJson(doc: MapDoc, visible?: number[]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: doc.features.flatMap((f, i) =>
      !visible || visible.includes(i)
        ? [
            {
              type: 'Feature',
              id: i,
              geometry: geometry(f),
              properties: {
                i,
                kind: f.kind,
                color: f.color,
                fillColor: f.customColor ?? PALETTE[f.color],
                strokeColor: f.customColor && parseInt(f.customColor.slice(1), 16) > 0xcccccc ? '#334155' : '#ffffff',
                name: f.name,
                note: f.note,
              },
            },
          ]
        : [],
    ),
  };
}
export function fromDraw(g: Geometry): Feature | null {
  let coords: LngLat[];
  let kind: Feature['kind'];
  if (g.type === 'Point') {
    kind = 'point';
    coords = [[g.coordinates[0] ?? NaN, g.coordinates[1] ?? NaN]];
  } else if (g.type === 'LineString') {
    kind = 'line';
    coords = g.coordinates.map((p) => [p[0] ?? NaN, p[1] ?? NaN]);
  } else if (g.type === 'Polygon') {
    kind = 'polygon';
    coords = (g.coordinates[0] ?? []).map((p) => [p[0] ?? NaN, p[1] ?? NaN]);
    const first = coords[0],
      last = coords.at(-1);
    if (first && last && first[0] === last[0] && first[1] === last[1]) coords.pop();
  } else return null;
  return { kind, coords: coords.map(([x, y]) => [wrapLng(x), y]), name: '', note: '', color: 0 };
}

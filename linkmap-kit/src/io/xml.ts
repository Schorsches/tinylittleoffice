import { PALETTE, LIMITS, type Feature, type MapDoc, type LngLat } from '../format/index.ts';
import { bytes, FILE_LIMIT, limited, validateImport, type ImportResult } from './geojson.ts';
const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c] ?? c);
const children = (e: Element, name: string) => Array.from(e.children).filter((c) => c.localName === name);
const descendants = (e: Document | Element, name: string) => Array.from(e.getElementsByTagNameNS('*', name));
const text = (e: Element, name: string) => children(e, name)[0]?.textContent ?? '';
export function fromGpx(source: string): ImportResult {
  if (bytes(source) > FILE_LIMIT || /<!DOCTYPE|<!ENTITY/i.test(source)) throw Error('invalid');
  const xml = new DOMParser().parseFromString(source, 'application/xml');
  if (xml.querySelector('parsererror') || xml.documentElement.localName !== 'gpx') throw Error('invalid');
  const features: Feature[] = [];
  const skipped: string[] = [];
  const numeric = (value: string | null) => (value !== null && value.trim() ? Number(value) : NaN);
  const point = (p: Element): LngLat => [numeric(p.getAttribute('lon')), numeric(p.getAttribute('lat'))];
  const add = (kind: Feature['kind'], coords: LngLat[], el: Element) =>
    features.push({
      kind,
      coords,
      name: limited(text(el, 'name'), LIMITS.nameBytes),
      note: limited(text(el, 'desc'), LIMITS.noteBytes),
      color: 0,
    });
  for (const p of descendants(xml, 'wpt')) add('point', [point(p)], p);
  for (const p of descendants(xml, 'rte')) add('line', children(p, 'rtept').map(point), p);
  for (const p of descendants(xml, 'trk')) for (const seg of children(p, 'trkseg')) add('line', children(seg, 'trkpt').map(point), p);
  if (features.some((f) => f.coords.some((p) => Math.abs(p[0]) > 180))) throw Error('invalid');
  return validateImport(features, skipped);
}
export function toGpx(doc: MapDoc) {
  const tags = (f: Feature) => `<name>${escape(f.name)}</name><desc>${escape(f.note)}</desc>`;
  return `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="Linkmap" xmlns="http://www.topografix.com/GPX/1/1">${doc.features
    .filter((f) => f.kind !== 'polygon')
    .map((f) =>
      f.kind === 'point'
        ? `<wpt lon="${f.coords[0]?.[0]}" lat="${f.coords[0]?.[1]}">${tags(f)}</wpt>`
        : `<trk>${tags(f)}<trkseg>${f.coords.map(([x, y]) => `<trkpt lon="${x}" lat="${y}"/>`).join('')}</trkseg></trk>`,
    )
    .join('')}</gpx>`;
}
export function toKml(doc: MapDoc) {
  return `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${escape(doc.title)}</name>${doc.features
    .map((f) => {
      const c = (f.kind === 'polygon' ? [...f.coords, f.coords[0] ?? [0, 0]] : f.coords).map((p) => `${p[0]},${p[1]},0`).join(' ');
      const g =
        f.kind === 'point'
          ? `<Point><coordinates>${c}</coordinates></Point>`
          : f.kind === 'line'
            ? `<LineString><coordinates>${c}</coordinates></LineString>`
            : `<Polygon><outerBoundaryIs><LinearRing><coordinates>${c}</coordinates></LinearRing></outerBoundaryIs></Polygon>`;
      const hex = PALETTE[f.color].slice(1),
        color = `ff${hex.slice(4, 6)}${hex.slice(2, 4)}${hex.slice(0, 2)}`;
      return `<Placemark><name>${escape(f.name)}</name><description>${escape(f.note)}</description><Style><LineStyle><color>${color}</color><width>3</width></LineStyle><PolyStyle><color>33${color.slice(2)}</color></PolyStyle><IconStyle><color>${color}</color></IconStyle></Style>${g}</Placemark>`;
    })
    .join('')}</Document></kml>`;
}

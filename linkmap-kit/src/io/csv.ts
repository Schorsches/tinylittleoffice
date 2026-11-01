import { fromGeoJson, bytes, FILE_LIMIT } from './geojson.ts';
const columns = ['name', 'longitude', 'latitude', 'address', 'category', 'services', 'hours', 'note'];
/** RFC-4180-style quoted records, including escaped quotes and embedded line breaks. */
function rows(text: string) {
  const all: string[][] = [];
  let row: string[] = [],
    value = '',
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        value += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === ',' && !quoted) {
      row.push(value);
      value = '';
    } else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(value);
      if (row.some((x) => x.trim())) all.push(row);
      row = [];
      value = '';
    } else value += c;
  }
  if (quoted) throw Error('quote');
  row.push(value);
  if (row.some((x) => x.trim())) all.push(row);
  return all;
}
export function fromCsv(source: string) {
  if (bytes(source) > FILE_LIMIT) throw Error('size');
  const data = rows(source.replace(/^\uFEFF/, '')),
    header = data.shift() ?? [];
  if (!['name', 'longitude', 'latitude'].every((k) => header.includes(k)) || new Set(header).size !== header.length) throw Error('columns');
  const skipped = header.filter((k) => !columns.includes(k)).map((k) => `column: ${k}`);
  const features = data.flatMap((r, i) => {
    const get = (k: string) => r[header.indexOf(k)]?.trim() ?? '';
    const x = get('longitude'),
      y = get('latitude');
    if (
      !x ||
      !y ||
      !Number.isFinite(Number(x)) ||
      !Number.isFinite(Number(y)) ||
      Math.abs(Number(x)) > 180 ||
      Math.abs(Number(y)) > 90 ||
      !get('name')
    ) {
      skipped.push(`row ${i + 2}: name/coordinates`);
      return [];
    }
    return [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [Number(x), Number(y)] },
        properties: {
          name: get('name'),
          note: get('note'),
          info: {
            address: get('address'),
            category: get('category'),
            services: get('services').split('|').filter(Boolean),
            hours: get('hours'),
          },
        },
      },
    ];
  });
  const result = fromGeoJson(JSON.stringify({ type: 'FeatureCollection', features }));
  return { ...result, skipped: [...skipped, ...result.skipped] };
}
export const csvTemplate =
  'name,longitude,latitude,address,category,services,hours,note\r\n"Beispielort",8.3712,49.2176,"Beispielstraße 1 · Germersheim",Information,"Stufenloser Zugang|Information","Samstag 14–22 Uhr","Fiktive Beispieldaten"\r\n';

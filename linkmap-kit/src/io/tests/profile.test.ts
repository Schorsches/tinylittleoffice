import { describe, expect, it } from 'vitest';
import { fromJson } from '../profile.ts';
import { importTemplate } from '../import-guide.ts';
import { decodeDocument, documentPayload, documentHash, encodeDocument, emptyDoc } from '../../format/index.ts';
import { toGeoJson } from '../geojson.ts';
const feature = {
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [8.3, 49.2] },
  properties: {
    name: 'Meet here',
    address: 'Street 1',
    category: 'Meeting',
    services: ['Step-free'],
    hours: 'Sat 14–22',
    color: '#123456',
    note: 'Bring water',
  },
};
const source = (features: unknown[] = [feature]) =>
  JSON.stringify({ type: 'FeatureCollection', name: 'Day out', linkmap: { format: 'import-v1' }, features });
describe('normalized import profile', () => {
  it('converts flat metadata and retains it through links and native GeoJSON', () => {
    const result = fromJson(source());
    expect(result.skipped).toEqual([]);
    expect(result.doc.title).toBe('Day out');
    expect(result.doc.features[0]).toMatchObject({
      customColor: '#123456',
      note: 'Bring water',
      info: { address: 'Street 1', category: 'Meeting', services: ['Step-free'], hours: 'Sat 14–22' },
    });
    expect(decodeDocument(documentPayload(documentHash(encodeDocument(result.doc)))!)).toEqual(result.doc);
    expect(fromJson(toGeoJson(result.doc)).doc).toEqual(result.doc);
  });
  it('accepts the downloadable template and ordinary GeoJSON', () => {
    expect(fromJson(importTemplate).doc.features).toHaveLength(3);
    expect(fromJson(toGeoJson(emptyDoc())).doc).toEqual(emptyDoc());
    expect(fromJson(JSON.stringify(feature)).skipped).toContain('property: address');
  });
  it('reports unsupported fields, invalid metadata and missing coordinates without guessing', () => {
    const result = fromJson(
      source([
        { ...feature, properties: { ...feature.properties, website: 'not supported' } },
        { ...feature, geometry: null },
        { ...feature, properties: { ...feature.properties, services: 'Vegan' } },
        { ...feature, properties: { ...feature.properties, address: 'x'.repeat(2001) } },
        { ...feature, properties: { ...feature.properties, color: 'url(evil)' } },
        { ...feature, properties: { name: '<img src=x onerror=alert(1)>', note: '<script>oops</script>' } },
      ]),
    );
    expect(result.doc.features).toHaveLength(2);
    expect(result.skipped).toContain('property: website');
    expect(result.skipped).toContain('invalid');
    expect(result.skipped.filter((v) => v.includes('profile fields'))).toHaveLength(3);
    expect(result.doc.features[1]?.name).toBe('<img src=x onerror=alert(1)>');
  });
  it('rejects unknown profile versions, malformed envelopes and oversized sources', () => {
    expect(() => fromJson(source().replace('import-v1', 'import-v2'))).toThrow();
    expect(() => fromJson(source().replace('"features":[', '"features":null,"other":['))).toThrow();
    expect(() => fromJson('{')).toThrow();
    expect(() => fromJson(source().replace('"Day out"', '123'))).toThrow();
    expect(fromJson(source([{ ...feature, properties: { ...feature.properties, services: null } }])).doc.features).toHaveLength(0);
    expect(() => fromJson(' '.repeat(10 * 1024 * 1024 + 1))).toThrow();
  });
});

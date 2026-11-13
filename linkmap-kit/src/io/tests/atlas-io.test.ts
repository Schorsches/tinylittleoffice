import { expect, it } from 'vitest';
import { fromGeoJson, toGeoJson } from '../geojson.ts';
import { emptyDoc, type AtlasDoc } from '../../format/index.ts';
import { fromCsv } from '../csv.ts';
it('exports and reimports extended place fields and settings without loss', () => {
  const d: AtlasDoc = {
    ...emptyDoc(),
    title: 'D',
    settings: { preset: 'event', accent: '#15604c', showLocation: true, interactive: true, showLabels: true },
    features: [
      {
        kind: 'point',
        coords: [[8.3, 49.2]],
        name: 'A',
        note: 'B',
        color: 0,
        customColor: '#123456',
        info: { address: 'Street 1', category: 'Food', services: ['Vegan'], hours: 'Mo 9–17' },
      },
    ],
  };
  const r = fromGeoJson(toGeoJson(d));
  expect(r.doc).toEqual(d);
  expect(r.doc.settings).toEqual(d.settings);
  expect(r.skipped).toEqual([]);
});
it('reports unsupported properties rather than silently discarding them', () => {
  const r = fromGeoJson(
    JSON.stringify({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [8, 49] },
      properties: { name: 'A', secretField: 'x', openingHours: { weekly: [] } },
    }),
  );
  expect(r.skipped.some((s) => s.includes('secretField'))).toBe(true);
  expect(r.skipped.some((s) => s.includes('openingHours'))).toBe(true);
});
it('reads quoted CSV and refuses invalid or guessed coordinates', () => {
  const r = fromCsv(
    'name,longitude,latitude,address,category,services,hours\r\n"Cafe, A",8.3,49.2,Street,Food,Vegan|WiFi,Mon\r\nBad,,,Nowhere,,,',
  );
  expect(r.doc.features).toHaveLength(1);
  expect(r.doc.features[0]?.info?.services).toEqual(['Vegan', 'WiFi']);
  expect(r.skipped.length).toBeGreaterThan(0);
});

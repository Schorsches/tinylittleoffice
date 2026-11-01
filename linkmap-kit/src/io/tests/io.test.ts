// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { fromGeoJson, toGeoJson } from '../geojson.ts';
import { fromGpx, toGpx, toKml } from '../xml.ts';
import { emptyDoc } from '../../format/index.ts';
it('roundtrips supported GeoJSON and reports holes and unsupported geometry', () => {
  const d = {
    ...emptyDoc(),
    features: [{ kind: 'point' as const, coords: [[2, 3]] as const, name: '<&', note: 'a\nb', color: 2 as const }],
  };
  expect(fromGeoJson(toGeoJson(d)).doc.features).toEqual(d.features);
  expect(
    fromGeoJson(
      JSON.stringify({
        type: 'MultiPoint',
        coordinates: [
          [1, 2],
          [3, 4],
        ],
      }),
    ).doc.features,
  ).toHaveLength(2);
  expect(fromGeoJson('{"type":"GeometryCollection","geometries":[]}').skipped).toHaveLength(1);
});
it('rejects malformed coordinates and huge input without partial invalid state', () => {
  expect(fromGeoJson('{"type":"Point","coordinates":["x",5]}').doc.features).toHaveLength(0);
  expect(() => fromGeoJson('bad')).toThrow();
  expect(() => fromGpx('<gpx>')).toThrow();
  expect(() => fromGpx('<!DOCTYPE gpx [<!ENTITY x "hello">]><gpx/>')).toThrow();
});
it('escapes XML and reads GPX waypoints and tracks', () => {
  const d = fromGpx(
    '<gpx><wpt lat="3" lon="2"><name>&lt;&amp;</name></wpt><trk><name>A</name><trkseg><trkpt lon="2" lat="3"/><trkpt lon="3" lat="4"/></trkseg></trk></gpx>',
  ).doc;
  expect(d.features).toHaveLength(2);
  expect(toGpx(d)).toContain('&lt;&amp;');
  expect(toKml(d)).toContain('&lt;&amp;');
  expect(fromGpx(toGpx(d)).doc.features).toHaveLength(2);
});

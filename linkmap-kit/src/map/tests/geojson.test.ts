import { expect, it } from 'vitest';
import { toGeoJson, fromDraw } from '../geojson.ts';
import { emptyDoc } from '../../format/index.ts';
it('closes polygon rings for display and un-closes them on input', () => {
  const f = {
    kind: 'polygon' as const,
    coords: [
      [0, 0],
      [1, 0],
      [1, 1],
    ] as const,
    name: '<script>',
    note: '',
    color: 0 as const,
  };
  const g = toGeoJson({ ...emptyDoc(), features: [f] });
  expect(g.features[0]?.geometry.type).toBe('Polygon');
  const back = fromDraw(g.features[0]!.geometry);
  expect(back?.coords).toEqual(f.coords);
  expect(g.features[0]?.properties?.name).toBe('<script>');
});

import { expect, it } from 'vitest';
import { emptyDoc, type AtlasDoc } from '../../format/index.ts';
import { filteredIndexes } from '../filter.ts';
it('searches locally and combines category and service constraints', () => {
  const d: AtlasDoc = {
    ...emptyDoc(),
    features: [
      {
        kind: 'point',
        coords: [[0, 0]],
        name: 'A',
        note: '',
        color: 0,
        info: { address: 'Street', category: 'Food', services: ['Vegan'], hours: '' },
      },
      { kind: 'point', coords: [[1, 1]], name: 'B', note: '', color: 1 },
    ],
  };
  expect(filteredIndexes(d, 'street', 'Food', 'Vegan')).toEqual([0]);
  expect(filteredIndexes(d, '', 'Food', 'WiFi')).toEqual([]);
  expect(filteredIndexes(d, '', '', '')).toEqual([0, 1]);
});

import { expect, it } from 'vitest';
import { simplify } from '../simplify.ts';
it('reduces straight lines and retains endpoints and minimum polygon size', () => {
  const line = {
    kind: 'line' as const,
    coords: [
      [0, 0],
      [0.001, 0],
      [0.002, 0],
    ] as const,
    name: '',
    note: '',
    color: 0 as const,
  };
  expect(simplify(line, 10).coords).toEqual([
    [0, 0],
    [0.002, 0],
  ]);
  const polygon = { ...line, kind: 'polygon' as const };
  expect(simplify(polygon, 1000).coords.length).toBeGreaterThanOrEqual(3);
  expect(simplify({ ...line, kind: 'point', coords: [[0, 0]] }, 10).coords).toEqual([[0, 0]]);
});

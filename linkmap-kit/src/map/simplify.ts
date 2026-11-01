import type { Feature, LngLat } from '../format/index.ts';
/** Iterative Douglas–Peucker avoids stack overflows on large imported tracks. */
export function simplify(f: Feature, metres: number): Feature {
  if (f.kind === 'point' || f.coords.length < 3) return f;
  const input = f.kind === 'polygon' ? [...f.coords, f.coords[0] ?? ([0, 0] as LngLat)] : f.coords;
  const scale = Math.cos(((input.reduce((n, p) => n + p[1], 0) / input.length) * Math.PI) / 180);
  // Unwrap longitudes so a track across the antimeridian has its actual local shape.
  let previous = input[0]?.[0] ?? 0;
  const projected = input.map(([lng, lat]) => {
    while (lng - previous > 180) lng -= 360;
    while (lng - previous < -180) lng += 360;
    previous = lng;
    return [lng * 111320 * scale, lat * 111320] as const;
  });
  const keep = new Set([0, input.length - 1]);
  const stack: Array<[number, number]> = [[0, input.length - 1]];
  while (stack.length) {
    const range = stack.pop();
    if (!range) break;
    const [a, b] = range,
      A = projected[a],
      B = projected[b];
    if (!A || !B) continue;
    let best = metres * metres,
      index = -1;
    const dx = B[0] - A[0],
      dy = B[1] - A[1],
      len = dx * dx + dy * dy;
    for (let i = a + 1; i < b; i++) {
      const p = projected[i];
      if (!p) continue;
      const t = len ? Math.max(0, Math.min(1, ((p[0] - A[0]) * dx + (p[1] - A[1]) * dy) / len)) : 0;
      const d = (p[0] - A[0] - t * dx) ** 2 + (p[1] - A[1] - t * dy) ** 2;
      if (d > best) {
        best = d;
        index = i;
      }
    }
    if (index !== -1) {
      keep.add(index);
      stack.push([a, index], [index, b]);
    }
  }
  let coords = input.filter((_, i) => keep.has(i));
  if (f.kind === 'polygon') coords = coords.slice(0, -1);
  return coords.length < (f.kind === 'polygon' ? 3 : 2) ? f : { ...f, coords };
}

import type { MapDoc } from '../model.ts';

/** A small walk in Lisbon: two pins, a route and an area. Used by the golden test: its link must never change. */
export const LISBON: MapDoc = {
  title: 'Saturday in Lisbon',
  view: { lng: -9.1393, lat: 38.7223, zoom: 13.5, bearing: 0, pitch: 0 },
  features: [
    { kind: 'point', coords: [[-9.13333, 38.71139]], name: 'Praça do Comércio', note: 'Start at 10:00', color: 0 },
    { kind: 'point', coords: [[-9.14843, 38.71388]], name: 'Pastéis', note: '', color: 3 },
    {
      kind: 'line',
      coords: [
        [-9.13333, 38.71139],
        [-9.1365, 38.7123],
        [-9.1421, 38.7131],
        [-9.14843, 38.71388],
      ],
      name: 'Walk',
      note: '',
      color: 1,
    },
    {
      kind: 'polygon',
      coords: [
        [-9.1372, 38.7128],
        [-9.1352, 38.7128],
        [-9.1352, 38.7112],
        [-9.1372, 38.7112],
      ],
      name: '',
      note: 'Market',
      color: 2,
    },
  ],
};

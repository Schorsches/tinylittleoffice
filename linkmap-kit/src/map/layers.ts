import type { Map, GeoJSONSource, ExpressionSpecification } from 'maplibre-gl';
import { PALETTE, type MapDoc } from '../format/index.ts';
import { toGeoJson } from './geojson.ts';
const color: ExpressionSpecification = ['to-color', ['at', ['get', 'color'], ['literal', [...PALETTE]]]];
export function installLayers(map: Map) {
  map.addSource('linkmap', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({
    id: 'linkmap-fill',
    source: 'linkmap',
    type: 'fill',
    filter: ['==', ['get', 'kind'], 'polygon'],
    paint: { 'fill-color': color, 'fill-opacity': 0.2 },
  });
  map.addLayer({
    id: 'linkmap-line',
    source: 'linkmap',
    type: 'line',
    filter: ['!=', ['get', 'kind'], 'point'],
    paint: { 'line-color': color, 'line-width': 3 },
  });
  map.addLayer({
    id: 'linkmap-point',
    source: 'linkmap',
    type: 'circle',
    filter: ['==', ['get', 'kind'], 'point'],
    paint: { 'circle-color': color, 'circle-radius': 7, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 },
  });
  map.addLayer({
    id: 'linkmap-label',
    source: 'linkmap',
    type: 'symbol',
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['Noto Sans Regular'],
      'text-size': 13,
      'text-offset': [0, 1.3],
      'text-anchor': 'top',
    },
    paint: { 'text-color': '#172033', 'text-halo-color': '#ffffff', 'text-halo-width': 2 },
  });
}
export function updateLayers(map: Map, doc: MapDoc, selected: number | null) {
  (map.getSource('linkmap') as GeoJSONSource | undefined)?.setData(toGeoJson(doc));
  if (map.getLayer('linkmap-line'))
    map.setPaintProperty('linkmap-line', 'line-width', ['case', ['==', ['get', 'i'], selected ?? -1], 6, 3]);
  if (map.getLayer('linkmap-point'))
    map.setPaintProperty('linkmap-point', 'circle-radius', ['case', ['==', ['get', 'i'], selected ?? -1], 10, 7]);
}

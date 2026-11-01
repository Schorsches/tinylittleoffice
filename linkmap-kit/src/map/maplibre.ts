/**
 * The only door to MapLibre GL JS. It is ~1 MB of JavaScript, so it is imported lazily, on the first map, never
 * part of the first page load. Security-relevant settings live here and nowhere else:
 *  - the worker is a same-origin file built by Vite (CSP worker-src 'self'), never a blob: URL;
 *  - every request is checked against the allow-list (defense in depth behind connect-src);
 *  - OpenFreeMap's attribution stays visible (their terms, and OpenStreetMap's ODbL, require it).
 */
import type * as ML from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { isAllowedUrl, STYLE_URL } from '../net/allowlist.ts';
import type { View } from '../format/index.ts';

export type MapLibre = typeof ML;

let loading: Promise<MapLibre> | undefined;

/** MapLibre and its stylesheet, loaded once. */
export function loadMapLibre(): Promise<MapLibre> {
  loading ??= Promise.all([import('maplibre-gl'), import('maplibre-gl/dist/maplibre-gl.css')]).then(([m]) => {
    m.setWorkerUrl(workerUrl);
    return m;
  });
  return loading;
}

/** A map on OpenFreeMap Liberty in `container`, at `view`. The caller owns it and must call map.remove() on unmount. */
export async function createMap(container: HTMLElement, view: View): Promise<ML.Map> {
  const ml = await loadMapLibre();
  return new ml.Map({
    container,
    style: STYLE_URL,
    center: [view.lng, view.lat],
    zoom: view.zoom,
    bearing: view.bearing,
    pitch: view.pitch,
    attributionControl: { compact: true },
    // A request the allow-list does not name is sent to an unroutable address instead (the CSP blocks it as well).
    transformRequest: (url) => (isAllowedUrl(url) ? { url } : { url: 'about:blank' }),
    // Respect reduced motion; the editor also skips flyTo animations then.
    fadeDuration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 300,
  });
}

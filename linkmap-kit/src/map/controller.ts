import type { Map } from 'maplibre-gl';
import { createMap, loadMapLibre } from './maplibre.ts';
import { installLayers, updateLayers } from './layers.ts';
import { createDraw } from './draw.ts';
import { useStore } from '../state/store.ts';
export async function mountMap(el: HTMLElement, onError: () => void, onReady: () => void) {
  const s = useStore.getState;
  const map: Map = await createMap(el, s().doc.view);
  let draw: ReturnType<typeof createDraw> | undefined;
  let muted = false;
  let disposed = false;
  let suppressView = false;
  const apply = () => {
    if (!map.getSource('linkmap')) return;
    const st = s();
    updateLayers(map, st.doc, st.selected);
    draw?.sync(st.tool, st.selected, st.selected === null ? undefined : st.doc.features[st.selected]);
  };
  const unsub = useStore.subscribe((st, prev) => {
    if (st.doc.features !== prev.doc.features || st.selected !== prev.selected || st.tool !== prev.tool) apply();
    if (st.revision !== prev.revision) {
      muted = true;
      map.jumpTo({ center: [st.doc.view.lng, st.doc.view.lat], ...st.doc.view });
      muted = false;
    }
    if (st.selected !== prev.selected && st.selected !== null) {
      const f = st.doc.features[st.selected];
      if (f?.coords.length) {
        const xs = f.coords.map((p) => p[0]),
          ys = f.coords.map((p) => p[1]);
        map.fitBounds(
          [
            [xs.reduce((a, b) => Math.min(a, b), Infinity), ys.reduce((a, b) => Math.min(a, b), Infinity)],
            [xs.reduce((a, b) => Math.max(a, b), -Infinity), ys.reduce((a, b) => Math.max(a, b), -Infinity)],
          ],
          { padding: 65, maxZoom: 16, duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 350 },
        );
      }
    }
  });
  map.on('error', onError);
  map.on('load', () => {
    if (disposed) return;
    installLayers(map);
    draw = createDraw(
      map,
      (f) => s().addFeature({ ...f, color: s().lastColor }),
      (i, f) => {
        if (JSON.stringify(s().doc.features[i]?.coords) !== JSON.stringify(f.coords)) s().updateFeature(i, { coords: f.coords });
      },
    );
    apply();
    onReady();
  });
  map.on('moveend', () => {
    if (muted || suppressView) return;
    const c = map.getCenter();
    s().setView({ lng: c.lng, lat: c.lat, zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch() });
  });
  map.on('click', (e) => {
    if (s().tool !== 'select' || !map.getSource('linkmap')) return;
    const hit = map.queryRenderedFeatures(e.point, { layers: ['linkmap-point', 'linkmap-line', 'linkmap-fill'] })[0];
    const i = hit?.properties?.i;
    if (typeof i === 'number' && i !== s().selected) useStore.setState({ selected: i });
  });
  map.getCanvas().addEventListener('webglcontextlost', onError);
  const ml = await loadMapLibre();
  if (!disposed) {
    map.addControl(new ml.NavigationControl(), 'top-right');
  }
  return {
    dispose() {
      disposed = true;
      unsub();
      draw?.stop();
      map.remove();
    },
    locate() {
      if (!navigator.geolocation) return onError();
      navigator.geolocation.getCurrentPosition((p) => {
        suppressView = true;
        map.jumpTo({ center: [p.coords.longitude, p.coords.latitude], zoom: 14 });
        suppressView = false;
      }, onError);
    },
  };
}

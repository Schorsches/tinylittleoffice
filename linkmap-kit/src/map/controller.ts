import type { Map } from 'maplibre-gl';
import { createMap, loadMapLibre } from './maplibre.ts';
import { installLayers, updateLayers } from './layers.ts';
import { createDraw } from './draw.ts';
import { filteredIndexes } from '../state/filter.ts';
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
    updateLayers(
      map,
      st.doc,
      st.selected,
      st.mode === 'view' ? filteredIndexes(st.doc, st.search, st.categoryFilter, st.serviceFilter) : undefined,
    );
    draw?.sync(
      st.mode === 'view' ? 'select' : st.tool,
      st.mode === 'view' ? null : st.selected,
      st.mode === 'view' || st.selected === null ? undefined : st.doc.features[st.selected],
    );
    const interactive = st.mode === 'edit' || st.doc.settings?.interactive !== false;
    for (const handler of [
      map.scrollZoom,
      map.boxZoom,
      map.dragRotate,
      map.dragPan,
      map.keyboard,
      map.doubleClickZoom,
      map.touchZoomRotate,
    ]) {
      if (interactive) handler.enable();
      else handler.disable();
    }
  };
  const unsub = useStore.subscribe((st, prev) => {
    if (
      st.doc.features !== prev.doc.features ||
      st.selected !== prev.selected ||
      st.tool !== prev.tool ||
      st.mode !== prev.mode ||
      st.search !== prev.search ||
      st.categoryFilter !== prev.categoryFilter ||
      st.serviceFilter !== prev.serviceFilter ||
      st.doc.settings !== prev.doc.settings
    )
      apply();
    if (st.revision !== prev.revision || JSON.stringify(st.doc.view) !== JSON.stringify(prev.doc.view)) {
      muted = true;
      map.jumpTo({ center: [st.doc.view.lng, st.doc.view.lat], ...st.doc.view });
      muted = false;
    }
    if (st.selected !== prev.selected && st.selected !== null) {
      const f = st.doc.features[st.selected];
      if (f?.coords.length && f.coords.some((p) => !map.getBounds().contains([p[0], p[1]]))) {
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
    const view = s().doc.view;
    muted = true;
    map.jumpTo({ center: [view.lng, view.lat], ...view });
    muted = false;
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
  const observer = new ResizeObserver(() => map.resize());
  observer.observe(el);
  const ml = await loadMapLibre();
  if (!disposed) {
    map.addControl(new ml.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new ml.ScaleControl(), 'bottom-right');
  }
  return {
    finish() {
      draw?.finish();
    },
    dispose() {
      disposed = true;
      observer.disconnect();
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

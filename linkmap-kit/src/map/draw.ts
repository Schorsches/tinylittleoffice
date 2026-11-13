import type { Map } from 'maplibre-gl';
import { TerraDraw, TerraDrawPointMode, TerraDrawLineStringMode, TerraDrawPolygonMode, TerraDrawSelectMode } from 'terra-draw';
import { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter';
import type { Feature } from '../format/index.ts';
import type { Tool } from '../state/store.ts';
import { fromDraw, geometry } from './geojson.ts';
export function createDraw(map: Map, onAdd: (f: Feature) => void, onEdit: (i: number, f: Feature) => void) {
  const flags = { feature: { draggable: true, coordinates: { draggable: true, deletable: true, midpoints: true } } };
  const lineMode = new TerraDrawLineStringMode({ keyEvents: { finish: 'Enter', cancel: 'Escape' } });
  const polygonMode = new TerraDrawPolygonMode({ keyEvents: { finish: 'Enter', cancel: 'Escape' } });
  let activeTool: Tool = 'select';
  const draw = new TerraDraw({
    adapter: new TerraDrawMapLibreGLAdapter({ map, coordinatePrecision: 5 }),
    modes: [
      new TerraDrawPointMode(),
      lineMode,
      polygonMode,
      new TerraDrawSelectMode({
        flags: { point: flags, linestring: flags, polygon: flags },
        keyEvents: { deselect: 'Escape', delete: null, rotate: null, scale: null },
      }),
    ],
  });
  const editId = crypto.randomUUID();
  let editing: number | null = null;
  let original: Feature | undefined;
  let syncing = false;
  const commit = () => {
    if (editing === null || !original) return;
    const g = draw.getSnapshotFeature(editId);
    const f = g && fromDraw(g.geometry);
    if (f) onEdit(editing, { ...original, coords: f.coords });
  };
  // Terra Draw emits finish for each completed drag or vertex edit: one undo entry per gesture.
  draw.on('finish', (id, ctx) => {
    if (syncing) return;
    if (ctx.action !== 'draw') {
      queueMicrotask(commit);
      return;
    }
    const g = draw.getSnapshotFeature(id);
    const f = g && fromDraw(g.geometry);
    if (f) queueMicrotask(() => onAdd(f));
  });
  draw.start();
  draw.setMode('select');
  return {
    finish() {
      if (activeTool === 'line' || activeTool === 'polygon')
        (activeTool === 'line' ? lineMode : polygonMode).onKeyUp({ key: 'Enter', heldKeys: [], preventDefault: () => {} });
    },
    sync(tool: Tool, index: number | null, feature?: Feature) {
      activeTool = tool;
      if (
        tool === 'select' &&
        editing === index &&
        feature &&
        original &&
        JSON.stringify(feature.coords) === JSON.stringify(original.coords)
      ) {
        original = feature;
        return;
      }
      syncing = true;
      draw.setMode('select');
      draw.clear();
      editing = null;
      original = undefined;
      if (tool === 'select' && index !== null && feature) {
        editing = index;
        original = feature;
        draw.addFeatures([
          {
            type: 'Feature',
            id: editId,
            geometry: geometry(feature),
            properties: { mode: feature.kind === 'line' ? 'linestring' : feature.kind },
          },
        ]);
        draw.selectFeature(editId);
      } else draw.setMode(tool === 'line' ? 'linestring' : tool);
      syncing = false;
    },
    stop() {
      draw.stop();
    },
  };
}

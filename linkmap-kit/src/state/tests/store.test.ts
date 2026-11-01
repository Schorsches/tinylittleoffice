import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from '../store.ts';
import { emptyDoc } from '../../format/index.ts';
beforeEach(() => useStore.getState().replaceDoc(emptyDoc()));
describe('document actions', () => {
  it('validates edits and supports undo and redo', () => {
    const s = useStore.getState;
    expect(s().addFeature({ kind: 'line', coords: [[0, 0]], name: '', note: '', color: 0 })).toBe(false);
    s().addFeature({ kind: 'point', coords: [[1, 2]], name: 'A', note: '', color: 0 });
    s().updateFeature(0, { name: 'B' });
    expect(s().doc.features[0]?.name).toBe('B');
    s().undo();
    expect(s().doc.features[0]?.name).toBe('A');
    s().redo();
    expect(s().doc.features[0]?.name).toBe('B');
    s().removeFeature(0);
    expect(s().doc.features).toHaveLength(0);
  });
  it('undoes an explicitly saved start view while panning stays transient', () => {
    const s = useStore.getState;
    const original = s().doc.view;
    s().setView({ ...original, lng: 20 });
    expect(s().doc.view).toEqual(original);
    s().commit({ ...s().doc, view: s().camera });
    expect(s().doc.view.lng).toBe(20);
    s().undo();
    expect(s().doc.view).toEqual(original);
    s().redo();
    expect(s().doc.view.lng).toBe(20);
  });
  it('caps history and excludes camera changes', () => {
    const s = useStore.getState;
    for (let i = 0; i < 110; i++) s().setTitle(String(i));
    expect(s().past).toHaveLength(100);
    s().setView({ ...s().doc.view, lng: 20 });
    expect(s().past).toHaveLength(100);
    expect(s().setTitle('ä'.repeat(201))).toBe(false);
  });
  it('clears redo after a new edit and resets selection when replacing', () => {
    const s = useStore.getState;
    s().setTitle('A');
    s().undo();
    s().setTitle('B');
    expect(s().future).toHaveLength(0);
    s().replaceDoc(emptyDoc());
    expect(s().selected).toBeNull();
    expect(s().past).toHaveLength(0);
  });
});

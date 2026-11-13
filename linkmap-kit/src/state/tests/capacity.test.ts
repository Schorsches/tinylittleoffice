import { expect, it } from 'vitest';
import { prepareDocument } from '../capacity.ts';
import { useStore } from '../store.ts';
import { emptyDoc, validDocument, encodeDocument, decodeDocument, type AtlasDoc } from '../../format/index.ts';
const large = (extended: boolean): AtlasDoc => ({
  ...emptyDoc(),
  features: Array.from({ length: 600 }, (_, i) => ({
    kind: 'point',
    coords: [[8.3, 49.2]],
    color: 0,
    name: String(i),
    note: 'a'.repeat(4000),
    ...(extended ? { info: { address: '', category: '', services: [], hours: '' } } : {}),
  })),
});
it.each([false, true])('refuses structurally valid maps beyond decoder capacity (extended: %s)', (extended) => {
  const doc = large(extended);
  expect(validDocument(doc)).toBe(true);
  expect(prepareDocument(doc)).toBeNull();
});
it('keeps the document and its history when an over-capacity commit is refused', () => {
  useStore.getState().replaceDoc(emptyDoc());
  useStore.getState().setTitle('Keep this');
  const before = useStore.getState();
  expect(useStore.getState().commit(large(true))).toBe(false);
  expect(useStore.getState().doc).toBe(before.doc);
  expect(useStore.getState().past).toBe(before.past);
  expect(useStore.getState().future).toBe(before.future);
  expect(useStore.getState().message).toBe('limit');
});
it('prepares ordinary maps as documents that round-trip through the unchanged codec', () => {
  const doc = { ...emptyDoc(), title: 'A map' };
  const result = prepareDocument(doc);
  expect(result?.doc).toEqual(doc);
  expect(decodeDocument(result!.payload)).toEqual(doc);
  expect(result?.payload).toBe(encodeDocument(doc));
});
it('rejects incompressible maps above packed capacity even when their uncompressed content fits', () => {
  let seed = 1;
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
  const doc: AtlasDoc = {
    ...emptyDoc(),
    features: Array.from({ length: 450 }, () => ({
      kind: 'point',
      coords: [[8.3, 49.2]],
      color: 0,
      name: '',
      note: Array.from({ length: 4000 }, () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return alphabet[seed >>> 26];
      }).join(''),
    })),
  };
  expect(validDocument(doc)).toBe(true);
  expect(() => decodeDocument(encodeDocument(doc))).toThrow();
  expect(prepareDocument(doc)).toBeNull();
});
it('does not update the drawing color on a rejected feature edit', () => {
  useStore.getState().replaceDoc(emptyDoc());
  useStore.getState().addFeature({ kind: 'point', coords: [[8.3, 49.2]], color: 0, name: '', note: '' });
  useStore.setState({ lastColor: 2 });
  expect(useStore.getState().updateFeature(0, { color: 3, note: 'x'.repeat(4001) })).toBe(false);
  expect(useStore.getState().lastColor).toBe(2);
});

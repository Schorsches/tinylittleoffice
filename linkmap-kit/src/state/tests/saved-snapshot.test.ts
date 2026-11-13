import { expect, it } from 'vitest';
import { savedSnapshot } from '../saved-snapshot.ts';
import { startLinkSync } from '../link.ts';
import { useStore } from '../store.ts';
import { emptyDoc, defaultSettings, newLocker, documentHash, encodeDocument, openProtectedDocument } from '../../format/index.ts';
it.each([false, true])('captures protected payloads with a generic title (extended: %s)', async (extended) => {
  let hash = '';
  const stop = startLinkSync({
    read: () => hash,
    write: (h) => {
      hash = h;
    },
    listen: () => () => {},
  });
  try {
    useStore.getState().setTitle('Private title');
    if (extended) useStore.getState().commit({ ...useStore.getState().doc, settings: defaultSettings });
    useStore.setState({ locker: await newLocker('four private map words') });
    const snapshot = await savedSnapshot('Protected map');
    expect(snapshot.title).toBe('Protected map');
    expect(snapshot.payload.startsWith(extended ? '2E' : 'E')).toBe(true);
    expect((await openProtectedDocument(snapshot.payload, 'four private map words')).doc.title).toBe('Private title');
  } finally {
    stop();
  }
});
it('rejects a save when another map is opened during encrypted link generation', async () => {
  let hash = '';
  let navigate = () => {};
  const stop = startLinkSync({
    read: () => hash,
    write: (h) => {
      hash = h;
    },
    listen: (cb) => {
      navigate = cb;
      return () => {};
    },
  });
  try {
    useStore.getState().setTitle('Private title');
    useStore.setState({ locker: await newLocker('four private map words', 1000) });
    const pending = savedSnapshot('Protected map');
    const rejected = expect(pending).rejects.toThrow();
    hash = documentHash(encodeDocument({ ...emptyDoc(), title: 'Other map' }));
    navigate();
    await rejected;
    expect(useStore.getState().doc.title).toBe('Other map');
  } finally {
    stop();
  }
});

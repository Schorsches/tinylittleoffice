import { expect, it } from 'vitest';
import { useStore } from '../store.ts';
import { startLinkSync, flushLink } from '../link.ts';
import { protect, lock, unlock, unprotect } from '../password.ts';
import { payloadOf, emptyDoc, encodeProtectedDocument, encodeDocument, documentHash, newLocker } from '../../format/index.ts';

it('discards password protection if navigation enters another password gate during derivation', async () => {
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
    useStore.getState().setTitle('First map');
    const pending = protect('four random unrelated words');
    hash = '#/v1/Eanother-protected-map';
    navigate();
    expect(await pending).toBe(false);
    expect(useStore.getState().locker).toBeNull();
    expect(useStore.getState().status).toBe('needs-password');
    expect(hash).toBe('#/v1/Eanother-protected-map');
  } finally {
    stop();
  }
});

it('discards an unlock after navigating away and back to the same protected payload', async () => {
  const payload = await encodeProtectedDocument({ ...emptyDoc(), title: 'Private' }, await newLocker('four private map words'));
  const original = documentHash(payload);
  let hash = original;
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
    const pending = unlock('four private map words');
    hash = documentHash(encodeDocument({ ...emptyDoc(), title: 'Other' }));
    navigate();
    hash = original;
    navigate();
    expect(await pending).toBe(false);
    expect(useStore.getState().status).toBe('needs-password');
    expect(useStore.getState().doc).toEqual(emptyDoc());
  } finally {
    stop();
  }
});

it('does not lock a different map opened while the encrypted flush is in flight', async () => {
  const payload = await encodeProtectedDocument({ ...emptyDoc(), title: 'Private' }, await newLocker('four private map words'));
  let hash = documentHash(payload);
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
    await unlock('four private map words');
    const pending = lock();
    hash = documentHash(encodeDocument({ ...emptyDoc(), title: 'Other' }));
    navigate();
    await pending;
    expect(useStore.getState().status).toBe('ready');
    expect(useStore.getState().doc.title).toBe('Other');
  } finally {
    stop();
  }
});
it('keeps protected edits encrypted, locks memory and restores only with the right password', async () => {
  let hash = '';
  const stop = startLinkSync({
    read: () => hash,
    write: (h) => {
      hash = h;
    },
    listen: () => () => {},
  });
  useStore.getState().setTitle('Private map');
  await protect('four random unrelated words');
  expect(payloadOf(hash)?.startsWith('E')).toBe(true);
  useStore.getState().setTitle('Another private map');
  await flushLink();
  await lock();
  expect(useStore.getState().doc).toEqual(emptyDoc());
  expect(useStore.getState().locker).toBeNull();
  await expect(unlock('incorrect')).rejects.toBeTruthy();
  expect(useStore.getState().status).toBe('needs-password');
  await unlock('four random unrelated words');
  expect(useStore.getState().doc.title).toBe('Another private map');
  await unprotect();
  expect(payloadOf(hash)?.startsWith('E')).toBe(false);
  stop();
});

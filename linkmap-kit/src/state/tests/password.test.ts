import { expect, it } from 'vitest';
import { useStore } from '../store.ts';
import { startLinkSync, flushLink } from '../link.ts';
import { protect, lock, unlock, unprotect } from '../password.ts';
import { payloadOf, emptyDoc } from '../../format/index.ts';
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

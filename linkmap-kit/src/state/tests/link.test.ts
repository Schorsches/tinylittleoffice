import { afterEach, expect, it, vi } from 'vitest';
import { startLinkSync, flushLink } from '../link.ts';
import { useStore } from '../store.ts';
import { emptyDoc, encodeMap, toHash, payloadOf } from '../../format/index.ts';
afterEach(() => vi.useRealTimers());
it('debounces edits and handles hostile hash changes without overwriting them', async () => {
  vi.useFakeTimers();
  let hash = '';
  let listener = () => {};
  const writes: string[] = [];
  const stop = startLinkSync({
    read: () => hash,
    write: (h) => {
      writes.push(h);
      hash = h;
    },
    listen: (cb) => {
      listener = cb;
      return () => {};
    },
  });
  useStore.getState().setTitle('A');
  useStore.getState().setTitle('B');
  await vi.advanceTimersByTimeAsync(151);
  expect(writes).toHaveLength(1);
  expect(hash).toBe(toHash(encodeMap({ ...emptyDoc(), title: 'B' })));
  useStore.getState().setTitle('pending');
  hash = '#/v1/z!!!';
  listener();
  await vi.advanceTimersByTimeAsync(200);
  expect(useStore.getState().status).toBe('damaged');
  expect(hash).toBe('#/v1/z!!!');
  stop();
});

it('coalesces concurrent encrypted flushes and never writes a stale document', async () => {
  const { newLocker, openSealed } = await import('../../format/index.ts');
  let hash = '';
  const stop = startLinkSync({
    read: () => hash,
    write: (h) => {
      hash = h;
    },
    listen: () => () => {},
  });
  useStore.setState({ locker: await newLocker('four random words testing') });
  useStore.getState().setTitle('Before');
  const first = flushLink();
  useStore.getState().setTitle('After');
  const second = flushLink();
  expect(await first).toBe(await second);
  const payload = payloadOf(hash);
  expect(payload?.startsWith('E')).toBe(true);
  expect((await openSealed(payload!, 'four random words testing')).doc.title).toBe('After');
  stop();
});

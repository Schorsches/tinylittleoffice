import { afterEach, expect, it, vi } from 'vitest';
import { startLinkSync, flushLink } from '../link.ts';
import { useStore } from '../store.ts';
import {
  emptyDoc,
  encodeMap,
  toHash,
  payloadOf,
  encodeDocument,
  documentHash,
  documentPayload,
  decodeDocument,
  defaultSettings,
  encodeProtectedDocument,
  newLocker,
} from '../../format/index.ts';
afterEach(() => vi.useRealTimers());
it('loads v2 visitor links and preserves metadata and visitor mode when flushing', async () => {
  const doc = { ...emptyDoc(), title: 'Visitor map', settings: { ...defaultSettings, preset: 'event' as const } };
  let hash = documentHash(encodeDocument(doc)).replace('#/', '#/view/');
  const stop = startLinkSync({
    read: () => hash,
    write: (h) => {
      hash = h;
    },
    listen: () => () => {},
  });
  try {
    expect(useStore.getState().mode).toBe('view');
    expect(useStore.getState().doc).toEqual(doc);
    await flushLink();
    expect(hash).toMatch(/^#\/view\/v2\//);
    expect(decodeDocument(documentPayload(hash.replace('#/view/', '#/'))!)).toEqual(doc);
  } finally {
    stop();
  }
});

it('gates protected v2 visitor documents without exposing their content', async () => {
  const doc = { ...emptyDoc(), title: 'Private event', settings: defaultSettings };
  const payload = await encodeProtectedDocument(doc, await newLocker('four private map words', 1000));
  const hash = documentHash(payload).replace('#/', '#/view/');
  const writes: string[] = [];
  const stop = startLinkSync({
    read: () => hash,
    write: (h) => {
      writes.push(h);
    },
    listen: () => () => {},
  });
  try {
    expect(useStore.getState().mode).toBe('view');
    expect(useStore.getState().status).toBe('needs-password');
    expect(useStore.getState().doc).toEqual(emptyDoc());
    expect(useStore.getState().payload).toBe(payload);
    expect(await flushLink()).toBe('');
    expect(writes).toEqual([]);
  } finally {
    stop();
  }
});

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

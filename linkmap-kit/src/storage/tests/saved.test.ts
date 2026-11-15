import 'fake-indexeddb/auto';
import { expect, it, vi } from 'vitest';
import { save, list, rename, remove, forgetEverything, saveLanguage, restoreLanguage, persistLanguage, enableOffline } from '../saved.ts';
import { createStore, set, get } from 'idb-keyval';
const rawStore = createStore('linkmap', 'saved');
it('persists payloads only on explicit save and supports rename, delete and forget', async () => {
  await forgetEverything();
  const id = await save({ title: 'A', payload: 'rabc' });
  expect(await list()).toHaveLength(1);
  await rename(id, 'B');
  expect((await list())[0]?.title).toBe('B');
  await remove(id);
  expect(await list()).toHaveLength(0);
  await save({ title: 'C', payload: 'Eabc' });
  await forgetEverything();
  expect(await list()).toHaveLength(0);
});

it('restores explicitly saved language and stops persisting after forgetting', async () => {
  await saveLanguage('de');
  expect(await restoreLanguage()).toBe('de');
  await forgetEverything();
  await persistLanguage('en');
  expect(await restoreLanguage()).toBeUndefined();
});

it('saves the map and selected language together', async () => {
  await forgetEverything();
  await save({ title: 'A', payload: 'rabc' }, 'de');
  expect((await list())[0]?.title).toBe('A');
  expect(await restoreLanguage()).toBe('de');
});

it.each(['abort', 'throw'])('rolls back map and language on a transaction %s and recovers for the next save', async (failure) => {
  await forgetEverything();
  const original = IDBObjectStore.prototype.put;
  const mock = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (
    this: IDBObjectStore,
    value: unknown,
    key?: IDBValidKey,
  ) {
    if (key === 'settings' && failure === 'throw') throw Error('write unavailable');
    const request = original.call(this, value, key);
    if (key === 'settings') this.transaction.abort();
    return request;
  });
  try {
    await expect(save({ title: 'Must roll back', payload: 'rabc' }, 'de')).rejects.toBeDefined();
  } finally {
    mock.mockRestore();
  }
  expect(await list()).toEqual([]);
  expect(await restoreLanguage()).toBeUndefined();
  await save({ title: 'Next save', payload: 'rabc' }, 'en');
  expect(await list()).toHaveLength(1);
  expect(await restoreLanguage()).toBe('en');
});

it('orders save, forget and a pending language update without recreating settings', async () => {
  await forgetEverything();
  const saving = save({ title: 'A', payload: 'rabc' }, 'de');
  const forgetting = forgetEverything();
  const updating = persistLanguage('en');
  await Promise.all([saving, forgetting, updating]);
  expect(await list()).toEqual([]);
  expect(await restoreLanguage()).toBeUndefined();
});

it('waits for an earlier offline registration and removes a waiting worker when forgetting', async () => {
  await forgetEverything();
  let complete: (value: unknown) => void = () => {};
  const reg = {
    active: null,
    installing: null,
    waiting: { scriptURL: 'https://localhost/sw.js' },
    unregister: vi.fn().mockResolvedValue(true),
  };
  const register = vi.fn(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  const getRegistrations = vi.fn().mockResolvedValue([reg]);
  vi.stubGlobal('navigator', { serviceWorker: { register, getRegistrations } });
  vi.stubGlobal('location', { href: 'https://localhost/' });
  try {
    const enabling = enableOffline();
    const forgetting = forgetEverything();
    await vi.waitFor(() => expect(register).toHaveBeenCalledOnce());
    expect(getRegistrations).not.toHaveBeenCalled();
    complete(reg);
    await Promise.all([enabling, forgetting]);
    expect(reg.unregister).toHaveBeenCalledOnce();
  } finally {
    vi.unstubAllGlobals();
  }
});

it('normalizes damaged metadata while preserving usable payloads and raw stored values', async () => {
  await forgetEverything();
  const broken = { id: 'wrong-id', title: { text: 'bad type' }, payload: 'rabc', savedAt: 1e100 };
  await set('actual-key', broken, rawStore);
  const rows = await list();
  expect(rows).toEqual([{ key: 'actual-key', title: '', payload: 'rabc', savedAt: null }]);
  expect(await get('actual-key', rawStore)).toEqual(broken);
});

it('keeps malformed rows individually deletable without removing a valid map or settings', async () => {
  await forgetEverything();
  const good = await save({ title: 'Keep', payload: 'rabc' }, 'de');
  await set('damaged', { id: good, title: 'Broken', payload: 123, savedAt: NaN }, rawStore);
  await set(42, null, rawStore);
  const rows = await list();
  expect(rows).toHaveLength(3);
  expect(rows[0]?.key).toBe(good);
  expect(rows.find((r) => r.key === 'damaged')?.payload).toBeNull();
  await remove(rows.find((r) => r.key === 'damaged')!.key);
  await remove(rows.find((r) => r.key === 42)!.key);
  expect((await list()).map((r) => r.title)).toEqual(['Keep']);
  expect(await restoreLanguage()).toBe('de');
});

it('renames by the storage key rather than trusting a stored id', async () => {
  await forgetEverything();
  const good = await save({ title: 'Keep', payload: 'rabc' });
  await set('actual-key', { id: good, title: 'Rename me', payload: 'Eabc', savedAt: 0 }, rawStore);
  const row = (await list()).find((r) => r.title === 'Rename me')!;
  await rename(row.key, 'Renamed');
  expect((await get<{ title: string }>(good, rawStore))?.title).toBe('Keep');
  expect((await get<{ title: string }>('actual-key', rawStore))?.title).toBe('Renamed');
});

it('bounds unusable payloads and display titles without deleting the records', async () => {
  await forgetEverything();
  await set('oversized', { title: 'x'.repeat(1000), payload: 'r' + 'a'.repeat(2 * 1024 * 1024), savedAt: 'yesterday' }, rawStore);
  await set('malformed', { title: 'A', payload: '#/v1/z!!!', savedAt: Infinity }, rawStore);
  const rows = await list();
  expect(rows.every((r) => r.payload === null && r.savedAt === null)).toBe(true);
  expect(rows.find((r) => r.key === 'oversized')?.title.length).toBeLessThanOrEqual(400);
  expect(await get('oversized', rawStore)).toBeDefined();
});

it('rejects renaming an unusable value without overwriting it or the settings record', async () => {
  await forgetEverything();
  await saveLanguage('de');
  await set('broken', null, rawStore);
  await expect(rename('broken', 'New title')).rejects.toThrow();
  await expect(rename('settings', 'Wrong target')).rejects.toThrow();
  expect(await get('broken', rawStore)).toBeNull();
  expect(await restoreLanguage()).toBe('de');
});

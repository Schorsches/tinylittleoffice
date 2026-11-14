import 'fake-indexeddb/auto';
import { expect, it, vi } from 'vitest';
import { save, list, rename, remove, forgetEverything, saveLanguage, restoreLanguage, persistLanguage, enableOffline } from '../saved.ts';
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

import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import { save, list, rename, remove, forgetEverything, saveLanguage, restoreLanguage, persistLanguage } from '../saved.ts';
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

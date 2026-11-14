import { createStore, entries, set, get, del, clear, promisifyRequest } from 'idb-keyval';
export interface SavedMap {
  id: string;
  title: string;
  payload: string;
  savedAt: number;
}
type Language = 'de' | 'en';
// createStore is lazy: importing this module does not open IndexedDB.
const db = createStore('linkmap', 'saved');
let savedSettings = false;
let pending = Promise.resolve();
/** Keep this app instance's reads/writes in request order, recovering the queue after failures. */
function ordered<T>(action: () => Promise<T>): Promise<T> {
  const result = pending.then(action);
  pending = result.then(
    () => {},
    () => {},
  );
  return result;
}
export function list(): Promise<SavedMap[]> {
  return ordered(async () =>
    (await entries<string, SavedMap>(db))
      .filter(([k]) => k !== 'settings')
      .map(([, v]) => v)
      .sort((a, b) => b.savedAt - a.savedAt),
  );
}
export async function save(entry: Pick<SavedMap, 'title' | 'payload'>, language?: Language) {
  const id = crypto.randomUUID();
  const record: SavedMap = { title: entry.title, payload: entry.payload, id, savedAt: Date.now() };
  return ordered(async () => {
    // Both puts share one transaction. Abort explicitly if issuing a put throws synchronously.
    await db('readwrite', (store) => {
      const completed = promisifyRequest(store.transaction);
      try {
        store.put(record, id);
        if (language) store.put({ language }, 'settings');
      } catch (error) {
        store.transaction.abort();
        return completed
          .catch(() => {})
          .then(() => {
            throw error;
          });
      }
      return completed;
    });
    if (language) savedSettings = true;
    return id;
  });
}
export function rename(id: string, title: string) {
  return ordered(async () => {
    const e = await get<SavedMap>(id, db);
    if (e) await set(id, { ...e, title }, db);
  });
}
export const remove = (id: string) => ordered(() => del(id, db));
export function forgetEverything() {
  return ordered(async () => {
    await clear(db);
    savedSettings = false;
    if (typeof caches !== 'undefined') for (const k of await caches.keys()) if (k.startsWith('linkmap-')) await caches.delete(k);
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator)
      for (const r of await navigator.serviceWorker.getRegistrations())
        if ([r.active, r.waiting, r.installing].some((worker) => worker?.scriptURL === new URL('sw.js', location.href).href))
          await r.unregister();
  });
}
export function saveLanguage(language: Language) {
  return ordered(async () => {
    await set('settings', { language }, db);
    savedSettings = true;
  });
}
export function restoreLanguage(): Promise<Language | undefined> {
  return ordered(async () => {
    if (!('databases' in indexedDB) || !(await indexedDB.databases()).some((database) => database.name === 'linkmap')) return;
    const settings = await get<{ language?: unknown }>('settings', db);
    const language = settings?.language;
    savedSettings = language === 'de' || language === 'en';
    return savedSettings ? (language as Language) : undefined;
  });
}
export function persistLanguage(language: Language) {
  return ordered(async () => {
    if (savedSettings) await set('settings', { language }, db);
  });
}
export async function enableOffline() {
  return ordered(async () => {
    if ('serviceWorker' in navigator)
      return navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL });
  });
}

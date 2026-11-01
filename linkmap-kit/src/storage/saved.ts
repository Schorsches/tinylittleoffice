import { createStore, entries, set, get, del, clear } from 'idb-keyval';
export interface SavedMap {
  id: string;
  title: string;
  payload: string;
  savedAt: number;
}
// createStore is lazy: importing this module does not open IndexedDB.
const db = createStore('linkmap', 'saved');
let savedSettings = false;
export async function list(): Promise<SavedMap[]> {
  return (await entries<string, SavedMap>(db))
    .filter(([k]) => k !== 'settings')
    .map(([, v]) => v)
    .sort((a, b) => b.savedAt - a.savedAt);
}
export async function save(entry: Pick<SavedMap, 'title' | 'payload'>) {
  const id = crypto.randomUUID();
  await set(id, { ...entry, id, savedAt: Date.now() }, db);
  return id;
}
export async function rename(id: string, title: string) {
  const e = await get<SavedMap>(id, db);
  if (e) await set(id, { ...e, title }, db);
}
export const remove = (id: string) => del(id, db);
export async function forgetEverything() {
  await clear(db);
  savedSettings = false;
  if (typeof caches !== 'undefined') for (const k of await caches.keys()) if (k.startsWith('linkmap-')) await caches.delete(k);
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator)
    for (const r of await navigator.serviceWorker.getRegistrations())
      if (r.active?.scriptURL === new URL('sw.js', location.href).href) await r.unregister();
}
export async function saveLanguage(language: string) {
  await set('settings', { language }, db);
  savedSettings = true;
}
export async function restoreLanguage(): Promise<string | undefined> {
  if (!('databases' in indexedDB) || !(await indexedDB.databases()).some((database) => database.name === 'linkmap')) return;
  const settings = await get<{ language?: string }>('settings', db);
  savedSettings = !!settings;
  return settings?.language;
}
export async function persistLanguage(language: string) {
  if (savedSettings) await saveLanguage(language);
}
export async function enableOffline() {
  if ('serviceWorker' in navigator)
    return navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL });
}

/** Browser-only read helpers, serialized by Playwright; persistence stays within storage/. */
export async function readSavedRecords(): Promise<unknown[]> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open('linkmap');
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  return new Promise((resolve, reject) => {
    const r = db.transaction('saved').objectStore('saved').getAll();
    r.onsuccess = () => {
      resolve(r.result);
      db.close();
    };
    r.onerror = () => reject(r.error);
  });
}
export const databases = () => indexedDB.databases();

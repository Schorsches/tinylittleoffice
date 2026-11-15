/** Browser-only test helpers, serialized by Playwright; persistence stays within storage/. */
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

export async function injectDamagedSavedRecord() {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open('linkmap');
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('saved', 'readwrite');
    tx.objectStore('saved').put({ id: 'wrong-id', title: 'Damaged example', payload: null, savedAt: Infinity }, 'damaged-example');
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

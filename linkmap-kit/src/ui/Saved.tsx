import { documentHash } from '../format/index.ts';
import { useState } from 'react';
import { useT, getLanguage } from '../i18n/index.ts';
import { useStore } from '../state/store.ts';
import { flushLink } from '../state/link.ts';
import { Dialog } from './Dialog.tsx';
import { list, save, rename, remove, forgetEverything, saveLanguage, enableOffline, type SavedMap } from '../storage/saved.ts';
export function Saved({ close }: { close: () => void }) {
  const t = useT(),
    [maps, setMaps] = useState<SavedMap[] | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const run = (job: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    void job()
      .catch(() => setError(t('storageError')))
      .finally(() => setBusy(false));
  };
  return (
    <Dialog title={t('saved')} close={close}>
      <p>{t('saveNotice')}</p>
      <div className="actions">
        <button
          className="primary"
          disabled={busy}
          onClick={() =>
            run(async () => {
              const hash = await flushLink();
              if (!hash) throw Error('unavailable');
              const s = useStore.getState();
              await save({ title: s.locker ? t('protected') : s.doc.title, payload: s.payload });
              await saveLanguage(getLanguage());
              setMaps(await list());
              setError(t('savedOk'));
            })
          }
        >
          {t('save')}
        </button>
        <button disabled={busy} onClick={() => run(async () => setMaps(await list()))}>
          {t('saved')}
        </button>
      </div>
      <ul className="saved-list">
        {maps?.map((m) => (
          <li key={m.id}>
            <strong>{m.title || t('untitled')}</strong>
            <small>{new Intl.DateTimeFormat(getLanguage(), { dateStyle: 'medium', timeStyle: 'short' }).format(m.savedAt)}</small>
            <div className="actions">
              <button
                onClick={() => {
                  location.hash = documentHash(m.payload);
                  close();
                }}
              >
                {t('open')}
              </button>
              <button
                onClick={() => {
                  const title = prompt(t('rename'), m.title);
                  if (title !== null)
                    run(async () => {
                      await rename(m.id, title.slice(0, 400));
                      setMaps(await list());
                    });
                }}
              >
                {t('rename')}
              </button>
              <button
                className="danger"
                onClick={() =>
                  run(async () => {
                    await remove(m.id);
                    setMaps(await list());
                  })
                }
              >
                {t('delete')}
              </button>
            </div>
          </li>
        ))}
      </ul>
      <button
        onClick={() =>
          run(async () => {
            const reg = await enableOffline();
            if (reg?.waiting) {
              setError(t('update'));
              setWaiting(reg.waiting);
            }
            reg?.addEventListener('updatefound', () => {
              const worker = reg.installing;
              worker?.addEventListener('statechange', () => {
                if (worker.state === 'installed' && navigator.serviceWorker.controller) {
                  setError(t('update'));
                  setWaiting(worker);
                }
              });
            });
          })
        }
      >
        {t('offline')}
      </button>
      <p className="muted">{t('offlineNote')}</p>
      <button
        className="danger"
        disabled={busy}
        onClick={() => {
          if (confirm(t('forgetConfirm')))
            run(async () => {
              await forgetEverything();
              setMaps([]);
            });
        }}
      >
        {t('forget')}
      </button>
      {waiting && (
        <button
          onClick={() => {
            navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
            waiting.postMessage('activate');
          }}
        >
          {t('reload')}
        </button>
      )}
      <p role="status">{error}</p>
    </Dialog>
  );
}

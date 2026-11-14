import { documentHash } from '../format/index.ts';
import { useRef, useState } from 'react';
import { useT, getLanguage } from '../i18n/index.ts';
import { savedSnapshot } from '../state/saved-snapshot.ts';
import { Dialog } from './Dialog.tsx';
import { list, save, rename, remove, forgetEverything, enableOffline, type SavedMap } from '../storage/saved.ts';
export function Saved({ close }: { close: () => void }) {
  const t = useT(),
    [maps, setMaps] = useState<SavedMap[] | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const running = useRef(false);
  const run = (job: () => Promise<unknown>) => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError('');
    void job()
      .catch(() => setError(t('storageError')))
      .finally(() => {
        running.current = false;
        setBusy(false);
      });
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
              const snapshot = await savedSnapshot(t('protected'));
              await save(snapshot, getLanguage());
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
                disabled={busy}
                onClick={() => {
                  location.hash = documentHash(m.payload);
                  close();
                }}
              >
                {t('open')}
              </button>
              <button
                disabled={busy}
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
                disabled={busy}
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
        disabled={busy}
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
              setWaiting(null);
            });
        }}
      >
        {t('forget')}
      </button>
      {waiting && (
        <button
          disabled={busy}
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

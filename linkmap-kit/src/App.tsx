import { useEffect, useState, lazy, Suspense } from 'react';
import { emptyDoc, LIMITS, toHash } from './format/index.ts';
import { startLinkSync } from './state/link.ts';
import { lock, unprotect } from './state/password.ts';
import { useStore } from './state/store.ts';
import { getLanguage, setLanguage, useT } from './i18n/index.ts';
import { MapView } from './ui/MapView.tsx';
import { Toolbar } from './ui/Toolbar.tsx';
import { Features, TextField } from './ui/Features.tsx';
import { LinkMeter, fullLink } from './ui/LinkMeter.tsx';
const Share = lazy(() => import('./ui/Share.tsx').then((m) => ({ default: m.Share })));
const SimplifyPanel = lazy(() => import('./ui/Share.tsx').then((m) => ({ default: m.SimplifyPanel })));
import { Password } from './ui/Password.tsx';
import { Dialog } from './ui/Dialog.tsx';
const Files = lazy(() => import('./ui/Files.tsx').then((m) => ({ default: m.Files })));
const Saved = lazy(() => import('./ui/Saved.tsx').then((m) => ({ default: m.Saved })));
type Panel = 'share' | 'password' | 'files' | 'saved' | 'simplify' | null;
export function App() {
  const t = useT();
  const language = getLanguage();
  const status = useStore((s) => s.status),
    title = useStore((s) => s.doc.title),
    locker = useStore((s) => s.locker),
    payload = useStore((s) => s.payload),
    message = useStore((s) => s.message);
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const [panel, setPanel] = useState<Panel>(null),
    [sidebar, setSidebar] = useState(true);
  useEffect(() => startLinkSync(), []);
  useEffect(() => {
    const initial = getLanguage();
    setLanguage(initial);
    void import('./storage/saved.ts')
      .then((m) => m.restoreLanguage())
      .then((language) => {
        if ((language === 'en' || language === 'de') && getLanguage() === initial) setLanguage(language);
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    document.title = (status === 'ready' ? title || t('untitled') : 'Linkmap') + ' · Linkmap';
  }, [title, status, t, language]);
  const close = () => {
    setPanel(null);
    setDroppedFile(null);
  };
  const newMap = () => {
    if (status !== 'ready' || confirm(t('newConfirm'))) {
      history.replaceState(null, '', location.pathname);
      useStore.getState().replaceDoc(emptyDoc());
      setPanel(null);
    }
  };
  return (
    <div className="app">
      <a
        className="skip"
        href="#map"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('map')?.focus();
        }}
      >
        {t('skip')}
      </a>
      <header className="app-header">
        <div className="brand">
          <svg viewBox="0 0 36 36" width="36" height="36" aria-hidden="true">
            <rect width="36" height="36" rx="10" fill="#15604c" />
            <path d="M11 25V11l7 4 7-4v14l-7-4-7 4Z" fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round" />
            <path d="M18 15v6" stroke="white" strokeWidth="2" />
          </svg>
          <div>
            <strong>Linkmap</strong>
            <small>{t('tagline')}</small>
          </div>
        </div>
        <select
          className="language"
          aria-label={t('language')}
          value={getLanguage()}
          onChange={(e) => {
            const language = e.target.value === 'de' ? 'de' : 'en';
            setLanguage(language);
            void import('./storage/saved.ts').then((m) => m.persistLanguage(language)).catch(() => {});
          }}
        >
          <option value="en">English</option>
          <option value="de">Deutsch</option>
        </select>
        {status === 'ready' && (
          <button className="primary" onClick={() => setPanel('share')}>
            {t('share')} ↗
          </button>
        )}
      </header>
      {status === 'damaged' ? (
        <main className="gate">
          <h1>Linkmap</h1>
          <p role="alert">{t('damaged')}</p>
          <button onClick={newMap}>{t('newMap')}</button>
        </main>
      ) : status === 'needs-password' ? (
        <main className="gate">
          <h1>{t('unlock')}</h1>
          <Password opening done={close} />
        </main>
      ) : (
        <>
          <div className="document-bar">
            <button aria-label={t('sidebar')} aria-expanded={sidebar} onClick={() => setSidebar(!sidebar)}>
              ☰
            </button>
            <div className="title-field">
              <TextField
                value={title}
                limit={LIMITS.titleBytes}
                label={t('title')}
                commit={(value) => useStore.getState().setTitle(value)}
              />
            </div>
            {locker && <span className="badge">{t('protected')}</span>}
            <button onClick={newMap}>{t('newMap')}</button>
          </div>
          <Toolbar />
          <main
            className={`workspace ${sidebar ? '' : 'sidebar-hidden'}`}
            onDragOver={(e) => {
              if (e.dataTransfer.types.includes('Files')) e.preventDefault();
            }}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) {
                setDroppedFile(file);
                setPanel('files');
              }
            }}
          >
            <aside aria-label={t('features')}>
              <div className="sidebar-content">
                <Features />
              </div>
              <footer className="sidebar-footer">
                <div className="actions">
                  <button onClick={() => setPanel('files')}>{t('importExport')}</button>
                  <button onClick={() => setPanel('saved')}>{t('saved')}</button>
                  <button onClick={() => setPanel('simplify')}>{t('simplify')}</button>
                </div>
                <LinkMeter length={fullLink(toHash(payload)).length} />
                <details>
                  <summary>{t('privacy').split('.')[0]}</summary>
                  <p>{t('privacy')}</p>
                  <p>{t('privacyMore')}</p>
                </details>
              </footer>
            </aside>
            <MapView />
          </main>
          <div className="status" role="status">
            {message ? t(message === 'limit' ? 'limit' : 'linkError') : ''}
          </div>
          <Suspense fallback={<p role="status">{t('loading')}</p>}>
            {panel === 'share' && <Share close={close} password={() => setPanel('password')} />}
            {panel === 'password' && (
              <Dialog title={t(locker ? 'changePassword' : 'protect')} close={close}>
                <Password done={close} />
                {locker && (
                  <div className="actions">
                    <button
                      onClick={() => {
                        void unprotect().then(close);
                      }}
                    >
                      {t('removePassword')}
                    </button>
                    <button
                      onClick={() => {
                        void lock().then(close);
                      }}
                    >
                      {t('lock')}
                    </button>
                  </div>
                )}
              </Dialog>
            )}
            {panel === 'files' && <Files close={close} droppedFile={droppedFile} />}
            {panel === 'saved' && <Saved close={close} />}
            {panel === 'simplify' && <SimplifyPanel close={close} />}
          </Suspense>
        </>
      )}
    </div>
  );
}

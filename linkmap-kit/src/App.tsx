import { useEffect, useState, lazy, Suspense } from 'react';
import { emptyDoc, LIMITS, documentHash, defaultSettings } from './format/index.ts';
import { startLinkSync } from './state/link.ts';
import { lock, unprotect } from './state/password.ts';
import { useStore } from './state/store.ts';
import { getLanguage, setLanguage, useT } from './i18n/index.ts';
import { MapView } from './ui/MapView.tsx';
import { TextField } from './ui/Features.tsx';
import { Outline } from './ui/Outline.tsx';
const Inspector = lazy(() => import('./ui/Inspector.tsx').then((m) => ({ default: m.Inspector })));
const Appearance = lazy(() => import('./ui/Appearance.tsx').then((m) => ({ default: m.Appearance })));
const Visitor = lazy(() => import('./ui/Visitor.tsx').then((m) => ({ default: m.Visitor })));
import { Icon } from './ui/Icon.tsx';
import { LinkMeter, fullLink } from './ui/LinkMeter.tsx';
import { Password } from './ui/Password.tsx';
import { Dialog } from './ui/Dialog.tsx';
const Share = lazy(() => import('./ui/Share.tsx').then((m) => ({ default: m.Share })));
const SimplifyPanel = lazy(() => import('./ui/Share.tsx').then((m) => ({ default: m.SimplifyPanel })));
const Files = lazy(() => import('./ui/Files.tsx').then((m) => ({ default: m.Files })));
const Saved = lazy(() => import('./ui/Saved.tsx').then((m) => ({ default: m.Saved })));
type Panel = 'share' | 'password' | 'files' | 'saved' | 'simplify' | 'menu' | null;
export function App() {
  const t = useT();
  const language = getLanguage();
  const doc = useStore((s) => s.doc),
    status = useStore((s) => s.status),
    mode = useStore((s) => s.mode),
    selected = useStore((s) => s.selected),
    tab = useStore((s) => s.tab),
    locker = useStore((s) => s.locker),
    payload = useStore((s) => s.payload),
    message = useStore((s) => s.message);
  const settings = doc.settings ?? defaultSettings;
  const [panel, setPanel] = useState<Panel>(null),
    [mobileList, setMobileList] = useState(false),
    [droppedFile, setDroppedFile] = useState<File | null>(null);
  const close = () => {
    setPanel(null);
    setDroppedFile(null);
  };
  useEffect(() => startLinkSync(), []);
  useEffect(() => {
    const initial = getLanguage();
    setLanguage(initial);
    void import('./storage/saved.ts')
      .then((m) => m.restoreLanguage())
      .then((l) => {
        if ((l === 'de' || l === 'en') && getLanguage() === initial) setLanguage(l);
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    document.title = (status === 'ready' ? doc.title || t('untitled') : 'Linkmap') + ' · Linkmap';
  }, [doc.title, status, t, language]);
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--user-accent', settings.accent);
    const rgb = [1, 3, 5]
      .map((i) => parseInt(settings.accent.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    const luminance = (rgb[0] ?? 0) * 0.2126 + (rgb[1] ?? 0) * 0.7152 + (rgb[2] ?? 0) * 0.0722;
    const light = 1.05 / (luminance + 0.05) >= 4.5;
    root.style.setProperty('--on-user-accent', light ? '#ffffff' : '#000000');
    root.style.setProperty('--accent-icon-filter', light ? 'invert(1)' : 'none');
  }, [settings.accent]);
  const newMap = () => {
    if (status !== 'ready' || confirm(t('newConfirm'))) {
      history.replaceState(null, '', location.pathname);
      useStore.getState().replaceDoc(emptyDoc());
      useStore.setState({ mode: 'edit', tab: 'content' });
      close();
    }
  };
  return (
    <div className={`app mode-${mode}`}>
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
        <button className="brand" onClick={() => setPanel('menu')} aria-label={t('fileMenu')}>
          <img src={`${import.meta.env.BASE_URL}icon.svg`} width="44" height="44" alt="" />
          <strong>Linkmap</strong>
        </button>
        <div className="document-title">
          {mode === 'edit' ? (
            <>
              <span className="atelier-label">Kartenatelier</span>
              <TextField
                value={doc.title}
                limit={LIMITS.titleBytes}
                label={t('title')}
                commit={(title) => useStore.getState().setTitle(title)}
              />
            </>
          ) : (
            <strong>{doc.title || t('untitled')}</strong>
          )}
        </div>
        {status === 'ready' && (
          <div className="header-actions">
            {locker && (
              <span className="lock-indicator" title={t('protected')}>
                <Icon name="lock-simple" />
              </span>
            )}
            <button
              className="preview-action"
              aria-label={t(mode === 'edit' ? 'preview' : 'editMap')}
              onClick={() => {
                useStore.setState({ mode: mode === 'edit' ? 'view' : 'edit', tool: 'select', selected: null });
                setMobileList(false);
              }}
            >
              <Icon name={mode === 'edit' ? 'eye' : 'cursor'} />
              <span>{t(mode === 'edit' ? 'preview' : 'editMap')}</span>
            </button>
            <button className="primary share-action" onClick={() => setPanel('share')}>
              <Icon name="share-network" />
              {t('share')}
            </button>
          </div>
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
          <div className="mobile-view-switch">
            <button
              aria-pressed={!mobileList}
              onClick={() => {
                setMobileList(false);
                useStore.setState({ selected: null });
              }}
            >
              <Icon name="map-trifold" />
              {t('mapView')}
            </button>
            <button
              aria-pressed={mobileList}
              onClick={() => {
                setMobileList(true);
                useStore.setState({ selected: null });
              }}
            >
              <Icon name="list" />
              {t('listView')} <span>{doc.features.length}</span>
            </button>
          </div>
          <main
            className={`workspace atelier ${mode === 'edit' && selected !== null ? 'has-inspector' : ''} ${mobileList ? 'mobile-list' : ''} ${selected !== null && mode === 'edit' ? 'mobile-details' : ''}`}
            onDragOver={(e) => {
              if (mode === 'edit' && e.dataTransfer.types.includes('Files')) e.preventDefault();
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (mode !== 'edit') return;
              const file = e.dataTransfer.files[0];
              if (file) {
                setDroppedFile(file);
                setPanel('files');
              }
            }}
          >
            <aside className="outline" aria-label={t(mode === 'edit' ? 'content' : 'places')}>
              {mode === 'view' ? (
                <Suspense fallback={<p>{t('loading')}</p>}>
                  <Visitor />
                </Suspense>
              ) : tab === 'appearance' ? (
                <Suspense fallback={<p>{t('loading')}</p>}>
                  <Appearance />
                </Suspense>
              ) : (
                <Outline
                  files={() => setPanel('files')}
                  appearance={() => useStore.setState({ tab: 'appearance' })}
                  drawing={() => setMobileList(false)}
                />
              )}
            </aside>
            <MapView />
            {mode === 'edit' && selected !== null && doc.features[selected] && (
              <Suspense fallback={<p>{t('loading')}</p>}>
                <Inspector
                  key={selected}
                  index={selected}
                  feature={doc.features[selected]}
                  onClose={() => {
                    useStore.setState({ selected: null });
                    setMobileList(true);
                  }}
                />
              </Suspense>
            )}
          </main>
          <div className="app-status" role="status">
            {message ? t(message === 'limit' ? 'limit' : 'linkError') : ''}
          </div>
          <Suspense fallback={<p role="status">{t('loading')}</p>}>
            {panel === 'share' && <Share close={close} password={() => setPanel('password')} />}
            {panel === 'files' && <Files close={close} droppedFile={droppedFile} />} {panel === 'saved' && <Saved close={close} />}{' '}
            {panel === 'simplify' && <SimplifyPanel close={close} />}
            {panel === 'menu' && (
              <Dialog title="Linkmap" close={close}>
                <div className="file-actions">
                  <button onClick={newMap}>
                    <Icon name="plus" />
                    {t('newMap')}
                  </button>
                  <button onClick={() => setPanel('files')}>
                    <Icon name="upload-simple" />
                    {t('importExport')}
                  </button>
                  <button onClick={() => setPanel('saved')}>
                    <Icon name="floppy-disk" />
                    {t('saved')}
                  </button>
                  <button onClick={() => setPanel('simplify')}>
                    <Icon name="path" />
                    {t('simplify')}
                  </button>
                </div>
                <label>
                  {t('language')}
                  <select
                    aria-label={t('language')}
                    value={language}
                    onChange={(e) => {
                      const l = e.target.value === 'de' ? 'de' : 'en';
                      setLanguage(l);
                      void import('./storage/saved.ts').then((m) => m.persistLanguage(l)).catch(() => {});
                    }}
                  >
                    <option value="en">English</option>
                    <option value="de">Deutsch</option>
                  </select>
                </label>
                <LinkMeter length={fullLink(documentHash(payload)).length} />
                <p className="muted">{t('privacy')}</p>
              </Dialog>
            )}
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
          </Suspense>
        </>
      )}
    </div>
  );
}

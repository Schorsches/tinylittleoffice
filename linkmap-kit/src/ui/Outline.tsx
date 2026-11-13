import { useEffect, useRef } from 'react';
import { useStore } from '../state/store.ts';
import { useT } from '../i18n/index.ts';
import { Icon, type IconName } from './Icon.tsx';
import { emptyDoc, defaultSettings, type AtlasDoc, type AtlasFeature } from '../format/index.ts';
const groups = [
  ['point', 'places', 'map-pin'],
  ['line', 'paths', 'path'],
  ['polygon', 'areas', 'polygon'],
] as const;
export function FeatureMark({ feature: f }: { feature: AtlasFeature }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.style.backgroundColor = f.customColor ?? '';
  }, [f.customColor]);
  return (
    <span ref={ref} className={`feature-mark color-${f.color}`}>
      <Icon name={f.kind === 'point' ? 'map-pin' : f.kind === 'line' ? 'path' : 'polygon'} />
    </span>
  );
}
export function Outline({ files, appearance, drawing }: { files: () => void; appearance: () => void; drawing?: () => void }) {
  const t = useT();
  const doc = useStore((s) => s.doc),
    selected = useStore((s) => s.selected);
  return (
    <>
      <div className="outline-main">
        <div className="outline-tabs">
          <button className="active" onClick={() => useStore.setState({ tab: 'content' })}>
            {t('content')}
          </button>
          <button onClick={appearance}>{t('appearance')}</button>
        </div>
        <details className="add-menu">
          <summary>
            <Icon name="plus" />
            {t('addObject')}
            <Icon name="caret-down" />
          </summary>
          <div>
            {groups.map(([kind, , icon]) => (
              <button
                key={kind}
                onClick={(e) => {
                  useStore.setState({ tool: kind, selected: null });
                  drawing?.();
                  e.currentTarget.closest('details')?.removeAttribute('open');
                }}
              >
                <Icon name={icon} />
                {t(kind)}
              </button>
            ))}
          </div>
        </details>
        {!doc.features.length && (
          <div className="outline-empty">
            <h2>{t('startTitle')}</h2>
            <p>{t('startHint')}</p>
            <button className="text-button" onClick={() => useStore.getState().replaceDoc(exampleDocument())}>
              {t('example')}
            </button>
            <div className="template-choices">
              {(['location', 'event', 'locator'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    const s = useStore.getState();
                    s.commit({ ...s.doc, settings: { ...(s.doc.settings ?? defaultSettings), preset: p } });
                    useStore.setState({ tool: 'point' });
                  }}
                >
                  {t(p === 'location' ? 'locationTemplate' : p === 'event' ? 'eventTemplate' : 'locatorTemplate')}
                </button>
              ))}
            </div>
          </div>
        )}
        {groups.map(([kind, key]) => {
          const items = doc.features.map((f, i) => ({ f, i })).filter((x) => x.f.kind === kind);
          return (
            items.length > 0 && (
              <section className="outline-group" key={kind}>
                <h2>
                  {t(key)} <span>({items.length})</span>
                </h2>
                <ul>
                  {items.map(({ f, i }) => (
                    <li key={i}>
                      <button
                        className={selected === i ? 'selected' : ''}
                        aria-pressed={selected === i}
                        onClick={() => useStore.setState({ selected: i, tool: 'select' })}
                      >
                        <FeatureMark feature={f} />
                        <span>{f.name || t(f.kind)}</span>
                        <Icon name="dots-three-vertical" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )
          );
        })}
      </div>
      <footer className="outline-footer">
        <button className="import-action" onClick={files}>
          <Icon name="download-simple" />
          {t('import')}
        </button>
        <p>
          <Icon name="lock-simple" />
          {t('localProcessing')}
        </p>
        <details>
          <summary>{t('privacyDetails')}</summary>
          <p>{t('privacy')}</p>
          <p>{t('privacyMore')}</p>
        </details>
      </footer>
    </>
  );
}
export function exampleDocument(): AtlasDoc {
  return {
    ...emptyDoc(),
    title: 'Kultur am Rhein',
    view: { lng: 8.3717, lat: 49.2174, zoom: 14.7, bearing: 0, pitch: 0 },
    settings: { ...defaultSettings, preset: 'event' },
    features: [
      {
        kind: 'point',
        coords: [[8.3712, 49.2176]],
        name: 'Treffpunkt am Rhein',
        note: 'Beispieldaten: Eingang und Infopunkt. Samstag 14–22 Uhr. Keine tatsächliche Veranstaltungsplanung.',
        color: 0,
        info: {
          category: 'Information',
          address: 'Beispielstraße 1 · Germersheim',
          services: ['Stufenloser Zugang', 'Information'],
          hours: '',
        },
      },
      {
        kind: 'point',
        coords: [[8.3734, 49.2182]],
        name: 'Bühne',
        note: 'Fiktives Programm.',
        color: 4,
        info: { category: 'Musik', address: '', services: [], hours: '' },
      },
      {
        kind: 'point',
        coords: [[8.3692, 49.2168]],
        name: 'Essen & Getränke',
        note: 'Fiktives Angebot.',
        color: 2,
        info: { category: 'Essen & Getränke', address: '', services: ['Vegan'], hours: '' },
      },
      {
        kind: 'line',
        coords: [
          [8.3702, 49.2169],
          [8.3712, 49.2176],
          [8.3734, 49.2182],
        ],
        name: 'Fußweg',
        note: 'Illustrativer Verlauf.',
        color: 0,
      },
      {
        kind: 'polygon',
        coords: [
          [8.3702, 49.2171],
          [8.3739, 49.2171],
          [8.3739, 49.219],
          [8.3702, 49.219],
        ],
        name: 'Veranstaltungsbereich',
        note: 'Illustrative Fläche.',
        color: 3,
      },
    ],
  };
}
export const featureIcon = (f: AtlasFeature): IconName => (f.kind === 'point' ? 'map-pin' : f.kind === 'line' ? 'path' : 'polygon');

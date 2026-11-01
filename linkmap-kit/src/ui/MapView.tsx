import { useEffect, useRef, useState } from 'react';
import { useT } from '../i18n/index.ts';
import { Toolbar } from './Toolbar.tsx';
import { Icon } from './Icon.tsx';
import { useStore } from '../state/store.ts';
export function MapView() {
  const ref = useRef<HTMLDivElement>(null);
  const controller = useRef<{ dispose(): void; locate(): void; finish(): void } | null>(null);
  const [status, setStatus] = useState('loading');
  const t = useT();
  const tool = useStore((s) => s.tool);
  const mode = useStore((s) => s.mode);
  const settings = useStore((s) => s.doc.settings);
  useEffect(() => {
    let cancelled = false;
    const el = ref.current;
    if (!el) return;
    if (!navigator.onLine) {
      queueMicrotask(() => setStatus('mapError'));
      return;
    }
    void import('../map/controller.ts')
      .then((m) =>
        cancelled
          ? undefined
          : m.mountMap(
              el,
              () => setStatus('mapError'),
              () => setStatus(''),
            ),
      )
      .then((c) => {
        if (!c) return;
        if (cancelled) c.dispose();
        else controller.current = c;
      })
      .catch((error) => {
        setStatus(error instanceof Error && error.name === 'GPUInitializationError' ? 'webglError' : 'mapError');
      });
    return () => {
      cancelled = true;
      controller.current?.dispose();
      controller.current = null;
    };
  }, []);
  const addAtCentre = () => {
    const s = useStore.getState(),
      v = s.camera;
    if (s.tool === 'select') return;
    const c: readonly [number, number] = [v.lng, v.lat];
    s.addFeature({
      kind: s.tool,
      coords:
        s.tool === 'point' ? [c] : s.tool === 'line' ? [c, [v.lng + 0.0005, v.lat]] : [c, [v.lng + 0.0005, v.lat], [v.lng, v.lat + 0.0005]],
      name: '',
      note: '',
      color: s.lastColor,
    });
  };
  return (
    <section className={`map-area ${mode === 'view' && settings?.interactive === false ? 'non-interactive' : ''}`} aria-label={t('map')}>
      <div id="map" ref={ref} className="map" tabIndex={0} role="group" aria-label={t('map')} />
      {mode === 'edit' && <Toolbar />}
      {status && (
        <div className="map-hint" role="status">
          {t(status === 'loading' ? 'loading' : status === 'webglError' ? 'webglError' : 'mapError')}
        </div>
      )}
      {mode === 'edit' && tool !== 'select' && (
        <div className="drawing-bar">
          <p>{t('drawingHelp')}</p>
          <div className="actions">
            <button className="primary" onClick={() => controller.current?.finish()} disabled={tool === 'point'}>
              {t('done')}
            </button>
            <button onClick={() => useStore.setState({ tool: 'select' })}>{t('cancel')}</button>
            <button onClick={addAtCentre}>{t('keyboardAdd')}</button>
          </div>
        </div>
      )}
      {(settings?.showLocation !== false || mode === 'edit') && (
        <button className="locate" onClick={() => controller.current?.locate()}>
          <Icon name="crosshair-simple" />
          {t('locate')}
        </button>
      )}
    </section>
  );
}

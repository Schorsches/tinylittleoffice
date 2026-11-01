import { useEffect, useRef, useState } from 'react';
import { useT } from '../i18n/index.ts';
import { useStore } from '../state/store.ts';
export function MapView() {
  const ref = useRef<HTMLDivElement>(null);
  const controller = useRef<{ dispose(): void; locate(): void } | null>(null);
  const [status, setStatus] = useState('loading');
  const t = useT();
  const tool = useStore((s) => s.tool);
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
      .catch(() => setStatus('mapError'));
    return () => {
      cancelled = true;
      controller.current?.dispose();
      controller.current = null;
    };
  }, []);
  return (
    <section className="map-area" aria-label={t('map')}>
      <div id="map" ref={ref} className="map" tabIndex={0} aria-label={t('map')} />
      <div className="map-hint" role="status">
        {status ? t(status === 'loading' ? 'loading' : 'mapError') : t(tool === 'select' ? 'selectHint' : 'drawHint')}
      </div>
      <button className="locate" onClick={() => controller.current?.locate()}>
        {t('locate')}
      </button>
    </section>
  );
}

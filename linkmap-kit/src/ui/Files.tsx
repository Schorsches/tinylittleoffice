import { useEffect, useState, type DragEvent } from 'react';
import { fromGeoJson, toGeoJson, FILE_LIMIT, type ImportResult } from '../io/geojson.ts';
import { fromGpx, toGpx, toKml } from '../io/xml.ts';
import { useStore } from '../state/store.ts';
import { useT } from '../i18n/index.ts';
import { Dialog } from './Dialog.tsx';
function download(title: string, extension: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: extension === 'geojson' ? 'application/geo+json' : 'application/xml' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = (title.replace(/[^\p{L}\p{N}_-]/gu, '_').slice(0, 80) || 'linkmap') + '.' + extension;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function parseFile(f: File) {
  if (f.size > FILE_LIMIT) throw Error('size');
  const text = await f.text();
  return f.name.toLowerCase().endsWith('.gpx') ? fromGpx(text) : fromGeoJson(text);
}
export function Files({ close, droppedFile = null }: { close: () => void; droppedFile?: File | null }) {
  const t = useT(),
    doc = useStore((s) => s.doc);
  const [result, setResult] = useState<ImportResult | null>(null),
    [error, setError] = useState(false);
  const read = async (f: File) => {
    setError(false);
    try {
      setResult(await parseFile(f));
    } catch {
      setError(true);
    }
  };
  useEffect(() => {
    if (!droppedFile) return;
    let active = true;
    void parseFile(droppedFile)
      .then((r) => {
        if (active) setResult(r);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [droppedFile]);
  const drop = (e: DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) void read(f);
  };
  return (
    <Dialog title={t('importExport')} close={close}>
      <div className="drop" onDragOver={(e) => e.preventDefault()} onDrop={drop}>
        <p>{t('drop')}</p>
        <input
          type="file"
          accept=".geojson,.json,.gpx"
          aria-label={t('import')}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void read(f);
          }}
        />
      </div>
      {error && <p role="alert">{t('fileError')}</p>}
      {result && (
        <section>
          <p>
            {t('importSummary')}: {result.doc.features.length}. {t('skipped')}: {result.skipped.length}
            {result.skipped.length ? ` (${[...new Set(result.skipped)].join(', ')})` : ''}
          </p>
          <div className="actions">
            <button
              onClick={() => {
                useStore.getState().replaceDoc(result.doc, useStore.getState().locker);
                close();
              }}
            >
              {t('replace')}
            </button>
            <button
              onClick={() => {
                const s = useStore.getState();
                if (s.commit({ ...s.doc, features: [...s.doc.features, ...result.doc.features] })) close();
                else setError(true);
              }}
            >
              {t('add')}
            </button>
          </div>
        </section>
      )}
      <h3>{t('export')}</h3>
      <div className="actions">
        <button onClick={() => download(doc.title, 'geojson', toGeoJson(doc))}>GeoJSON</button>
        <button onClick={() => download(doc.title, 'gpx', toGpx(doc))}>GPX</button>
        <button onClick={() => download(doc.title, 'kml', toKml(doc))}>KML</button>
      </div>
      <p className="muted">{t('gpxNotice')}</p>
    </Dialog>
  );
}

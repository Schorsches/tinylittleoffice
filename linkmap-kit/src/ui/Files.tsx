import { fromCsv, csvTemplate } from '../io/csv.ts';
import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import { toGeoJson, FILE_LIMIT, type ImportResult } from '../io/geojson.ts';
import { fromJson } from '../io/profile.ts';
import { importTemplate, transformationPrompt } from '../io/import-guide.ts';
import { fromGpx, toGpx, toKml } from '../io/xml.ts';
import { useStore } from '../state/store.ts';
import { getLanguage, useT } from '../i18n/index.ts';
import { Dialog } from './Dialog.tsx';
function download(title: string, extension: string, text: string) {
  const url = URL.createObjectURL(
    new Blob([text], {
      type:
        extension === 'geojson'
          ? 'application/geo+json'
          : extension === 'csv'
            ? 'text/csv;charset=utf-8'
            : extension === 'txt'
              ? 'text/plain;charset=utf-8'
              : 'application/xml',
    }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = (title.replace(/[^\p{L}\p{N}_-]/gu, '_').slice(0, 80) || 'linkmap') + '.' + extension;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function parseFile(f: File) {
  if (f.size > FILE_LIMIT) throw Error('size');
  const text = await f.text();
  return f.name.toLowerCase().endsWith('.gpx') ? fromGpx(text) : f.name.toLowerCase().endsWith('.csv') ? fromCsv(text) : fromJson(text);
}
export function Files({ close, droppedFile = null }: { close: () => void; droppedFile?: File | null }) {
  const t = useT(),
    doc = useStore((s) => s.doc);
  const [result, setResult] = useState<ImportResult | null>(null),
    [error, setError] = useState(false),
    [source, setSource] = useState(''),
    [busy, setBusy] = useState(false);
  const generation = useRef(0);
  const load = useCallback(async (parse: () => Promise<ImportResult>) => {
    const token = ++generation.current;
    setError(false);
    setResult(null);
    setBusy(true);
    try {
      const next = await parse();
      if (token === generation.current) setResult(next);
    } catch {
      if (token === generation.current) setError(true);
    } finally {
      if (token === generation.current) setBusy(false);
    }
  }, []);
  const invalidate = useCallback(() => {
    generation.current++;
  }, []);
  const read = (f: File) => load(() => parseFile(f));
  useEffect(() => {
    let active = true;
    // The dropped file comes from the outer workspace; start its asynchronous read after mounting the dialog.
    void Promise.resolve().then(() => {
      if (active && droppedFile) void load(() => parseFile(droppedFile));
    });
    return () => {
      active = false;
      invalidate();
    };
  }, [droppedFile, load, invalidate]);
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
          accept=".geojson,.json,.gpx,.csv"
          aria-label={t('import')}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void read(f);
          }}
        />
      </div>
      <details className="import-help">
        <summary>{t('prepareImport')}</summary>
        <p>{t('profileHint')}</p>
        <div className="actions">
          <button onClick={() => download('linkmap-template', 'csv', csvTemplate)}>{t('downloadTemplate')}</button>
          <button onClick={() => download('linkmap-import-template', 'geojson', importTemplate)}>{t('downloadJsonTemplate')}</button>
          <button onClick={() => download('linkmap-transformation-prompt', 'txt', transformationPrompt(getLanguage()))}>
            {t('downloadPrompt')}
          </button>
        </div>
        <p className="muted">{t('promptPrivacy')}</p>
      </details>
      <details className="import-paste">
        <summary>{t('pasteJson')}</summary>
        <label>
          {t('pasteJson')}
          <textarea
            rows={6}
            value={source}
            spellCheck={false}
            onChange={(e) => {
              generation.current++;
              setResult(null);
              setError(false);
              setBusy(false);
              setSource(e.target.value);
            }}
          />
        </label>
        <button
          disabled={!source.trim() || busy}
          onClick={() => {
            void load(() => Promise.resolve(fromJson(source)));
          }}
        >
          {t('checkData')}
        </button>
      </details>
      {busy && <p role="status">{t('loading')}</p>}
      {error && <p role="alert">{t('fileError')}</p>}
      {result && (
        <section className="import-preview" aria-label={t('importPreview')}>
          <h3>{t('importPreview')}</h3>
          <p role="status">
            {t('importSummary')}: {result.doc.features.length}. {t('skipped')}: {result.skipped.length}
          </p>
          {!!result.skipped.length && (
            <details>
              <summary>{t('importIssues')}</summary>
              <ul>
                {[...new Set(result.skipped)].slice(0, 20).map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
              <p className="muted">{t('issueLimit')}</p>
            </details>
          )}
          <ul>
            {result.doc.features.slice(0, 5).map((feature, i) => (
              <li key={i}>
                {feature.name || t(feature.kind)}
                {feature.info?.address ? ` · ${feature.info.address}` : ''}
              </li>
            ))}
          </ul>
          <p className="muted">{t('previewHint')}</p>
          <div className="actions">
            <button
              disabled={!result.doc.features.length}
              onClick={() => {
                if (useStore.getState().commit(result.doc)) close();
                else setError(true);
              }}
            >
              {t('replace')}
            </button>
            <button
              disabled={!result.doc.features.length}
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

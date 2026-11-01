import { useEffect, useRef, useState } from 'react';
import { LIMITS, PALETTE, type ColorIndex, type Feature } from '../format/index.ts';
import { useStore } from '../state/store.ts';
import { useT, type Key } from '../i18n/index.ts';
import { bytes } from '../io/geojson.ts';
const colors: Key[] = ['blue', 'red', 'green', 'orange', 'purple', 'cyan', 'pink', 'slate'];
/** Commit text after a pause and on blur, so one typing burst is one undo step. */
export function TextField({
  value,
  limit,
  label,
  multiline = false,
  commit,
}: {
  value: string;
  limit: number;
  label: string;
  multiline?: boolean;
  commit: (v: string) => void;
}) {
  const [draft, setDraft] = useState({ value, base: value }),
    [blocked, setBlocked] = useState(false);
  const pending = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const t = useT();
  useEffect(() => {
    pending.current = null;
    clearTimeout(timer.current);
  }, [value]);
  const displayed = draft.base === value ? draft.value : value;
  const flush = () => {
    clearTimeout(timer.current);
    if (pending.current !== null) {
      const v = pending.current;
      pending.current = null;
      commit(v);
    }
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  const props = {
    value: displayed,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const v = e.target.value;
      if (bytes(v) > limit) {
        setBlocked(true);
        return;
      }
      setBlocked(false);
      pending.current = v;
      setDraft({ value: v, base: value });
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        pending.current = null;
        commit(v);
      }, 500);
    },
    onBlur: flush,
  };
  return (
    <label>
      {label}
      {multiline ? <textarea {...props} rows={4} /> : <input {...props} />}
      {(bytes(displayed) > limit * 0.8 || blocked) && (
        <small role="status">
          {bytes(displayed)} / {limit} {t('bytes')}
          {blocked ? ` · ${t('limit')}` : ''}
        </small>
      )}
    </label>
  );
}
export function FeatureDetails({ index, feature: f }: { index: number; feature: Feature }) {
  const t = useT();
  const [coords, setCoords] = useState<string | null>(null),
    [bad, setBad] = useState(false);
  return (
    <div className="details">
      <TextField
        value={f.name}
        limit={LIMITS.nameBytes}
        label={t('name')}
        commit={(name) => useStore.getState().updateFeature(index, { name })}
      />
      <TextField
        value={f.note}
        limit={LIMITS.noteBytes}
        label={t('note')}
        multiline
        commit={(note) => useStore.getState().updateFeature(index, { note })}
      />
      <fieldset>
        <legend>{t('color')}</legend>
        <div className="swatches">
          {PALETTE.map((_, i) => (
            <label className={`swatch color-${i}`} key={i}>
              <input
                type="radio"
                name="color"
                checked={f.color === i}
                aria-label={t(colors[i] ?? 'blue')}
                onChange={() => useStore.getState().updateFeature(index, { color: i as ColorIndex })}
              />
              <span aria-hidden="true">{f.color === i ? '✓' : ''}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <details>
        <summary>{t('editCoordinates')}</summary>
        <label>
          {t('coordinates')}
          <textarea rows={4} value={coords ?? f.coords.map((p) => p.join(', ')).join('\n')} onChange={(e) => setCoords(e.target.value)} />
        </label>
        <button
          onClick={() => {
            const c = (coords ?? f.coords.map((p) => p.join(',')).join('\n')).split('\n').map((s) => s.split(',').map(Number));
            if (c.some((p) => p.length !== 2 || !p.every(Number.isFinite) || Math.abs(p[0] ?? 181) > 180 || Math.abs(p[1] ?? 91) > 90)) {
              setBad(true);
              return;
            }
            const ok = useStore.getState().updateFeature(index, { coords: c.map((p) => [p[0] ?? 0, p[1] ?? 0]) });
            setBad(!ok);
            if (ok) setCoords(null);
          }}
        >
          {t('apply')}
        </button>
        {bad && <p role="alert">{t('invalidCoordinates')}</p>}
      </details>
      <button className="danger" onClick={() => useStore.getState().removeFeature(index)}>
        {t('delete')}
      </button>
    </div>
  );
}
export function Features() {
  const t = useT();
  const features = useStore((s) => s.doc.features),
    selected = useStore((s) => s.selected),
    tool = useStore((s) => s.tool);
  const addAtCentre = () => {
    const s = useStore.getState(),
      v = s.doc.view,
      c: [number, number] = [v.lng, v.lat];
    if (tool === 'select') return;
    const delta = 0.01;
    const coords =
      tool === 'point'
        ? [c]
        : tool === 'line'
          ? [c, [v.lng + delta, v.lat] as const]
          : [c, [v.lng + delta, v.lat] as const, [v.lng, v.lat + delta] as const];
    s.addFeature({ kind: tool, coords, name: '', note: '', color: s.lastColor });
  };
  return (
    <>
      <div className="section-heading">
        <h2>{t('features')}</h2>
        <span>{features.length}</span>
      </div>
      {!features.length && (
        <div className="empty">
          <span aria-hidden="true">◎</span>
          <h3>{t('empty')}</h3>
          <p>{t('emptyHint')}</p>
        </div>
      )}
      {tool !== 'select' && <button onClick={addAtCentre}>{t('keyboardAdd')}</button>}
      <ul className="feature-list">
        {features.map((f, i) => (
          <li key={i}>
            <button
              tabIndex={selected === i || (selected === null && i === 0) ? 0 : -1}
              aria-pressed={selected === i}
              onClick={() => useStore.setState({ selected: i, tool: 'select' })}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  const n = (i + (e.key === 'ArrowDown' ? 1 : -1) + features.length) % features.length;
                  useStore.setState({ selected: n });
                  const ul = e.currentTarget.closest('ul');
                  ul?.querySelectorAll('button')[n]?.focus();
                }
              }}
            >
              <span className={`feature-dot color-${f.color}`} aria-hidden="true">
                {f.kind === 'point' ? '●' : f.kind === 'line' ? '╱' : '△'}
              </span>
              <span>{f.name || t(f.kind)}</span>
            </button>
          </li>
        ))}
      </ul>
      {selected !== null && features[selected] && <FeatureDetails key={selected} index={selected} feature={features[selected]} />}
    </>
  );
}

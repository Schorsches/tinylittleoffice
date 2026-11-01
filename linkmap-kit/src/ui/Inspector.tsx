import { useState } from 'react';
import { LIMITS, PALETTE, type ColorIndex, type AtlasFeature } from '../format/index.ts';
import { useStore } from '../state/store.ts';
import { placeInfo } from '../state/filter.ts';
import { useT, type Key } from '../i18n/index.ts';
import { TextField } from './Features.tsx';
import { Icon } from './Icon.tsx';
const colors: Key[] = ['blue', 'red', 'green', 'orange', 'purple', 'cyan', 'pink', 'slate'];
export function Inspector({ index, feature: f, onClose }: { index: number; feature: AtlasFeature; onClose?: () => void }) {
  const t = useT();
  const [service, setService] = useState('');
  const info = placeInfo(f);
  const update = (p: Partial<AtlasFeature>) => useStore.getState().updateFeature(index, p);
  const editInfo = (p: Partial<typeof info>) => update({ info: { ...info, ...p } });
  return (
    <section className="inspector" aria-label={t('editPlace')}>
      <header className="inspector-header">
        <h2>{t(f.kind === 'point' ? 'editPlace' : 'editShape')}</h2>
        <button
          className="icon-button"
          aria-label={t('close')}
          onClick={() => (onClose ? onClose() : useStore.setState({ selected: null }))}
        >
          <Icon name="x" />
        </button>
      </header>
      <div className="inspector-body">
        <TextField value={f.name} limit={LIMITS.nameBytes} label={t('name')} commit={(name) => update({ name })} />
        <label>
          {t('category')}
          <input list="categories" value={info.category} maxLength={80} onChange={(e) => editInfo({ category: e.target.value })} />
          <datalist id="categories">
            <option value="Information" />
            <option value="Musik" />
            <option value="Essen & Getränke" />
            <option value="Parken" />
          </datalist>
        </label>
        <TextField value={info.address} limit={1500} label={t('address')} commit={(address) => editInfo({ address })} />
        <TextField value={f.note} limit={LIMITS.noteBytes} label={t('description')} multiline commit={(note) => update({ note })} />
        <fieldset className="services-field">
          <legend>{t('services')}</legend>
          <div className="service-tags">
            {info.services.map((s) => (
              <span className="service-tag" key={s}>
                <Icon name={/zugang|barriere/i.test(s) ? 'wheelchair' : 'info'} />
                {s}
                <button aria-label={`${t('delete')} ${s}`} onClick={() => editInfo({ services: info.services.filter((x) => x !== s) })}>
                  <Icon name="x" />
                </button>
              </span>
            ))}
          </div>
          <form
            className="service-add"
            onSubmit={(e) => {
              e.preventDefault();
              if (service.trim() && !info.services.includes(service.trim()) && info.services.length < 30) {
                editInfo({ services: [...info.services, service.trim()] });
                setService('');
              }
            }}
          >
            <input
              aria-label={t('newService')}
              placeholder={t('servicePlaceholder')}
              value={service}
              maxLength={80}
              onChange={(e) => setService(e.target.value)}
            />
            <button aria-label={t('addService')}>
              <Icon name="plus" />
            </button>
          </form>
        </fieldset>
        <details className="inspector-disclosure">
          <summary>
            {t('hours')} <small>({t('optional')})</small>
          </summary>
          <TextField value={info.hours} limit={1500} label={t('hours')} multiline commit={(hours) => editInfo({ hours })} />
          <p className="muted">{t('hoursHint')}</p>
        </details>
        <fieldset className="palette">
          <legend>{t('color')}</legend>
          <div className="swatches">
            {PALETTE.map((_, i) => (
              <label className={`swatch color-${i}`} key={i}>
                <input
                  type="radio"
                  name="color"
                  checked={f.color === i && !f.customColor}
                  aria-label={t(colors[i] ?? 'blue')}
                  onChange={() => {
                    const next = { ...f, color: i as ColorIndex };
                    delete next.customColor;
                    const s = useStore.getState();
                    s.commit({ ...s.doc, features: s.doc.features.map((x, n) => (n === index ? next : x)) });
                    useStore.setState({ lastColor: i as ColorIndex });
                  }}
                />
                {f.color === i && !f.customColor && <Icon name="check" />}
              </label>
            ))}
          </div>
          <label className="custom-color">
            {t('customColor')}
            <input type="color" value={f.customColor ?? PALETTE[f.color]} onChange={(e) => update({ customColor: e.target.value })} />
          </label>
        </fieldset>
        <details className="inspector-disclosure">
          <summary>{t('editCoordinates')}</summary>
          <Coordinates index={index} feature={f} />
        </details>
        <button className="delete-place" onClick={() => useStore.getState().removeFeature(index)}>
          <Icon name="trash" />
          {t(f.kind === 'point' ? 'deletePlace' : 'delete')}
        </button>
      </div>
    </section>
  );
}
function Coordinates({ index, feature: f }: { index: number; feature: AtlasFeature }) {
  const t = useT();
  const [text, setText] = useState(f.coords.map((p) => p.join(', ')).join('\n'));
  const [error, setError] = useState(false);
  return (
    <>
      <label>
        {t('coordinates')}
        <textarea value={text} rows={4} onChange={(e) => setText(e.target.value)} />
      </label>
      <button
        onClick={() => {
          const c = text.split('\n').map((line) => line.split(',').map((v) => (v.trim() ? Number(v) : NaN)));
          if (c.some((p) => p.length !== 2 || !p.every(Number.isFinite) || Math.abs(p[0] ?? 181) > 180 || Math.abs(p[1] ?? 91) > 90)) {
            setError(true);
            return;
          }
          setError(!useStore.getState().updateFeature(index, { coords: c.map((p) => [p[0] ?? 0, p[1] ?? 0]) }));
        }}
      >
        {t('apply')}
      </button>
      {error && <p role="alert">{t('invalidCoordinates')}</p>}
    </>
  );
}

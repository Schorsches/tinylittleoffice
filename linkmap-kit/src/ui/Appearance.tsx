import { useStore } from '../state/store.ts';
import { defaultSettings } from '../format/index.ts';
import { useT } from '../i18n/index.ts';
import { Icon } from './Icon.tsx';
export function Appearance() {
  const t = useT();
  const doc = useStore((s) => s.doc),
    settings = doc.settings ?? defaultSettings;
  const patch = (p: Partial<typeof settings>) => useStore.getState().commit({ ...doc, settings: { ...settings, ...p } });
  return (
    <div className="appearance-panel">
      <div className="outline-tabs">
        <button onClick={() => useStore.setState({ tab: 'content' })}>{t('content')}</button>
        <button className="active">{t('appearance')}</button>
      </div>
      <h2>{t('mapSettings')}</h2>
      <label>
        {t('preset')}
        <select value={settings.preset} onChange={(e) => patch({ preset: e.target.value as typeof settings.preset })}>
          <option value="location">{t('locationTemplate')}</option>
          <option value="event">{t('eventTemplate')}</option>
          <option value="locator">{t('locatorTemplate')}</option>
        </select>
      </label>
      <label className="custom-color">
        {t('accent')}
        <input type="color" value={settings.accent} onChange={(e) => patch({ accent: e.target.value })} />
      </label>
      {(['showLocation', 'interactive', 'showLabels'] as const).map((k, i) => (
        <label className="check-setting" key={k}>
          <input type="checkbox" checked={settings[k]} onChange={(e) => patch({ [k]: e.target.checked })} />
          {t(i === 0 ? 'showLocation' : i === 1 ? 'allowInteraction' : 'showLabels')}
        </label>
      ))}
      <button
        onClick={() => {
          const s = useStore.getState();
          s.commit({ ...s.doc, view: s.camera });
        }}
      >
        <Icon name="map-trifold" />
        {t('startView')}
      </button>
    </div>
  );
}

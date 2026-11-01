import { useStore } from '../state/store.ts';
import { useT } from '../i18n/index.ts';
import { filteredIndexes } from '../state/filter.ts';
import { FeatureMark } from './Outline.tsx';
export function Visitor() {
  const t = useT();
  const s = useStore();
  const visible = filteredIndexes(s.doc, s.search, s.categoryFilter, s.serviceFilter);
  const categories = [...new Set(s.doc.features.map((f) => f.info?.category).filter((v): v is string => !!v))];
  const services = [...new Set(s.doc.features.flatMap((f) => f.info?.services ?? []))];
  const f = s.selected === null ? undefined : s.doc.features[s.selected];
  return (
    <section className="visitor-list" aria-label={t('places')}>
      <header>
        <h1>{s.doc.title || t('untitled')}</h1>
        <p className="muted">{t('readOnlyNotice')}</p>
      </header>
      <label className="search-label">
        {t('searchPlaces')}
        <input type="search" value={s.search} onChange={(e) => useStore.setState({ search: e.target.value })} />
      </label>
      <div className="visitor-filters">
        <select aria-label={t('category')} value={s.categoryFilter} onChange={(e) => useStore.setState({ categoryFilter: e.target.value })}>
          <option value="">{t('allCategories')}</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select aria-label={t('services')} value={s.serviceFilter} onChange={(e) => useStore.setState({ serviceFilter: e.target.value })}>
          <option value="">{t('allServices')}</option>
          {services.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <p className="result-count" role="status">
        {visible.length} {t('results')}
      </p>
      {(s.search || s.categoryFilter || s.serviceFilter) && (
        <button className="text-button" onClick={() => useStore.setState({ search: '', categoryFilter: '', serviceFilter: '' })}>
          {t('clearFilters')}
        </button>
      )}
      {!visible.length && <p>{t('noResults')}</p>}
      <ul>
        {visible.map((i) => {
          const place = s.doc.features[i];
          return (
            place && (
              <li key={i}>
                <button onClick={() => useStore.setState({ selected: i })} aria-pressed={i === s.selected}>
                  <FeatureMark feature={place} />
                  <span>
                    <strong>{place.name || t(place.kind)}</strong>
                    {place.info?.address && <small>{place.info.address}</small>}
                  </span>
                </button>
              </li>
            )
          );
        })}
      </ul>
      {f && visible.includes(s.selected ?? -1) && (
        <article className="visitor-details">
          <h2>{f.name || t(f.kind)}</h2>
          <p>{f.info?.address}</p>
          <p className="preserve-lines">{f.note}</p>
          {f.info?.services.length ? <p>{f.info.services.join(' · ')}</p> : null}
          {f.info?.hours && (
            <>
              <h3>{t('hours')}</h3>
              <p className="preserve-lines">{f.info.hours}</p>
              <small>{t('hoursHint')}</small>
            </>
          )}
        </article>
      )}
    </section>
  );
}

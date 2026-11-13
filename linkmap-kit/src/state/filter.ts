import type { AtlasDoc, AtlasFeature } from '../format/index.ts';
export function filteredIndexes(doc: AtlasDoc, search: string, category: string, service: string) {
  const q = search.trim().toLocaleLowerCase();
  return doc.features.flatMap((f, i) => {
    const text = [f.name, f.note, f.info?.address, f.info?.category, ...(f.info?.services ?? [])].join(' ').toLocaleLowerCase();
    return (!q || text.includes(q)) && (!category || f.info?.category === category) && (!service || f.info?.services.includes(service))
      ? [i]
      : [];
  });
}
export const placeInfo = (f: AtlasFeature) => f.info ?? { address: '', category: '', services: [], hours: '' };

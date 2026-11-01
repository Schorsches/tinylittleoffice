import { problems, quantize, type Feature, type MapDoc } from './model.ts';
export interface PlaceInfo {
  address: string;
  category: string;
  services: string[];
  hours: string;
}
export interface AtlasFeature extends Feature {
  info?: PlaceInfo;
  customColor?: string;
}
export interface AtlasSettings {
  preset: 'location' | 'event' | 'locator';
  accent: string;
  showLocation: boolean;
  interactive: boolean;
  showLabels: boolean;
}
export interface AtlasDoc extends MapDoc {
  features: readonly AtlasFeature[];
  settings?: AtlasSettings;
}
export const defaultSettings: AtlasSettings = {
  preset: 'location',
  accent: '#15604c',
  showLocation: true,
  interactive: true,
  showLabels: true,
};
const text = (v: unknown, max: number) => typeof v === 'string' && new TextEncoder().encode(v).length <= max;
const hex = (v: unknown) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
const record = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const keys = (v: Record<string, unknown>, allowed: string[]) => Object.keys(v).every((k) => allowed.includes(k));
export function validDocument(v: unknown): v is AtlasDoc {
  if (
    !record(v) ||
    !keys(v, ['title', 'view', 'features', 'settings']) ||
    !text(v.title, 400) ||
    !record(v.view) ||
    !keys(v.view, ['lng', 'lat', 'zoom', 'bearing', 'pitch']) ||
    !['lng', 'lat', 'zoom', 'bearing', 'pitch'].every(
      (k) => typeof v.view === 'object' && v.view !== null && Number.isFinite((v.view as Record<string, unknown>)[k]),
    ) ||
    !Array.isArray(v.features) ||
    v.features.length > 5000
  )
    return false;
  for (const f of v.features) {
    if (
      !record(f) ||
      !keys(f, ['kind', 'coords', 'name', 'note', 'color', 'info', 'customColor']) ||
      !Array.isArray(f.coords) ||
      !text(f.name, 400) ||
      !text(f.note, 4000) ||
      !f.coords.every((p) => Array.isArray(p) && p.length === 2 && p.every((x) => typeof x === 'number' && Number.isFinite(x)))
    )
      return false;
    if (f.customColor !== undefined && !hex(f.customColor)) return false;
    if (f.info !== undefined) {
      const i = f.info;
      if (
        !record(i) ||
        !keys(i, ['address', 'category', 'services', 'hours']) ||
        !text(i.address, 2000) ||
        !text(i.category, 120) ||
        !text(i.hours, 2000) ||
        !Array.isArray(i.services) ||
        i.services.length > 30 ||
        !i.services.every((s) => text(s, 120))
      )
        return false;
    }
  }
  if (v.settings !== undefined) {
    const s = v.settings;
    if (
      !record(s) ||
      !keys(s, ['preset', 'accent', 'showLocation', 'interactive', 'showLabels']) ||
      !['location', 'event', 'locator'].includes(String(s.preset)) ||
      !hex(s.accent) ||
      !['showLocation', 'interactive', 'showLabels'].every((k) => typeof s[k] === 'boolean')
    )
      return false;
  }
  try {
    return problems(v as unknown as MapDoc).length === 0;
  } catch {
    return false;
  }
}
export const quantizeDocument = (doc: AtlasDoc): AtlasDoc => ({
  ...doc,
  ...quantize(doc),
  ...(doc.settings ? { settings: { ...doc.settings } } : {}),
});

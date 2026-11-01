import { create } from 'zustand';
import { emptyDoc, problems, quantize, type Feature, type MapDoc, type View, type Locker } from '../format/index.ts';
export type Tool = 'select' | 'point' | 'line' | 'polygon';
interface State {
  doc: MapDoc;
  selected: number | null;
  tool: Tool;
  past: MapDoc[];
  future: MapDoc[];
  locker: Locker | null;
  status: 'ready' | 'needs-password' | 'damaged';
  payload: string;
  revision: number;
  message: string;
  lastColor: Feature['color'];
  commit(doc: MapDoc): boolean;
  addFeature(f: Feature): boolean;
  updateFeature(i: number, p: Partial<Feature>): boolean;
  removeFeature(i: number): boolean;
  setTitle(t: string): boolean;
  setView(v: View): void;
  undo(): void;
  redo(): void;
  replaceDoc(d: MapDoc, locker?: Locker | null): void;
}
export const useStore = create<State>((set, get) => ({
  doc: emptyDoc(),
  selected: null,
  tool: 'select',
  past: [],
  future: [],
  locker: null,
  status: 'ready',
  payload: '',
  revision: 0,
  message: '',
  lastColor: 0,
  commit(doc) {
    if (problems(doc).length) {
      set({ message: 'limit' });
      return false;
    }
    const s = get();
    set({ doc: quantize(doc), past: [...s.past, s.doc].slice(-100), future: [], message: '' });
    return true;
  },
  addFeature(f) {
    const s = get();
    if (!s.commit({ ...s.doc, features: [...s.doc.features, f] })) return false;
    set({ selected: s.doc.features.length, tool: 'select' });
    return true;
  },
  updateFeature(i, p) {
    const s = get();
    if (!s.doc.features[i]) return false;
    if (p.color !== undefined) set({ lastColor: p.color });
    return s.commit({ ...s.doc, features: s.doc.features.map((f, n) => (n === i ? { ...f, ...p } : f)) });
  },
  removeFeature(i) {
    const s = get();
    if (!s.doc.features[i]) return false;
    const ok = s.commit({ ...s.doc, features: s.doc.features.filter((_, n) => n !== i) });
    if (ok) set({ selected: null });
    return ok;
  },
  setTitle(title) {
    return get().commit({ ...get().doc, title });
  },
  setView(view) {
    const doc = { ...get().doc, view };
    if (!problems(doc).length) set({ doc: { ...get().doc, view: quantize(doc).view } });
  },
  undo() {
    const s = get(),
      doc = s.past.at(-1);
    if (doc)
      set({ doc: { ...doc, view: s.doc.view }, past: s.past.slice(0, -1), future: [s.doc, ...s.future].slice(0, 100), selected: null });
  },
  redo() {
    const s = get(),
      doc = s.future[0];
    if (doc) set({ doc: { ...doc, view: s.doc.view }, past: [...s.past, s.doc].slice(-100), future: s.future.slice(1), selected: null });
  },
  replaceDoc(doc, locker = null) {
    if (problems(doc).length) return;
    set({
      doc: quantize(doc),
      locker,
      past: [],
      future: [],
      selected: null,
      tool: 'select',
      status: 'ready',
      revision: get().revision + 1,
    });
  },
}));

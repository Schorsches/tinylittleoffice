import { decodeDocument, emptyDoc, encodeDocument, encodeProtectedDocument, documentPayload, documentHash } from '../format/index.ts';
import { useStore } from './store.ts';
export interface LinkEnvironment {
  read(): string;
  write(hash: string): void;
  listen(cb: () => void): () => void;
}
const browser: LinkEnvironment = {
  read: () => location.hash,
  write: (h) => history.replaceState(null, '', h || location.pathname),
  listen: (cb) => {
    addEventListener('hashchange', cb);
    return () => removeEventListener('hashchange', cb);
  },
};
let flushCurrent: (() => Promise<string>) | undefined;
export const flushLink = () => flushCurrent?.() ?? Promise.resolve('');
export function startLinkSync(env: LinkEnvironment = browser) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let generation = 0;
  let loading = false;
  const load = () => {
    clearTimeout(timer);
    generation++;
    loading = true;
    const raw = env.read().replace(/^#\/view\//, '#/');
    const payload = documentPayload(raw);
    useStore.setState({ mode: env.read().startsWith('#/view/') ? 'view' : 'edit' });
    try {
      if (payload?.startsWith('E') || payload?.startsWith('2E'))
        useStore.setState({ doc: emptyDoc(), locker: null, status: 'needs-password', payload, selected: null, past: [], future: [] });
      else {
        useStore.getState().replaceDoc(payload ? decodeDocument(payload) : emptyDoc());
        useStore.setState({ payload: payload ?? '' });
      }
    } catch {
      useStore.setState({ doc: emptyDoc(), locker: null, status: 'damaged', payload: '', past: [], future: [], selected: null });
    }
    loading = false;
  };
  load();
  let pending: Promise<string> | undefined;
  let stopped = false;
  const flush = (): Promise<string> => {
    clearTimeout(timer);
    pending ??= (async () => {
      while (!stopped) {
        const token = generation;
        const s = useStore.getState();
        if (s.status !== 'ready') return '';
        const payload = s.locker ? await encodeProtectedDocument(s.doc, s.locker) : encodeDocument(s.doc);
        if (token !== generation) continue;
        const hash = documentHash(payload);
        env.write(s.mode === 'view' ? hash.replace(/^#\//, '#/view/') : hash);
        useStore.setState({ payload });
        return hash;
      }
      return '';
    })().finally(() => {
      pending = undefined;
    });
    return pending;
  };
  flushCurrent = flush;
  const unsub = useStore.subscribe((s, p) => {
    if (!loading && (s.doc !== p.doc || s.locker !== p.locker) && s.status === 'ready') {
      generation++;
      clearTimeout(timer);
      timer = setTimeout(() => {
        void flush().catch(() => useStore.setState({ message: 'linkError' }));
      }, 150);
    }
  });
  const unlisten = env.listen(load);
  return () => {
    stopped = true;
    generation++;
    clearTimeout(timer);
    unsub();
    unlisten();
    if (flushCurrent === flush) flushCurrent = undefined;
  };
}

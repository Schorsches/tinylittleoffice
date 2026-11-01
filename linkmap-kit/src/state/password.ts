import { emptyDoc, newLocker, openProtectedDocument } from '../format/index.ts';
import { useStore } from './store.ts';
import { flushLink } from './link.ts';
export async function protect(password: string) {
  const revision = useStore.getState().revision;
  const locker = await newLocker(password);
  if (useStore.getState().revision !== revision) return false;
  useStore.setState({ locker });
  await flushLink();
  return true;
}
export async function unlock(password: string) {
  const payload = useStore.getState().payload;
  const { doc, locker } = await openProtectedDocument(payload, password);
  if (useStore.getState().payload !== payload) return false;
  useStore.getState().replaceDoc(doc, locker);
  return true;
}
export async function lock() {
  const hash = await flushLink();
  if (!hash) return;
  useStore.setState({ doc: emptyDoc(), locker: null, status: 'needs-password', selected: null, past: [], future: [], tool: 'select' });
}
export async function unprotect() {
  useStore.setState({ locker: null });
  await flushLink();
}

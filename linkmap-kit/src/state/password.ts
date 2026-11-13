import { newLocker, openProtectedDocument } from '../format/index.ts';
import { useStore } from './store.ts';
import { flushLink } from './link.ts';
export async function protect(password: string) {
  const { revision, status } = useStore.getState();
  if (status !== 'ready') return false;
  const locker = await newLocker(password);
  if (useStore.getState().revision !== revision) return false;
  useStore.setState({ locker });
  await flushLink();
  return true;
}
export async function unlock(password: string) {
  const { payload, revision } = useStore.getState();
  const { doc, locker } = await openProtectedDocument(payload, password);
  if (useStore.getState().payload !== payload || useStore.getState().revision !== revision) return false;
  useStore.getState().replaceDoc(doc, locker);
  return true;
}
export async function lock() {
  const { revision } = useStore.getState();
  const hash = await flushLink();
  const current = useStore.getState();
  if (!hash || current.revision !== revision || !current.locker) return;
  current.gateDocument('needs-password', current.payload);
}
export async function unprotect() {
  useStore.setState({ locker: null });
  await flushLink();
}

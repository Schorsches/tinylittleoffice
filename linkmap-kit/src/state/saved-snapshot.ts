import { documentPayload } from '../format/index.ts';
import { flushLink } from './link.ts';
import { useStore } from './store.ts';
/** Capture one coherent save; navigation or edits during encryption must not switch its map or protection. */
export async function savedSnapshot(protectedTitle: string) {
  const before = useStore.getState();
  const hash = await flushLink();
  const current = useStore.getState();
  if (
    !hash ||
    current.status !== 'ready' ||
    current.revision !== before.revision ||
    current.doc !== before.doc ||
    current.locker !== before.locker
  )
    throw Error('save changed');
  const payload = documentPayload(hash.replace(/^#\/view\//, '#/'));
  if (!payload || payload !== current.payload) throw Error('save unavailable');
  return { title: current.locker ? protectedTitle : current.doc.title, payload };
}

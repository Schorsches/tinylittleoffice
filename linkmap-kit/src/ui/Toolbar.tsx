import { useEffect } from 'react';
import { useStore, type Tool } from '../state/store.ts';
import { useT } from '../i18n/index.ts';
import { Icon, type IconName } from './Icon.tsx';
const tools: Array<[Tool, IconName, string]> = [
  ['select', 'cursor', 'V'],
  ['point', 'map-pin', 'P'],
  ['line', 'path', 'L'],
  ['polygon', 'polygon', 'A'],
];
export function Toolbar() {
  const t = useT();
  const tool = useStore((s) => s.tool),
    past = useStore((s) => s.past.length),
    future = useStore((s) => s.future.length);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof Element && e.target.closest('input,textarea,select,[contenteditable],dialog')) return;
      const s = useStore.getState();
      if (s.mode === 'view') return;
      if (e.key === 'Escape') useStore.setState({ tool: 'select', selected: null });
      if (e.metaKey || e.ctrlKey) {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          if (e.shiftKey) s.redo();
          else s.undo();
        }
        return;
      }
      const next = tools.find(([, , k]) => k.toLowerCase() === e.key.toLowerCase());
      if (next) {
        e.preventDefault();
        useStore.setState({ tool: next[0], selected: null });
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && s.selected !== null) {
        e.preventDefault();
        s.removeFeature(s.selected);
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);
  return (
    <nav className="toolbar" aria-label={t('map')}>
      {tools.map(([key, icon, shortcut]) => (
        <button
          key={key}
          title={`${t(key)} (${shortcut})`}
          aria-label={t(key)}
          aria-pressed={tool === key}
          onClick={() => useStore.setState({ tool: key, selected: null })}
        >
          <Icon name={icon} />
          <span>{t(key)}</span>
        </button>
      ))}
      <span className="divider" />
      <button disabled={!past} onClick={() => useStore.getState().undo()} aria-label={t('undo')} title={t('undo')}>
        <Icon name="arrow-u-up-left" />
      </button>
      <button disabled={!future} onClick={() => useStore.getState().redo()} aria-label={t('redo')} title={t('redo')}>
        <Icon name="arrow-u-up-right" />
      </button>
    </nav>
  );
}

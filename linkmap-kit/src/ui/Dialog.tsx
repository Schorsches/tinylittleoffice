import { useEffect, useRef, type ReactNode } from 'react';
import { useT } from '../i18n/index.ts';
export function Dialog({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const t = useT();
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.showModal();
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);
  return (
    <dialog ref={ref} onCancel={close} aria-labelledby="dialog-title">
      <header className="dialog-header">
        <h2 id="dialog-title">{title}</h2>
        <button onClick={close} aria-label={t('close')}>
          ×
        </button>
      </header>
      {children}
    </dialog>
  );
}

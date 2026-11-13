import { useEffect, useMemo, useRef, useState } from 'react';
import qrcode from 'qrcode-generator';
import { useT } from '../i18n/index.ts';
import { useStore } from '../state/store.ts';
import { flushLink } from '../state/link.ts';
import { Dialog } from './Dialog.tsx';
import { LinkMeter, fullLink } from './LinkMeter.tsx';
import { documentHash } from '../format/index.ts';
import { prepareDocument } from '../state/capacity.ts';
import { simplify } from '../map/simplify.ts';
export function SimplifyPanel({ close }: { close: () => void }) {
  const t = useT(),
    doc = useStore((s) => s.doc),
    [metres, setMetres] = useState(10);
  const preview = useMemo(() => ({ ...doc, features: doc.features.map((f) => simplify(f, metres)) }), [doc, metres]);
  const prepared = useMemo(() => prepareDocument(preview), [preview]);
  return (
    <Dialog title={t('simplify')} close={close}>
      <label>
        {t('tolerance')}: {metres}
        <input type="range" min="1" max="100" value={metres} onChange={(e) => setMetres(Number(e.target.value))} />
      </label>
      <p>
        {doc.features.reduce((n, f) => n + f.coords.length, 0)} → {preview.features.reduce((n, f) => n + f.coords.length, 0)}{' '}
        {t('vertices')}
      </p>
      {prepared ? <LinkMeter length={fullLink(documentHash(prepared.payload)).length} /> : <p role="alert">{t('limit')}</p>}
      <button
        className="primary"
        disabled={!prepared}
        onClick={() => {
          if (useStore.getState().commit(preview)) close();
        }}
      >
        {t('apply')}
      </button>
      <button onClick={close}>{t('cancel')}</button>
    </Dialog>
  );
}
export function Share({ close, password }: { close: () => void; password: () => void }) {
  const t = useT(),
    [link, setLink] = useState(''),
    [message, setMessage] = useState('');
  const input = useRef<HTMLTextAreaElement>(null);
  const locker = useStore((s) => s.locker);
  useEffect(() => {
    let active = true;
    void flushLink()
      .then((hash) => {
        if (active && hash) setLink(fullLink(hash.startsWith('#/view/') ? hash : hash.replace(/^#\//, '#/view/')));
      })
      .catch(() => {
        if (active) setMessage(t('linkError'));
      });
    return () => {
      active = false;
    };
  }, [t]);
  const qr = useMemo(() => {
    if (!link || link.length > 2900) return '';
    try {
      const code = qrcode(0, 'L');
      code.addData(link, 'Byte');
      code.make();
      return code.createDataURL(4, 8);
    } catch {
      return '';
    }
  }, [link]);
  return (
    <Dialog title={t('share')} close={close}>
      <p>{t(locker ? 'sealedNotice' : 'shareNotice')}</p>
      <p className="muted">{t('shareSnapshot')}</p>
      <label>
        {t('share')}
        <textarea ref={input} rows={3} value={link} readOnly />
      </label>
      <LinkMeter length={link.length} />
      <div className="actions">
        <button
          className="primary"
          disabled={!link}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(link);
              setMessage(t('copied'));
            } catch {
              input.current?.select();
              setMessage(t('copyFallback'));
            }
          }}
        >
          {t('copy')}
        </button>
        {typeof navigator.share === 'function' && (
          <button
            disabled={!link}
            onClick={() => {
              void navigator.share({ url: link }).catch(() => {});
            }}
          >
            {t('nativeShare')}
          </button>
        )}
      </div>
      <p role="status">{message}</p>
      {qr ? <img className="qr" src={qr} alt={t('qr')} /> : link && <p>{t('qrLong')}</p>}
      <button onClick={password}>{t(locker ? 'changePassword' : 'protect')}</button>
    </Dialog>
  );
}

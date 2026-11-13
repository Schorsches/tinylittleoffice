import { useState } from 'react';
import { useT } from '../i18n/index.ts';
import { protect, unlock } from '../state/password.ts';
import { useStore } from '../state/store.ts';
import { emptyDoc } from '../format/index.ts';
export function Password({ opening = false, done }: { opening?: boolean; done: () => void }) {
  const t = useT();
  const [password, setPassword] = useState(''),
    [repeat, setRepeat] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [last, setLast] = useState(0);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (busy || Date.now() - last < 1000) return;
        if (!opening && password !== repeat) {
          setError(t('passwordMismatch'));
          return;
        }
        setBusy(true);
        setLast(Date.now());
        setError('');
        const p = password;
        setPassword('');
        setRepeat('');
        void (opening ? unlock(p) : protect(p))
          .then((ok) => {
            if (ok) done();
          })
          .catch(() => setError(t('wrongPassword')))
          .finally(() => setBusy(false));
      }}
    >
      <p>{t(opening ? 'unlockHint' : 'passwordHint')}</p>
      <label>
        {t('password')}
        <input
          type="password"
          value={password}
          autoComplete={opening ? 'current-password' : 'new-password'}
          required
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {!opening && (
        <>
          <label>
            {t('repeat')}
            <input type="password" value={repeat} autoComplete="new-password" required onChange={(e) => setRepeat(e.target.value)} />
          </label>
          <p className="muted">
            {t('strength')} {password.length >= 20 ? '✓' : ''}
          </p>
        </>
      )}
      {error && <p role="alert">{error}</p>}
      <button className="primary" disabled={busy}>
        {t(busy ? 'busy' : opening ? 'unlock' : 'protect')}
      </button>
      {opening && (
        <button
          type="button"
          onClick={() => {
            history.replaceState(null, '', location.pathname);
            useStore.getState().replaceDoc(emptyDoc());
            useStore.setState({ mode: 'edit' });
          }}
        >
          {t('newMap')}
        </button>
      )}
    </form>
  );
}

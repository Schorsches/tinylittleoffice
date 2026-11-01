import { useT } from '../i18n/index.ts';
import { URL_SOFT_LIMIT, URL_HARD_WARN } from '../format/index.ts';
export const fullLink = (hash: string) => `${location.origin}${location.pathname}${hash}`;
export function LinkMeter({ length }: { length: number }) {
  const t = useT();
  return (
    <p className={`link-meter ${length < URL_SOFT_LIMIT ? 'ok' : length < URL_HARD_WARN ? 'long' : 'warning'}`}>
      {new Intl.NumberFormat().format(length)} {t('length')} · {t(length < URL_SOFT_LIMIT ? 'lengthOk' : 'lengthLong')}
    </p>
  );
}

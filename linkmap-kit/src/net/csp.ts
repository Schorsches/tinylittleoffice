/**
 * The production security headers, generated from the allow-list. vite.config.ts writes them into dist/_headers
 * (read by Netlify and Cloudflare Pages) and injects the CSP as a <meta> into index.html for hosts that cannot set
 * headers (GitHub Pages). The dev server gets none of this: Vite's dev client injects inline styles.
 *
 * Never weaken a directive to make a feature work. Fix the feature (see docs/SECURITY.md §CSP).
 */
import { ALLOWED_HOSTS } from './allowlist.ts';

const remote = ALLOWED_HOSTS.map((h) => h.origin).join(' ');

/** Directives valid in both a header and a <meta>. */
const DIRECTIVES: Record<string, string> = {
  'default-src': "'none'",
  'script-src': "'self'",
  // MapLibre and React set styles through the CSSOM (element.style), which CSP allows without 'unsafe-inline'.
  'style-src': "'self'",
  'img-src': `'self' data: blob: ${remote}`,
  'font-src': "'self'",
  // MapLibre fetches style, tiles, sprites and glyphs with fetch(): connect-src, not img-src.
  'connect-src': `'self' ${remote}`,
  // MapLibre's worker is a same-origin file (src/map/maplibre.ts calls setWorkerUrl), never a blob.
  'worker-src': "'self'",
  'manifest-src': "'self'",
  'object-src': "'none'",
  'base-uri': "'none'",
  'form-action': "'none'",
};

/** Directives a <meta> cannot carry (browsers ignore them there). */
const HEADER_ONLY: Record<string, string> = {
  'frame-ancestors': "'none'",
  'upgrade-insecure-requests': '',
};

const join = (d: Record<string, string>) =>
  Object.entries(d)
    .map(([k, v]) => (v ? `${k} ${v}` : k))
    .join('; ');

export const CSP_META = join(DIRECTIVES);
export const CSP_HEADER = join({ ...DIRECTIVES, ...HEADER_ONLY });

export const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': CSP_HEADER,
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  // geolocation only for the opt-in "Show my location" button; everything else off.
  'Permissions-Policy': 'geolocation=(self), camera=(), microphone=(), payment=(), usb=(), interest-cohort=(), browsing-topics=()',
  'X-Frame-Options': 'DENY',
};

/** dist/_headers in the Netlify / Cloudflare Pages format. */
export function headersFile(): string {
  const lines = Object.entries(SECURITY_HEADERS).map(([k, v]) => `  ${k}: ${v}`);
  return `/*\n${lines.join('\n')}\n`;
}

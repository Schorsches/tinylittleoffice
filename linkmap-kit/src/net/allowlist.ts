/**
 * Every host this app may contact. This is the single source of truth: the Content-Security-Policy (csp.ts) is
 * generated from it, and docs/SECURITY.md lists the same hosts. Adding a host is a security decision: it needs an
 * ADR in docs/DECISIONS.md, an entry here, and a sentence in the in-app privacy note.
 */
export interface AllowedHost {
  /** Origin, scheme included, no trailing slash. */
  origin: string;
  /** What the app fetches from it. */
  what: string;
  /** What that request reveals about the user. Never anything from the map document itself. */
  reveals: string;
}

export const OPENFREEMAP: AllowedHost = {
  origin: 'https://tiles.openfreemap.org',
  what: 'Map style (Liberty), vector tiles, shaded relief, sprites and fonts, drawn by MapLibre GL JS.',
  reveals: 'The IP address and which map tiles are on screen (roughly where you are looking). No referrer, no document content.',
};

export const ALLOWED_HOSTS: readonly AllowedHost[] = [OPENFREEMAP];

/** OpenFreeMap's Liberty style. Its sources, sprite and glyphs are all on OPENFREEMAP.origin (verified 2026-10-31). */
export const STYLE_URL = `${OPENFREEMAP.origin}/styles/liberty`;

/** Whether a URL may be fetched. Used by MapLibre's transformRequest as defense in depth behind the CSP. */
export function isAllowedUrl(url: string): boolean {
  try {
    const u = new URL(url, 'https://invalid.example');
    if (u.origin === 'https://invalid.example') return true; // relative to the app itself
    return ALLOWED_HOSTS.some((h) => h.origin === u.origin);
  } catch {
    return false;
  }
}

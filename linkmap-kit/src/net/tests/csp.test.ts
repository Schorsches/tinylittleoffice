import { describe, expect, it } from 'vitest';
import { CSP_HEADER, CSP_META, headersFile } from '../csp.ts';
import { isAllowedUrl, STYLE_URL } from '../allowlist.ts';

describe('CSP', () => {
  it('never allows inline or eval script', () => {
    for (const csp of [CSP_HEADER, CSP_META]) {
      expect(csp).not.toMatch(/unsafe-inline|unsafe-eval|unsafe-hashes|\*/);
      expect(csp).toContain("default-src 'none'");
      expect(csp).toContain("script-src 'self'");
    }
  });
  it('keeps header-only directives out of the meta', () => {
    expect(CSP_META).not.toContain('frame-ancestors');
    expect(CSP_HEADER).toContain("frame-ancestors 'none'");
  });
  it('writes a _headers file for every path', () => {
    expect(headersFile()).toMatch(/^\/\*\n {2}Content-Security-Policy: /);
    expect(headersFile()).toContain('Referrer-Policy: no-referrer');
  });
});

describe('allow-list', () => {
  it('allows OpenFreeMap and the app itself only', () => {
    expect(isAllowedUrl(STYLE_URL)).toBe(true);
    expect(isAllowedUrl('https://tiles.openfreemap.org/planet/1/0/0.pbf')).toBe(true);
    expect(isAllowedUrl('/assets/x.js')).toBe(true);
    expect(isAllowedUrl('https://tile.openstreetmap.org/0/0/0.png')).toBe(false);
    expect(isAllowedUrl('http://tiles.openfreemap.org/styles/liberty')).toBe(false);
    expect(isAllowedUrl('https://tiles.openfreemap.org.evil.example/x')).toBe(false);
  });
});

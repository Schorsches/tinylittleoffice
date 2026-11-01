import fc from 'fast-check';
import { deflateSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { encodeBase64Url } from '../base64url.ts';
import { decodeMap, emptyDoc, encodeMap, LinkError, payloadOf, problems, quantize, toHash, type Feature, type MapDoc } from '../index.ts';
import { LISBON } from './fixtures.ts';

const code = (f: () => unknown) => {
  try {
    f();
  } catch (e) {
    if (e instanceof LinkError) return e.code;
    throw e;
  }
  return 'ok';
};

describe('golden', () => {
  it('the Lisbon map always encodes to the same payload (format v1 is frozen)', () => {
    expect(encodeMap(LISBON)).toMatchInlineSnapshot(
      `"rARJTYXR1cmRheSBpbiBMaXNib26TyG_M19gDxgoAAARgqgmFERNQcmHDp2EgZG8gQ29tw6lyY2lvDlN0YXJ0IGF0IDEwOjAwLMsX8gMIUGFzdMOpaXMlBMwX8QP5BLYB3wigAfEJnAEEV2Fsa0oExhHXAZADAAC_Ao8DAAZNYXJrZXQ"`,
    );
  });
  it('reads back as written', () => {
    expect(decodeMap(encodeMap(LISBON))).toEqual(quantize(LISBON));
  });
  it('is short: the Lisbon map fits a tweet-sized link', () => {
    expect(encodeMap(LISBON).length).toBeLessThan(220);
  });
});

describe('link fragment', () => {
  it('round-trips through toHash and payloadOf, breaks included', () => {
    const p = encodeMap({ ...LISBON, title: 'x'.repeat(400) });
    const hash = toHash(p);
    expect(hash.startsWith('#/v1/')).toBe(true);
    expect(payloadOf(hash)).toBe(p);
    expect(decodeMap(payloadOf(hash)!)).toEqual(quantize({ ...LISBON, title: 'x'.repeat(400) }));
  });
  it('ignores fragments that are not maps', () => {
    expect(payloadOf('#about')).toBeNull();
    expect(payloadOf('')).toBe('');
  });
  it('reads "-" as "~" (lenient base64url)', () => {
    const p = encodeMap(LISBON);
    expect(decodeMap(p.replaceAll('~', '-'))).toEqual(decodeMap(p));
  });
});

describe('hostile links', () => {
  it('rejects garbage with a LinkError, never another exception', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 200 }), (s) => {
        expect(['ok', 'empty', 'version', 'base64', 'flag', 'inflate', 'too-large', 'malformed', 'invalid', 'sealed']).toContain(
          code(() => decodeMap(s)),
        );
      }),
      { numRuns: 2000 },
    );
  });
  it('rejects random bytes with a LinkError', () => {
    fc.assert(
      fc.property(fc.uint8Array({ maxLength: 300 }), fc.constantFrom('r', 'z'), (b, flag) => {
        const payload = flag + encodeBase64Url(flag === 'z' ? deflateSync(b) : b);
        expect(code(() => decodeMap(payload))).not.toBe(undefined);
      }),
      { numRuns: 2000 },
    );
  });
  it('stops a zip bomb', () => {
    const bomb = 'z' + encodeBase64Url(deflateSync(new Uint8Array(50 * 1024 * 1024), { level: 9 }));
    expect(bomb.length).toBeLessThan(100_000);
    expect(code(() => decodeMap(bomb))).toBe('too-large');
  });
  it('rejects a future format version', () => {
    expect(code(() => decodeMap('r' + encodeBase64Url(new Uint8Array([2, 0]))))).toBe('version');
  });
  it('rejects trailing bytes', () => {
    const p = encodeMap(emptyDoc());
    const bytes = Uint8Array.from(
      atob(p.slice(1).replaceAll('~', '+').replaceAll('_', '/') + '=='.slice(0, (4 - ((p.length - 1) % 4)) % 4)),
      (c) => c.charCodeAt(0),
    );
    expect(code(() => decodeMap('r' + encodeBase64Url(new Uint8Array([...bytes, 0]))))).toBe('malformed');
  });
  it('asks for a password for sealed links', () => {
    expect(code(() => decodeMap('EAAAA'))).toBe('sealed');
  });
});

describe('validation', () => {
  it('refuses to encode an invalid document', () => {
    const bad: MapDoc = { ...emptyDoc(), features: [{ kind: 'line', coords: [[0, 0]], name: '', note: '', color: 0 }] };
    expect(problems(bad)).toHaveLength(1);
    expect(code(() => encodeMap(bad))).toBe('invalid');
  });
  it('wraps longitudes beyond the antimeridian', () => {
    const doc: MapDoc = { ...emptyDoc(), view: { lng: 190, lat: 0, zoom: 2, bearing: -90, pitch: 0 } };
    expect(decodeMap(encodeMap(doc)).view).toEqual({ lng: -170, lat: 0, zoom: 2, bearing: 270, pitch: 0 });
  });
});

const lngLat = fc.tuple(fc.double({ min: -180, max: 180, noNaN: true }), fc.double({ min: -90, max: 90, noNaN: true }));
const text = (n: number) => fc.string({ unit: 'grapheme', maxLength: n });
const feature: fc.Arbitrary<Feature> = fc
  .oneof(
    fc.record({ kind: fc.constant('point' as const), coords: fc.tuple(lngLat) }),
    fc.record({ kind: fc.constant('line' as const), coords: fc.array(lngLat, { minLength: 2, maxLength: 30 }) }),
    fc.record({ kind: fc.constant('polygon' as const), coords: fc.array(lngLat, { minLength: 3, maxLength: 30 }) }),
  )
  .chain((g) =>
    fc.record({
      kind: fc.constant(g.kind),
      coords: fc.constant(g.coords),
      name: text(40),
      note: text(80),
      color: fc.integer({ min: 0, max: 7 }) as fc.Arbitrary<Feature['color']>,
    }),
  );
const doc: fc.Arbitrary<MapDoc> = fc.record({
  title: text(60),
  view: fc.record({
    lng: fc.double({ min: -540, max: 540, noNaN: true }),
    lat: fc.double({ min: -90, max: 90, noNaN: true }),
    zoom: fc.double({ min: 0, max: 24, noNaN: true }),
    bearing: fc.double({ min: -720, max: 720, noNaN: true }),
    pitch: fc.double({ min: 0, max: 85, noNaN: true }),
  }),
  features: fc.array(feature, { maxLength: 20 }),
});

describe('properties', () => {
  it('decode(encode(d)) == quantize(d) for every valid document', () => {
    fc.assert(
      fc.property(doc, (d) => {
        expect(decodeMap(encodeMap(d))).toEqual(quantize(d));
      }),
      { numRuns: 500 },
    );
  });
  it('encoding is stable: encode(decode(encode(d))) == encode(d)', () => {
    fc.assert(
      fc.property(doc, (d) => {
        const p = encodeMap(d);
        expect(encodeMap(decodeMap(p))).toBe(p);
      }),
      { numRuns: 500 },
    );
  });
});

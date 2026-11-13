import { describe, it, expect } from 'vitest';
import { emptyDoc, encodeMap, newLocker } from '../index.ts';
import {
  encodeDocument,
  decodeDocument,
  encodeProtectedDocument,
  openProtectedDocument,
  documentHash,
  documentPayload,
  validDocument,
} from '../atlas.ts';
const doc = {
  ...emptyDoc(),
  title: 'Event',
  settings: { preset: 'event' as const, accent: '#15604c', showLocation: true, interactive: true, showLabels: true },
  features: [
    {
      kind: 'point' as const,
      coords: [[8.3, 49.2]] as const,
      name: 'Treffpunkt',
      note: 'Info',
      color: 0 as const,
      info: { address: 'Beispielstraße 1', category: 'Information', services: ['Stufenloser Zugang'], hours: 'Samstag 14–22 Uhr' },
      customColor: '#123456',
    },
  ],
};
describe('extended document format', () => {
  it('keeps v1 links and their exact bytes unchanged', () => {
    const d = emptyDoc();
    expect(encodeDocument(d)).toBe(encodeMap(d));
    expect(decodeDocument(encodeDocument(d))).toEqual(d);
  });
  it('roundtrips every extended field through v2 fragment', () => {
    const p = encodeDocument(doc);
    expect(p).toMatchInlineSnapshot(
      `"2zLZBBTsNADEUlThKZbVQ1aVpBliAWSOwKG6ouphMnGTUZRxNPKogicQcOwGG4CSfBk2Znfdvf7_tmBDbcIOTwNKBliGEweIF8hMZWkK9jaBRDnkrxSdRCnqy2MZxQObP0O8O6lmqKoUTF3mEP~WGEs7GF2HZkZltN5IrQOdytNnF2v0qPxxisasPtV4dl2Xl7DpOWOGjPtqR5ryE3HzJBEDBVFHJDrOABTd8ZbHp26vcHoyTMK8aK3Mfi4FrFhqw0enSD0TMc7NmXaBsSLXr3lZIoAlOTd8F2r9qeVRUl2d_Xd5pGb7UDSad9z9Q~XnngNkk32XYHkyz2yCzvkN0ROmFD~Rjg8k~ldSjCxna3znRAqenyQkIayHJ2HkM6Rqc0m0HCX6V5TJ0k31WZpn8"`,
    );
    expect(p.startsWith('2')).toBe(true);
    expect(documentHash(p)).toMatch(/^#\/v2\//);
    expect(decodeDocument(documentPayload(documentHash(p))!)).toEqual(doc);
  });
  it('uses the original crypto for complete protected documents', async () => {
    const p = await encodeProtectedDocument(doc, await newLocker('four words for a map', 1000));
    expect(p.startsWith('2E')).toBe(true);
    expect((await openProtectedDocument(p, 'four words for a map', 1000)).doc).toEqual(doc);
    await expect(openProtectedDocument(p, 'wrong', 1000)).rejects.toBeTruthy();
  });
  it('rejects invalid colors, hostile structures and excessive metadata', () => {
    expect(validDocument({ ...doc, features: [{ ...doc.features[0], customColor: 'url(evil)' }] })).toBe(false);
    expect(validDocument({ features: [{}] })).toBe(false);
    expect(
      validDocument({ ...doc, features: [{ ...doc.features[0], info: { ...doc.features[0]!.info, address: 'x'.repeat(2001) } }] }),
    ).toBe(false);
    expect(() => decodeDocument('2z!!!')).toThrow();
  });
});

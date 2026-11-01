import { describe, expect, it } from 'vitest';
import { encodeMap, encodeSealed, LinkError, newLocker, openSealed, quantize } from '../index.ts';
import { LISBON } from './fixtures.ts';

// Tests use a low iteration count for speed; production always uses PBKDF2_ITERATIONS (seal.test only).
const FAST = 1_000;

describe('seal', () => {
  it('opens with the right password and keeps the locker for re-sealing', async () => {
    const locker = await newLocker('correct horse', FAST);
    const sealed = await encodeSealed(LISBON, locker);
    expect(sealed.startsWith('E')).toBe(true);
    const { doc, locker: again } = await openSealed(sealed, 'correct horse', FAST);
    expect(doc).toEqual(quantize(LISBON));
    expect(await encodeSealed(doc, again)).not.toBe(sealed); // fresh IV every time
  });
  it('normalises the password (NFKC)', async () => {
    const sealed = await encodeSealed(LISBON, await newLocker('Ｃafé', FAST));
    await expect(openSealed(sealed, 'Café', FAST)).resolves.toBeTruthy();
  });
  it('rejects a wrong password and a tampered link the same way', async () => {
    const sealed = await encodeSealed(LISBON, await newLocker('pw', FAST));
    await expect(openSealed(sealed, 'nope', FAST)).rejects.toMatchObject({ code: 'password' });
    const flipped = sealed.slice(0, -3) + (sealed.at(-3) === 'A' ? 'B' : 'A') + sealed.slice(-2);
    await expect(openSealed(flipped, 'pw', FAST)).rejects.toBeInstanceOf(LinkError);
  });
  it('reveals nothing of the map', async () => {
    const sealed = await encodeSealed(LISBON, await newLocker('pw', FAST));
    expect(sealed).not.toContain(encodeMap(LISBON).slice(1, 20));
  });
});

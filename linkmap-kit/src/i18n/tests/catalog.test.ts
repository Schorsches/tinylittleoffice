import { expect, it } from 'vitest';
import { en } from '../en.ts';
import { de } from '../de.ts';
it('has complete English and German catalogs', () => {
  expect(Object.keys(de).sort()).toEqual(Object.keys(en).sort());
  expect(Object.values(de).every(Boolean)).toBe(true);
});

/** The public API of the format. UI code imports from here only, never from the files behind it. */
export {
  PALETTE,
  KINDS,
  emptyDoc,
  quantize,
  problems,
  wrapLng,
  type ColorIndex,
  type Feature,
  type Kind,
  type LngLat,
  type MapDoc,
  type View,
} from './model.ts';
export { LIMITS, URL_SOFT_LIMIT, URL_HARD_WARN } from './limits.ts';
export { LinkError } from './errors.ts';
export { ROUTE, encodeMap, decodeMap, encodeSealed, openSealed, toHash, payloadOf } from './link.ts';
export { newLocker, isSealed, PBKDF2_ITERATIONS, type Locker } from './seal.ts';

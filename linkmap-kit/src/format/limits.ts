/**
 * Hard limits. A link is attacker-controlled input: anyone can craft one and send it. The decoder rejects anything
 * beyond these before allocating for it, so a hostile link can neither freeze the tab nor exhaust memory.
 */
export const LIMITS = {
  /** Largest packed payload accepted, after base64url decoding (a 2 MiB URL is already beyond every browser's comfort). */
  packedBytes: 1024 * 1024,
  /** Largest binary document after inflating (zip-bomb guard). */
  inflatedBytes: 2 * 1024 * 1024,
  features: 5_000,
  coords: 200_000,
  titleBytes: 400,
  nameBytes: 400,
  noteBytes: 4_000,
} as const;

/** The link length the UI warns at: safe in mail clients, chat apps and old software. Not a hard limit. */
export const URL_SOFT_LIMIT = 2_048;
/** The link length the UI refuses to share without a warning that some apps will cut it. */
export const URL_HARD_WARN = 8_000;

const encoder = new TextEncoder();
export const utf8Length = (s: string) => encoder.encode(s).length;

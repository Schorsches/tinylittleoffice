/**
 * Byte-level reader and writer: unsigned LEB128 varints, zigzag signed varints, length-prefixed UTF-8.
 * Arithmetic, not bitwise, so values above 2^31 are exact. The reader checks every bound and throws LinkError.
 */
import { LinkError } from './errors.ts';

/** A varint is at most 8 bytes here (values < 2^53). */
const MAX_VARINT_BYTES = 8;
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });

export class ByteWriter {
  private buf = new Uint8Array(256);
  private len = 0;

  private ensure(n: number) {
    if (this.len + n <= this.buf.length) return;
    let size = this.buf.length * 2;
    while (size < this.len + n) size *= 2;
    const next = new Uint8Array(size);
    next.set(this.buf.subarray(0, this.len));
    this.buf = next;
  }

  u8(v: number) {
    this.ensure(1);
    this.buf[this.len++] = v & 0xff;
  }

  uvar(v: number) {
    if (!Number.isSafeInteger(v) || v < 0) throw new RangeError(`uvar: ${v}`);
    while (v >= 0x80) {
      this.u8((v % 0x80) | 0x80);
      v = Math.floor(v / 0x80);
    }
    this.u8(v);
  }

  svar(v: number) {
    if (!Number.isSafeInteger(v)) throw new RangeError(`svar: ${v}`);
    this.uvar(v >= 0 ? v * 2 : -v * 2 - 1);
  }

  str(s: string) {
    const b = encoder.encode(s);
    this.uvar(b.length);
    this.ensure(b.length);
    this.buf.set(b, this.len);
    this.len += b.length;
  }

  bytes(): Uint8Array {
    return this.buf.slice(0, this.len);
  }
}

export class ByteReader {
  private at = 0;
  constructor(private readonly buf: Uint8Array) {}

  get done() {
    return this.at === this.buf.length;
  }

  u8(): number {
    if (this.at >= this.buf.length) throw new LinkError('malformed', 'unexpected end of data');
    return this.buf[this.at++]!;
  }

  uvar(): number {
    let v = 0;
    let mul = 1;
    for (let i = 0; i < MAX_VARINT_BYTES; i++) {
      const b = this.u8();
      v += (b & 0x7f) * mul;
      if (b < 0x80) {
        if (i > 0 && b === 0) throw new LinkError('malformed', 'non-canonical varint');
        return v;
      }
      mul *= 0x80;
    }
    throw new LinkError('malformed', 'varint too long');
  }

  svar(): number {
    const z = this.uvar();
    return z % 2 === 0 ? z / 2 : -(z + 1) / 2;
  }

  str(maxBytes: number): string {
    const n = this.uvar();
    if (n > maxBytes) throw new LinkError('too-large', 'string too long');
    if (this.at + n > this.buf.length) throw new LinkError('malformed', 'unexpected end of data');
    const s = this.buf.subarray(this.at, this.at + n);
    this.at += n;
    try {
      return decoder.decode(s);
    } catch {
      throw new LinkError('malformed', 'invalid UTF-8');
    }
  }
}

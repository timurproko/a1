const MAX_FRAME_BYTES = 2 * 1024 * 1024;
const MAX_DEPTH = 64;

export interface ResidentEnvelope<T = Readonly<Record<string, unknown>>> {
  readonly type: string;
  readonly requestId?: number;
  readonly body: T;
}

/** Generation-1 MessagePack named-map codec. It intentionally supports only bridge-safe values. */
export function encodeResidentFrame(value: ResidentEnvelope): Buffer {
  const payload = Buffer.from(encodeValue(value, 0));
  if (payload.length > MAX_FRAME_BYTES) throw new Error("resident frame exceeds 2 MiB");
  const frame = Buffer.allocUnsafe(payload.length + 4);
  frame.writeUInt32LE(payload.length, 0);
  payload.copy(frame, 4);
  return frame;
}

export function decodeResidentPayload(payload: Uint8Array): ResidentEnvelope {
  if (payload.byteLength > MAX_FRAME_BYTES) throw new Error("resident frame exceeds 2 MiB");
  const state = { bytes: payload, offset: 0 };
  const value = decodeValue(state, 0);
  if (state.offset !== payload.byteLength || !isRecord(value) || typeof value.type !== "string" || !isRecord(value.body)) {
    throw new Error("invalid resident envelope");
  }
  return value as unknown as ResidentEnvelope;
}

export class ResidentFrameDecoder {
  #buffer = Buffer.alloc(0);

  push(chunk: Uint8Array): readonly ResidentEnvelope[] {
    this.#buffer = Buffer.concat([this.#buffer, chunk]);
    const messages: ResidentEnvelope[] = [];
    while (this.#buffer.length >= 4) {
      const length = this.#buffer.readUInt32LE(0);
      if (length > MAX_FRAME_BYTES) throw new Error("resident frame exceeds 2 MiB");
      if (this.#buffer.length < length + 4) break;
      messages.push(decodeResidentPayload(this.#buffer.subarray(4, length + 4)));
      this.#buffer = this.#buffer.subarray(length + 4);
    }
    return messages;
  }
}

function encodeValue(value: unknown, depth: number): number[] {
  if (depth > MAX_DEPTH) throw new Error("resident value exceeds nesting limit");
  if (value === null) return [0xc0];
  if (value === false) return [0xc2];
  if (value === true) return [0xc3];
  if (typeof value === "number" && Number.isSafeInteger(value)) return encodeInteger(value);
  if (typeof value === "string") {
    const bytes = [...Buffer.from(value, "utf8")];
    if (bytes.length < 32) return [0xa0 | bytes.length, ...bytes];
    if (bytes.length <= 0xff) return [0xd9, bytes.length, ...bytes];
    if (bytes.length <= 0xffff) return [0xda, bytes.length >>> 8, bytes.length & 0xff, ...bytes];
    return [0xdb, ...u32(bytes.length), ...bytes];
  }
  if (value instanceof Uint8Array) {
    const bytes = [...value];
    if (bytes.length <= 0xff) return [0xc4, bytes.length, ...bytes];
    if (bytes.length <= 0xffff) return [0xc5, bytes.length >>> 8, bytes.length & 0xff, ...bytes];
    return [0xc6, ...u32(bytes.length), ...bytes];
  }
  if (Array.isArray(value)) {
    const head = value.length < 16 ? [0x90 | value.length] : value.length <= 0xffff ? [0xdc, value.length >>> 8, value.length & 0xff] : [0xdd, ...u32(value.length)];
    return [...head, ...value.flatMap(entry => encodeValue(entry, depth + 1))];
  }
  if (isRecord(value)) {
    const entries = Object.entries(value).filter(([, child]) => child !== undefined);
    const head = entries.length < 16 ? [0x80 | entries.length] : entries.length <= 0xffff ? [0xde, entries.length >>> 8, entries.length & 0xff] : [0xdf, ...u32(entries.length)];
    return [...head, ...entries.flatMap(([key, child]) => [...encodeValue(key, depth + 1), ...encodeValue(child, depth + 1)])];
  }
  throw new Error(`unsupported resident value: ${typeof value}`);
}

function encodeInteger(value: number): number[] {
  if (value >= 0 && value <= 0x7f) return [value];
  if (value < 0 && value >= -32) return [0x100 + value];
  if (value >= 0 && value <= 0xff) return [0xcc, value];
  if (value >= 0 && value <= 0xffff) return [0xcd, value >>> 8, value & 0xff];
  if (value >= -0x80 && value < 0) return [0xd0, value & 0xff];
  if (value >= -0x8000 && value < 0) return [0xd1, (value >>> 8) & 0xff, value & 0xff];
  if (value >= 0 && value <= 0xffffffff) return [0xce, ...u32(value)];
  return [0xd3, ...i64(value)];
}

function decodeValue(state: { bytes: Uint8Array; offset: number }, depth: number): unknown {
  if (depth > MAX_DEPTH) throw new Error("resident value exceeds nesting limit");
  const marker = byte(state);
  if (marker <= 0x7f) return marker;
  if (marker >= 0xe0) return marker - 0x100;
  if ((marker & 0xe0) === 0xa0) return string(state, marker & 0x1f);
  if ((marker & 0xf0) === 0x90) return array(state, marker & 0x0f, depth);
  if ((marker & 0xf0) === 0x80) return map(state, marker & 0x0f, depth);
  switch (marker) {
    case 0xc0: return null;
    case 0xc2: return false;
    case 0xc3: return true;
    case 0xc4: return binary(state, uint(state, 1));
    case 0xc5: return binary(state, uint(state, 2));
    case 0xc6: return binary(state, uint(state, 4));
    case 0xcc: return uint(state, 1);
    case 0xcd: return uint(state, 2);
    case 0xce: return uint(state, 4);
    case 0xcf: return safeInteger(state, false);
    case 0xd0: return signed(state, 1);
    case 0xd1: return signed(state, 2);
    case 0xd2: return signed(state, 4);
    case 0xd3: return safeInteger(state, true);
    case 0xd9: return string(state, uint(state, 1));
    case 0xda: return string(state, uint(state, 2));
    case 0xdb: return string(state, uint(state, 4));
    case 0xdc: return array(state, uint(state, 2), depth);
    case 0xdd: return array(state, uint(state, 4), depth);
    case 0xde: return map(state, uint(state, 2), depth);
    case 0xdf: return map(state, uint(state, 4), depth);
    default: throw new Error(`unsupported resident MessagePack marker 0x${marker.toString(16)}`);
  }
}

function byte(state: { bytes: Uint8Array; offset: number }): number {
  const value = state.bytes[state.offset++];
  if (value === undefined) throw new Error("incomplete resident value");
  return value;
}
function uint(state: { bytes: Uint8Array; offset: number }, width: number): number {
  let value = 0;
  for (let index = 0; index < width; index++) value = value * 256 + byte(state);
  return value;
}
function signed(state: { bytes: Uint8Array; offset: number }, width: number): number {
  const value = uint(state, width);
  return value >= 2 ** (width * 8 - 1) ? value - 2 ** (width * 8) : value;
}
function safeInteger(state: { bytes: Uint8Array; offset: number }, signedValue: boolean): number {
  const high = uint(state, 4); const low = uint(state, 4);
  const value = high * 0x1_0000_0000 + low;
  const resolved = signedValue && high >= 0x80000000 ? value - 0x1_0000_0000_0000_0000 : value;
  if (!Number.isSafeInteger(resolved)) throw new Error("resident integer exceeds JavaScript safe range");
  return resolved;
}
function string(state: { bytes: Uint8Array; offset: number }, length: number): string {
  return Buffer.from(binary(state, length)).toString("utf8");
}
function binary(state: { bytes: Uint8Array; offset: number }, length: number): Uint8Array {
  const end = state.offset + length;
  if (end > state.bytes.byteLength) throw new Error("incomplete resident value");
  const value = state.bytes.slice(state.offset, end); state.offset = end; return value;
}
function array(state: { bytes: Uint8Array; offset: number }, length: number, depth: number): unknown[] {
  if (length > 65_536) throw new Error("resident collection exceeds limit");
  return Array.from({ length }, () => decodeValue(state, depth + 1));
}
function map(state: { bytes: Uint8Array; offset: number }, length: number, depth: number): Record<string, unknown> {
  if (length > 65_536) throw new Error("resident collection exceeds limit");
  const value: Record<string, unknown> = {};
  for (let index = 0; index < length; index++) {
    const key = decodeValue(state, depth + 1);
    if (typeof key !== "string" || Object.hasOwn(value, key)) throw new Error("invalid resident map key");
    value[key] = decodeValue(state, depth + 1);
  }
  return value;
}
function u32(value: number): number[] { return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff]; }
function i64(value: number): number[] {
  const integer = BigInt(value); const encoded = integer < 0 ? (1n << 64n) + integer : integer;
  return Array.from({ length: 8 }, (_, index) => Number((encoded >> BigInt((7 - index) * 8)) & 0xffn));
}
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }

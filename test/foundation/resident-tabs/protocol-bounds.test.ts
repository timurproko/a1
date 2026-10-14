import { describe, expect, it } from "vitest";
import { decodeResidentPayload, encodeResidentFrame, ResidentFrameDecoder } from "../../../src/foundation/resident-tabs/protocol.js";

const MAX_FRAME_BYTES = 2 * 1024 * 1024;

function nested(depth: number): unknown {
  let value: unknown = "leaf";
  for (let index = 0; index < depth; index++) value = [value];
  return value;
}

describe("resident protocol bounds", () => {
  it("refuses a frame header past 2 MiB before buffering its payload", () => {
    const header = Buffer.alloc(4);
    header.writeUInt32LE(MAX_FRAME_BYTES + 1, 0);
    expect(() => new ResidentFrameDecoder().push(header)).toThrow("resident frame exceeds 2 MiB");
    expect(() => decodeResidentPayload(new Uint8Array(MAX_FRAME_BYTES + 1))).toThrow("resident frame exceeds 2 MiB");
  });

  it("refuses to encode a frame past 2 MiB", () => {
    expect(() => encodeResidentFrame({ type: "status", body: { text: "x".repeat(MAX_FRAME_BYTES) } })).toThrow("resident frame exceeds 2 MiB");
  });

  it("refuses nesting past 64 levels", () => {
    expect(() => encodeResidentFrame({ type: "status", body: { value: nested(64) } })).toThrow("nesting limit");
    // Rationale: a hand-built payload of 70 nested fixarrays inside the envelope body.
    const body = [0x81, 0xa1, 0x76, ...Array.from({ length: 70 }, () => 0x91), 0xc0];
    const payload = Uint8Array.from([0x82, 0xa4, ...Buffer.from("type"), 0xa1, 0x73, 0xa4, ...Buffer.from("body"), ...body]);
    expect(() => decodeResidentPayload(payload)).toThrow("nesting limit");
  });

  it("refuses a collection past 65,536 items", () => {
    // Rationale: an array32 header claiming 65,537 entries.
    const payload = Uint8Array.from([0x82, 0xa4, ...Buffer.from("type"), 0xa1, 0x73, 0xa4, ...Buffer.from("body"), 0x81, 0xa1, 0x76, 0xdd, 0x00, 0x01, 0x00, 0x01]);
    expect(() => decodeResidentPayload(payload)).toThrow("resident collection exceeds limit");
  });
});

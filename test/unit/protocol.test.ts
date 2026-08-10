import { describe, expect, it } from "vitest";
import { encodeFrame, LineFrameDecoder, PROTOCOL_VERSION } from "../../src/protocol/messages.js";

describe("additive protocol framing", () => {
  it("decodes partial and combined LF frames", () => {
    const decoder = new LineFrameDecoder();
    const frame = encodeFrame({ type: "client-hello", protocolVersion: PROTOCOL_VERSION, clientId: "ui-1" });
    expect(decoder.push(frame.slice(0, 4))).toEqual([]);
    expect(decoder.push(`${frame.slice(4)}${frame}`)).toHaveLength(2);
  });

  it("retains unknown additive fields", () => {
    const decoder = new LineFrameDecoder();
    expect(decoder.push('{"type":"future-event","newField":true}\n')).toEqual([{ type: "future-event", newField: true }]);
  });
});

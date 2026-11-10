import { describe, expect, it, vi } from "vitest";
import { PendingEngineDelivery } from "../../../../src/integrations/pi/engine/pending-delivery.js";
import type { OwnedUiTranscriptBlock } from "../../../../src/contracts/owned-ui/index.js";
import { assertTranscriptBlock } from "../../../support/owned-ui-contract-fixtures.js";
import { TranscriptImageAssets } from "../../../../src/integrations/pi/engine/transcript-image-assets.js";
import { toolRenderingInput } from "../../../../src/integrations/pi/engine/tool-rendering.js";

const image = { type: "image", mimeType: "image/png", data: "AQID" };

describe("bounded transcript image assets", () => {
  it("shares authoritative image leases and charges retired delivery-only assets", () => {
    const assets = new TranscriptImageAssets();
    const reference = assets.reference({ ...image, data: "AAAA".repeat(2 * 1024 * 1024) }, "tool-result")!;
    const block: OwnedUiTranscriptBlock = { id: "image", kind: "tool-result", status: "finalized", revision: 1,
      title: "image", text: "", payload: {}, imageReferences: [reference] };
    assets.retain(block);
    let current = [block];
    const queue = new PendingEngineDelivery(event => assets.retainEvent(event), () => current, () => assets.pendingBytes);
    for (let sequence = 1; sequence < 20; sequence++) expect(queue.push({ type: "transcript-block", block, sequence, sessionId: "s" }, 1)).toBe(true);
    expect(assets.pendingBytes).toBe(32);
    assets.release(block); current = [];
    expect(assets.pendingBytes).toBeGreaterThan(8 * 1024 * 1024);
    expect(queue.push({ type: "agent-run-started", sequence: 20, sessionId: "s", runId: "r" }, 1)).toBe(false);
    queue.discardObsolete(2);
    expect(assets.pendingBytes).toBe(0);
    expect(assets.resolve(reference.assetId)).toBeNull();
  });

  it("deduplicates assets, counts repeated references, and discards unadmitted data", () => {
    const assets = new TranscriptImageAssets();
    const reference = assets.reference(image, "tool-result")!;
    const original = assets.resolve(reference.assetId);
    const decode = vi.spyOn(Buffer, "from");
    try {
      expect(assets.reference(image, "user")?.assetId).toBe(reference.assetId);
      expect(decode).not.toHaveBeenCalled();
    } finally { decode.mockRestore(); }
    expect(assets.resolve(reference.assetId)).toBe(original);
    const block: OwnedUiTranscriptBlock = { id: "tool", kind: "tool-result", status: "finalized", revision: 1,
      title: "tool", text: "", payload: {}, imageReferences: [reference, reference] };
    assets.retain(block);
    const rejected = assets.reference({ ...image, data: "BAUG" }, "tool-result")!;
    assets.discardUnowned();
    expect(assets.resolve(rejected.assetId)).toBeNull();
    expect(assets.resolve(reference.assetId)).toBe(original);
    assets.release(block);
    expect(assets.resolve(reference.assetId)).toBeNull();
  });

  it("keeps stale delivery releases from touching identical assets in a new generation", () => {
    const assets = new TranscriptImageAssets();
    const reference = assets.reference(image, "tool-result")!;
    const block: OwnedUiTranscriptBlock = { id: "tool", kind: "tool-result", status: "finalized", revision: 1,
      title: "tool", text: "", payload: {}, imageReferences: [reference] };
    const release = assets.retainEvent({ type: "transcript-block", block, sessionId: "session", sequence: 1 });
    assets.clear();
    assets.reference(image, "tool-result");
    assets.retain(block);
    release();
    expect(assets.resolve(reference.assetId)).not.toBeNull();
    assets.release(block);
    expect(assets.resolve(reference.assetId)).toBeNull();
  });

  it("admits the 20 MiB boundary and rejects larger encoded data before decoding", () => {
    const assets = new TranscriptImageAssets();
    const data = Buffer.alloc(20 * 1024 * 1024).toString("base64");
    expect(assets.reference({ ...image, data }, "tool-result")?.byteLength).toBe(20 * 1024 * 1024);
    const decode = vi.spyOn(Buffer, "from");
    try {
      expect(assets.reference({ ...image, data: data + "AAAA" }, "tool-result")).toBeUndefined();
      expect(decode).not.toHaveBeenCalled();
    } finally { decode.mockRestore(); assets.clear(); }
  });

  it("declares invalid and excess attachments without dropping supported text or the operation outcome", () => {
    const assets = new TranscriptImageAssets();
    const payload = { toolCallId: "tool", isError: false };
    const rendering = toolRenderingInput({ args: {}, payload, image: part => assets.reference(part, "tool-result"),
      result: { content: [{ type: "text", text: "KEEP_RESULT" }, { ...image, data: "" }, { ...image, mimeType: "text/plain" },
        ...Array.from({ length: 17 }, () => image), { type: "unsupported" }] } });
    expect(rendering.imageReferences).toHaveLength(16);
    expect(new Set(rendering.imageReferences.map(ref => ref.assetId)).size).toBe(1);
    expect(rendering.toolRendering.unavailable).toContain("Image unavailable");
    expect(rendering.toolRendering.unavailable).toContain("unsupported content part");
    expect(rendering.text).toBe("KEEP_RESULT");
    expect(() => assertTranscriptBlock({ id: "tool", kind: "tool-result", status: "finalized", revision: 1,
      title: "tool", toolState: { argsComplete: true, execution: "succeeded" }, payload, ...rendering })).not.toThrow();
  });
});

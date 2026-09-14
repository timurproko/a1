import { describe, expect, it } from "vitest";
import type { OwnedUiImageAttachment, OwnedUiTranscriptBlock } from "../../../../src/contracts/owned-ui/index.js";
import { createTranscriptImageResolver } from "../../../../src/integrations/pi/components/transcript-image-resolver.js";

const asset: OwnedUiImageAttachment = { type: "image", mimeType: "image/png", data: "AQID" };
function block(...ids: string[]): OwnedUiTranscriptBlock {
  return { id: "tool", kind: "tool-result", status: "finalized", revision: 1, title: "tool", text: "", payload: {},
    imageReferences: ids.map(assetId => ({ assetId, mimeType: "image/png", byteLength: 3, source: "tool-result" })) };
}

describe("mounted transcript image resolver", () => {
  it("retains immutable current images without copying bytes and releases replaced/disposed references", () => {
    const upstream = new Map<string, OwnedUiImageAttachment>([["old", asset], ["new", { ...asset, data: "BAUG" }]]);
    const resolver = createTranscriptImageResolver({ resolve: id => upstream.get(id) ?? null }, block("old", "old"));
    expect(resolver.resolve("old")).toBe(asset);
    expect(resolver.resolve("new")).toBeNull();
    upstream.delete("old");
    resolver.update(block("old"));
    expect(resolver.resolve("old")).toBe(asset);
    resolver.update(block("new"));
    expect(resolver.resolve("old")).toBeNull();
    expect(resolver.resolve("new")).toBe(upstream.get("new"));
    resolver.dispose();
    expect(resolver.resolve("new")).toBeNull();
  });

  it("does not cache an unavailable image forever when the same reference becomes available", () => {
    let available = false;
    const resolver = createTranscriptImageResolver({ resolve: () => available ? asset : null }, block("late"));
    expect(resolver.resolve("late")).toBeNull();
    available = true;
    resolver.update(block("late"));
    expect(resolver.resolve("late")).toBe(asset);
  });
});

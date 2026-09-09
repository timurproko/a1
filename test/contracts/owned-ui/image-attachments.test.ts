import { describe, expect, it } from "vitest";
import { assertOwnedUiCommand, assertPromptImages, MAX_IMAGE_DATA_BYTES, ImageAttachmentError } from "../../../src/contracts/owned-ui/index.js";
import { PromptChipStore } from "../../../src/integrations/pi/session-ui/prompt-chips.js";

const image = (data = "aGk=") => ({ type: "image" as const, data, mimeType: "image/png" });

describe("image admission policy", () => {
  it.each([-4, 0, 4])("enforces the same canonical encoded boundary at offset %s", offset => {
    const data = "A".repeat(MAX_IMAGE_DATA_BYTES + offset);
    const store = new PromptChipStore();
    if (offset > 0) {
      expect(() => assertPromptImages([image(data)])).toThrow("8 MiB");
      expect(() => store.transformPastedContent({ kind: "image", data, mimeType: "image/png" })).toThrow("8 MiB");
    } else {
      const tag = store.transformPastedContent({ kind: "image", data, mimeType: "image/png" });
      expect(store.prepareSubmission(tag).images).toEqual([image(data)]);
      expect(() => assertPromptImages([image(data)])).not.toThrow();
    }
  });

  it.each(["aGk=", "aGk", "aA==", "aA"])("canonicalizes clipboard representation %s without changing bytes", data => {
    const store = new PromptChipStore();
    const tag = store.transformPastedContent({ kind: "image", data, mimeType: "image/png" });
    const attachments = store.prepareSubmission(tag).images;
    expect(() => assertPromptImages(attachments)).not.toThrow();
    expect(Buffer.from(attachments[0]!.data, "base64")).toEqual(Buffer.from(data, "base64"));
  });

  it.each(["", "a", "data:image/png;base64,aA==", "bad!", "aA===", "\0"])("rejects invalid final data %j with a payload-free reason", data => {
    expect(() => assertPromptImages([image(data)])).toThrow(ImageAttachmentError);
  });

  it("limits only the current draft's images, not the chip store history", () => {
    const store = new PromptChipStore();
    let draft = "";
    for (let count = 0; count < 8; count++) draft += store.transformPastedContent({ kind: "image", data: "aA==", mimeType: "image/png" }, draft);
    expect(() => assertPromptImages(store.prepareSubmission(draft).images)).not.toThrow();
    expect(() => store.transformPastedContent({ kind: "image", data: "aA==", mimeType: "image/png" }, draft)).toThrow("at most 8");
    expect(() => assertPromptImages(Array.from({ length: 9 }, () => image()))).toThrow("at most 8");
    expect(store.transformPastedContent({ kind: "image", data: "aA==", mimeType: "image/png" }, "new draft")).toContain("screenshot");
    expect(() => assertOwnedUiCommand({ type: "prompt", correlationId: "test", sessionId: "session", text: "text only" })).not.toThrow();
  });
});

import { describe, expect, it, vi } from "vitest";
import { readSystemClipboardImage } from "../../../../src/integrations/pi/session-ui/system-clipboard.js";

describe("system clipboard images", () => {
  it("prefers binary bytes and emits padded PNG base64", async () => {
    const getImageBase64 = vi.fn(async () => "not-used");
    const image = await readSystemClipboardImage({
      hasImage: () => true,
      getImageBinary: async () => [...Buffer.from("fo")],
      getImageBase64,
    });

    expect(image).toEqual({ data: "Zm8=", mimeType: "image/png" });
    expect(getImageBase64).not.toHaveBeenCalled();
  });

  it("canonicalizes a native binding's unpadded base64 fallback", async () => {
    const image = await readSystemClipboardImage({
      hasImage: () => true,
      getImageBase64: async () => "Zg",
    });

    expect(image).toEqual({ data: "Zg==", mimeType: "image/png" });
  });

  it("rejects unavailable, empty, malformed, and invalid binary images", async () => {
    await expect(readSystemClipboardImage({ hasImage: () => false })).resolves.toBeNull();
    await expect(readSystemClipboardImage({
      hasImage: () => true,
      getImageBinary: async () => [],
      getImageBase64: async () => "",
    })).resolves.toBeNull();
    await expect(readSystemClipboardImage({
      hasImage: () => true,
      getImageBinary: async () => [256],
      getImageBase64: async () => "invalid!",
    })).resolves.toBeNull();
  });
});

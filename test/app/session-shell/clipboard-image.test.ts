import { describe, expect, it } from "vitest";
import { canonicalizeClipboardImage } from "../../../src/app/session-shell/clipboard-image.js";

describe("clipboard image base64", () => {
  it.each([
    ["foo", "Zm9v", "Zm9v"],
    ["f", "Zg", "Zg=="],
    ["fo", "Zm8", "Zm8="],
    ["f", "Zg==", "Zg=="],
    ["fo", "Zm8=", "Zm8="],
  ])("canonicalizes the %s payload from %s", (plain, input, expected) => {
    const canonical = canonicalizeClipboardImage({ data: input, mimeType: "image/png" })?.data;
    expect(canonical).toBe(expected);
    expect(Buffer.from(canonical ?? "", "base64")).toEqual(Buffer.from(plain));
  });

  it.each([
    "",
    "A",
    "Zg=",
    "Zg===",
    "Z=g=",
    "Zg==junk",
    "Zg-_",
    "Z g==",
    "Zg==\n",
    "data:image/png;base64,Zg==",
    "Zh==",
  ])("rejects malformed or non-canonical standard base64 %j", value => {
    expect(canonicalizeClipboardImage({ data: value, mimeType: "image/png" })).toBeNull();
  });

  it("preserves the MIME type and is idempotent", () => {
    const image = canonicalizeClipboardImage({ data: "Zm8", mimeType: "image/webp" });
    expect(image).toEqual({ data: "Zm8=", mimeType: "image/webp" });
    expect(image && canonicalizeClipboardImage(image)).toEqual(image);
  });
});

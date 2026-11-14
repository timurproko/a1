import { describe, expect, it } from "vitest";
import { canonicalPromptChipMatches, imageFilePromptChipTag, imagePromptChipIdentifier } from "../../../src/contracts/owned-ui/index.js";

describe("durable image chip identity", () => {
  it.each([false, true])("keeps filename and identity in an atomic named image (resized=%s)", resized => {
    const tag = imageFilePromptChipTag("Clipboard (2).png", "abcdef0123", resized);
    expect(tag).toBe(`[🖼 Clipboard (2).png #abcdef0123${resized ? "-resized" : ""}]`);
    expect(canonicalPromptChipMatches(`before ${tag} after`)).toEqual([{ text: tag, start: 7, end: 7 + tag.length }]);
    expect(imagePromptChipIdentifier(tag)).toBe("abcdef0123");
  });

  it("sanitizes filename delimiters and terminal controls without losing attachment identity", () => {
    const tag = imageFilePromptChipTag("photo[1]\n\x1b.png", "abc123");
    expect(tag).toBe("[🖼 photo�1���.png #abc123]");
    expect(canonicalPromptChipMatches(tag)).toHaveLength(1);
    expect(imagePromptChipIdentifier(tag)).toBe("abc123");
    expect(imageFilePromptChipTag("x".repeat(1000), "abc123").length).toBeLessThan(300);
  });

  it("retains legacy screenshot identities but not file references or failed attachments", () => {
    expect(imagePromptChipIdentifier("[📷 screenshot-abc123]")).toBe("abc123");
    expect(imagePromptChipIdentifier("[📷 screenshot-abc123-resized]")).toBe("abc123");
    for (const tag of ["[🖼 photo.png]", "[🖼 photo.png #abc123-failed]", "[📷 failed-abc123]", "[🖼 photo.png #not-hex]"]) {
      expect(imagePromptChipIdentifier(tag)).toBeNull();
    }
  });
});

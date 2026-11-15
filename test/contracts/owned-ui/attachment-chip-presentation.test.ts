import { describe, expect, it } from "vitest";
import {
  attachmentPromptChipHiddenRanges,
  canonicalPromptChipMatches,
  compactAttachmentPromptChips,
  imageFilePromptChipTag,
  imagePromptChipIdentifier,
} from "../../../src/contracts/owned-ui/index.js";

describe("attachment chip presentation", () => {
  it.each([
    ["[📷 screenshot-abc123]", "[📷screenshot-abc123]"],
    ["[📷 screenshot-pending]", "[📷screenshot-pending]"],
    ["[📷 screenshot-abc123-resized]", "[📷screenshot-abc123-resized]"],
    ["[📷 failed-abc123]", "[📷failed-abc123]"],
    ["[📷 screenshot-abc123 #/original]", "[📷screenshot-abc123 #/original]"],
    ["[📷 screenshot-abc123/path]", "[📷screenshot-abc123/path]"],
    ["[📷 screenshot-👩‍💻-abc123]", "[📷screenshot-👩‍💻-abc123]"],
    ["[📄 notes.txt]", "[📄notes.txt]"],
    ["[📄 other/notes.txt]", "[📄notes.txt]"],
    ["[📄 C:\\Users\\someone\\notes.txt]", "[📄notes.txt]"],
    ["[📄 plan.md #C:\\Users\\someone\\plan.md]", "[📄plan.md]"],
    ["[📁 /tmp/source folder]", "[📁source folder]"],
    ["[📁 /]", "[📁/]"],
    ["[🖼  Clipboard (1).png]", "[🖼Clipboard (1).png]"],
    ["[🖼️ Clipboard (2).png #abc123]", "[🖼️Clipboard (2).png]"],
    ["[🖼️ 界👩‍💻.png #abc123-resized]", "[🖼️界👩‍💻.png]"],
    ["[🖼️ photo.png #abc123-failed]", "[🖼️photo.png]"],
    ["[📄 report #deadbeef.md]", "[📄report #deadbeef.md]"],
    ["[📄 report\\notes.txt]", "[📄report\\notes.txt]"],
    ["[📄 \\\\server\\share\\notes.txt]", "[📄notes.txt]"],
    ["[🖼️ photo #abc123.png #def456]", "[🖼️photo #abc123.png]"],
    ["[🖼️ photo #abc123 #def456]", "[🖼️photo #abc123]"],
  ])("compacts only presentation bytes: %s", (source, expected) => {
    expect(compactAttachmentPromptChips(source)).toBe(expected);
    expect(compactAttachmentPromptChips(expected)).toBe(expected);
    expect(canonicalPromptChipMatches(expected).map(match => match.text)).toEqual([expected]);
    let projected = source;
    for (const range of [...attachmentPromptChipHiddenRanges(source)].reverse()) {
      projected = projected.slice(0, range.start) + projected.slice(range.end);
    }
    expect(projected).toBe(expected);
  });

  it("leaves URL, text-paste, and ordinary authored labels unchanged", () => {
    const source = "[🔗 https://x.dev][paste #1 1001 chars] [ordinary #abc123 words]";
    expect(compactAttachmentPromptChips(source)).toBe(source);
    expect(attachmentPromptChipHiddenRanges(source)).toEqual([]);
  });

  it("preserves surrounding prose and independently projects adjacent repeated chips", () => {
    const first = "[📄 one/notes.txt]", second = "[📄 two/notes.txt]";
    const source = `before${first}${second} middle ${first}after`;
    expect(compactAttachmentPromptChips(source)).toBe("before[📄notes.txt][📄notes.txt] middle [📄notes.txt]after");
    const ranges = attachmentPromptChipHiddenRanges(source);
    expect(ranges.every((range, index) => range.start < range.end && (index === 0 || ranges[index - 1]!.end <= range.start))).toBe(true);
  });

  it.each(["", "-resized"])("retains backing screenshot identity when compacting %s", suffix => {
    const source = `[📷 screenshot-abc123${suffix}]`;
    expect(imagePromptChipIdentifier(source)).toBe("abc123");
    expect(compactAttachmentPromptChips(source)).toBe(`[📷screenshot-abc123${suffix}]`);
    expect(imagePromptChipIdentifier(source)).toBe("abc123");
  });

  it("keeps mixed adjacent screenshot and file chips independently recognizable", () => {
    const source = "before[📷 screenshot-abc123][📄 one/notes.txt][📷 failed-def456]after";
    const compact = compactAttachmentPromptChips(source);
    expect(compact).toBe("before[📷screenshot-abc123][📄notes.txt][📷failed-def456]after");
    expect(canonicalPromptChipMatches(compact).map(match => match.text)).toEqual([
      "[📷screenshot-abc123]", "[📄notes.txt]", "[📷failed-def456]",
    ]);
  });

  it.each([false, true])("does not rewrite durable image identity (resized=%s)", resized => {
    const tag = imageFilePromptChipTag("photo #123.png", "abcdef0123", resized);
    expect(compactAttachmentPromptChips(tag)).toBe("[🖼️photo #123.png]");
    expect(imagePromptChipIdentifier(tag)).toBe("abcdef0123");
    expect(tag).toBe(`[🖼️ photo #123.png #abcdef0123${resized ? "-resized" : ""}]`);
  });
});

import { describe, expect, it } from "vitest";
import {
  displayWidth,
  emojiPresentation,
  retainPromptChipSource,
  stripAnsi,
  textSelectionText,
} from "../../../src/ui/components/index.js";

function copy(row: string, from = 0, to = displayWidth(row)): string {
  return textSelectionText({ start: { line: 0, column: from }, end: { line: 0, column: to } }, [row]);
}

describe("compact chip selection source", () => {
  it("hides backing identity but restores the whole selected chip", () => {
    const source = "[🖼️ photo.png #abc123]", display = "[🖼️photo.png]";
    const row = retainPromptChipSource(display, source);
    expect(stripAnsi(row)).toBe(display);
    expect(displayWidth(row)).toBe(displayWidth(display));
    expect(copy(row)).toBe(source);
  });

  it("keeps adjacent duplicate labels independently associated with their source", () => {
    const first = "[📄 one/notes.txt]", second = "[📄 two/notes.txt]", display = "[📄notes.txt]";
    const width = displayWidth(display);
    const row = retainPromptChipSource(display, first) + retainPromptChipSource(display, second);
    expect(copy(row, 0, width)).toBe(first);
    expect(copy(row, width, 2 * width)).toBe(second);
    expect(copy(row)).toBe(first + second);
  });

  it("copies partial visible labels without exposing an unselected backing value", () => {
    const row = retainPromptChipSource("[📄notes.txt]", "[📄 private/notes.txt]");
    expect(copy(row, 3, 8)).toBe("notes");
  });

  it("preserves emoji source restoration in surrounding prose and chip punctuation", () => {
    const source = "[🖼️ photo #abc123.png #def456]";
    const row = `${emojiPresentation("ℹ ", true)}${retainPromptChipSource("[🖼️photo #abc123.png]", source)}${emojiPresentation(" ➡", true)}`;
    expect(copy(row)).toBe(`ℹ ${source} ➡`);
  });

  it("retains source through visual truncation and escapes terminal control bytes", () => {
    const source = "[📄 strange\x1b\x07\ud800/notes.txt]";
    const row = retainPromptChipSource("[📄no…]", source);
    expect(stripAnsi(row)).toBe("[📄no…]");
    expect(copy(row)).toBe(source);
  });

  it("ignores malformed private metadata rather than failing a copy", () => {
    const row = "\x1b]a1;chip-source;%invalid\x07[📄notes.txt]\x1b]a1;/chip-source\x07";
    expect(copy(row)).toBe("[📄notes.txt]");
  });
});

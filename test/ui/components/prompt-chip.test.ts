import { describe, expect, it } from "vitest";
import {
  canonicalPromptChipMatches,
  protectPromptChipWrapping,
  replaceCanonicalPromptChips,
} from "../../../src/contracts/owned-ui/index.js";

const canonical = [
  "[paste #1 +136 lines]",
  "[paste #2 1001 chars]",
  "[📷 screenshot-0123456789]",
  "[📁 C:/Git/a1 folder]",
  "[📄 C:/Git/a1/file.txt]",
  "[🖼  Clipboard (1).png]",
  "[🔗 https://example.com/a useful link]",
];

describe("canonical prompt-chip presentation", () => {
  it("finds every canonical chip family without claiming ordinary bracketed text", () => {
    const source = `before ${canonical.join("")} [ordinary words] [paste #x 1001 chars] after`;
    expect(canonicalPromptChipMatches(source).map(match => match.text)).toEqual(canonical);
  });

  it("replaces canonical labels while preserving intervening source text", () => {
    const source = `before ${canonical[2]} middle ${canonical[4]} after`;
    const secondStart = source.indexOf(canonical[4]!);
    expect(replaceCanonicalPromptChips(source, match => `<${match.start}:${match.text}>`))
      .toBe(`before <7:${canonical[2]}> middle <${secondStart}:${canonical[4]}> after`);
  });

  it("protects internal spaces and adjacent boundaries reversibly", () => {
    const source = `prefix ${canonical[2]}${canonical[4]} suffix`;
    const protection = protectPromptChipWrapping(source);
    expect(protection.text).not.toBe(source);
    expect(protection.text).not.toContain("📷 screenshot");
    expect(protection.text).not.toContain("][");
    expect(protection.restore(protection.text)).toBe(source);
  });

  it("does not collide with authored private-use or zero-width characters", () => {
    const source = `\uE000\u2060 before ${canonical[2]} after`;
    const protection = protectPromptChipWrapping(source);
    expect(protection.restore(protection.text)).toBe(source);
  });
});

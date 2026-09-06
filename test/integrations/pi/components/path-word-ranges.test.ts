import { describe, expect, it } from "vitest";
import { promptPathWordRanges } from "../../../../src/integrations/pi/components/path-word-ranges.js";

describe("prompt path word ranges", () => {
  it.each([
    "D:/Git/a1/.worktrees/prevent-windows-nul-artifacts-impl",
    "D:\\Git\\a1\\source-file.ts",
    "\\\\server\\share\\folder\\file.ts",
    "//server/share/folder/file.ts",
    "/usr/local/bin/tool",
    "./src/file.ts",
    ".\\src\\file.ts",
    "../src/file.ts",
    "..\\src\\file.ts",
    "~/src/file.ts",
    "~\\src\\file.ts",
  ])("recognizes the complete explicit path %s", path => {
    expect(promptPathWordRanges(path)).toEqual([{ start: 0, end: path.length }]);
  });

  it.each([
    'open "D:/Project Files/source/file.ts" now',
    "open 'D:/Project Files/source/file.ts' now",
  ])("includes balanced quotes and spaces for %s", line => {
    const start = line.indexOf(line.includes('"') ? '"' : "'");
    const end = line.lastIndexOf(line[start] ?? "") + 1;
    expect(promptPathWordRanges(line)).toEqual([{ start, end }]);
    expect(line.slice(start, end)).toMatch(/^['"]D:\/Project Files\/source\/file\.ts['"]$/u);
  });

  it("returns separate source ranges for multiple paths", () => {
    const line = "copy D:/one/file.ts ../two/file.ts /tmp/three";
    const values = promptPathWordRanges(line).map(range => line.slice(range.start, range.end));

    expect(values).toEqual(["D:/one/file.ts", "../two/file.ts", "/tmp/three"]);
  });

  it.each([
    "alpha-beta",
    "version 1.2.3",
    "https://example.com/path",
    "src/file.ts",
    "C:relative-file.ts",
    '"D:/unterminated path',
    "plain_text",
  ])("does not classify ordinary or ambiguous token %s as a path", line => {
    expect(promptPathWordRanges(line)).toEqual([]);
  });
});

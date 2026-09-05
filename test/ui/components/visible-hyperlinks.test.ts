import { describe, expect, it } from "vitest";
import { readVisibleHyperlinks } from "../../../src/ui/components/visible-hyperlinks.js";
import { overlaySpan } from "../../../src/ui/components/spans.js";
import { truncateToWidth } from "../../../src/ui/components/text.js";

const ESC = "\u001b";
const CLOSE = `${ESC}]8;;${ESC}\\`;
const open = (target: string, parameters = "") => `${ESC}]8;${parameters};${target}${ESC}\\`;

describe("visible hyperlink geometry and host candidates", () => {
  it.each(["\u0007", `${ESC}\\`])("reads parameterized OSC 8 with terminator %j", end => {
    const state = readVisibleHyperlinks(`prefix ${ESC}]8;id=occurrence;file:///work/test.ts${end}label${ESC}]8;;${end} tail`);
    expect(state.replaySafe).toBe(true);
    expect(state.ranges).toEqual([{ from: 7, to: 12, target: "file:///work/test.ts", kind: "explicit" }]);
  });

  it("keeps duplicate occurrences separate across gaps and adjacent opens", () => {
    const link = `${open("https://example.test")}same${CLOSE}`;
    const state = readVisibleHyperlinks(`${link} gap ${link}${link}`);
    expect(state.ranges.map(({ from, to }) => [from, to])).toEqual([[0, 4], [9, 13], [13, 17]]);
  });

  it("counts wide and combining graphemes in display cells through styles", () => {
    const state = readVisibleHyperlinks(`界 ${open("target")}${ESC}[38;2;10;20;30m界e\u0301😀${ESC}[0m${CLOSE}!`);
    expect(state.ranges).toEqual([{ from: 3, to: 8, target: "target", kind: "explicit" }]);
    expect(state.replaySafe).toBe(true);
  });

  it("tracks wrapped segments independently and labels in paint identity", () => {
    const first = readVisibleHyperlinks(`${open("target")}segment one${CLOSE}`);
    const second = readVisibleHyperlinks(`${open("target")}segment two${CLOSE}`);
    expect(first.ranges).toEqual(second.ranges);
    expect(first.signature).not.toBe(second.signature);
    expect(first.signature).toBe(readVisibleHyperlinks(`${open("target")}${ESC}[1msegment one${ESC}[0m${CLOSE}`).signature);
  });

  it.each([
    "https://example.test/path", "file:///C:/work/source.ts", "www.example.test",
    "C:/work/source.ts", "C:\\work\\source.ts", "./src/index.ts", "package.json", "example.test",
  ])("tracks host-detected candidate %s without emitting an OSC target", text => {
    const state = readVisibleHyperlinks(`plain ${text} end`);
    expect(state.ranges).toHaveLength(1);
    expect(state.ranges[0]).toMatchObject({ from: 6, to: 6 + text.length, target: text, kind: "candidate" });
    expect(state.replaySafe).toBe(true);
  });

  it("does not double-count an explicit URL or classify ordinary sentence punctuation", () => {
    expect(readVisibleHyperlinks(`${open("target")}https://example.test/path${CLOSE}`).ranges).toHaveLength(1);
    expect(readVisibleHyperlinks("Plain words, a sentence. More prose!").ranges).toEqual([]);
    expect(readVisibleHyperlinks("$0.000 (sub) 0.0%/22k version 0.84.2").ranges).toEqual([]);
  });

  it.each([
    `${open("target")}unclosed`, `${ESC}]8;;unterminated`, `${ESC}[2Jplain`,
    `${ESC}_Gimage${ESC}\\`, `${ESC}[1;4Hrow move`, "raw\nnewline",
  ])("refuses to authorize replay of unknown or unclosed row content %j", text => {
    expect(readVisibleHyperlinks(text).replaySafe).toBe(false);
  });

  it("audits clipping and overlays for closed target boundaries without SGR underline leakage", () => {
    const source = `a ${open("target")}abcdefgh${CLOSE} tail`;
    const clipped = `${truncateToWidth(source, 6)}${CLOSE}`;
    expect(readVisibleHyperlinks(clipped)).toMatchObject({
      replaySafe: true, ranges: [{ from: 2, to: 6, target: "target", kind: "explicit" }],
    });
    const overlaid = overlaySpan(source, 4, 7, `${ESC}[0mXXX`);
    expect(readVisibleHyperlinks(overlaid)).toMatchObject({ replaySafe: true });
    expect(readVisibleHyperlinks(overlaid).ranges.map(({ from, to }) => [from, to])).toEqual([[2, 4], [7, 10]]);
    expect(overlaid).not.toContain(`${ESC}[4m`);
    expect(overlaid).not.toContain(`${ESC}[4:4m`);
  });
});

import { Editor } from "#pi-tui";
import { afterEach, describe, expect, it } from "vitest";
import { createTuiFacade } from "../../../../src/integrations/pi/components/shell-shared-facade.js";
import { PromptChipStore } from "../../../../src/integrations/pi/session-ui/prompt-chips.js";
import { prepareTextPaste } from "../../../../src/integrations/pi/session-ui/text-paste.js";

const stores: PromptChipStore[] = [];
const store = () => { const value = new PromptChipStore(); stores.push(value); return value; };
afterEach(async () => { await Promise.all(stores.splice(0).map(value => value.dispose())); });
const identity = (text: string) => text;
const theme = { borderColor: identity, selectList: {
  selectedPrefix: identity, selectedText: identity, description: identity, scrollInfo: identity, noMatch: identity,
} };

const cases = [
  ["10 lines", Array(10).fill("line").join("\n")],
  ["11 lines", Array(11).fill("line").join("\n")],
  ["1000 chars", "a".repeat(1000)],
  ["1001 chars", "a".repeat(1001)],
  ["136 lines", Array.from({ length: 136 }, (_, n) => `line ${n}`).join("\n")],
  ["both thresholds", "a".repeat(100).concat("\n").repeat(11)],
  ["CRLF and CR", "one\r\ntwo\r".repeat(6)],
  ["trailing empty line", "line\n".repeat(10)],
  ["tabs below threshold", "\t".repeat(250)],
  ["tabs above threshold", "\t".repeat(250) + "x"],
  ["CSI-u controls", "line\x1b[106;5u".repeat(10) + "\x1b[73;5uend\x01\x00"],
  ["unknown escape", "\x1b[999;5u\x7f" + "x".repeat(1000)],
  ["Unicode boundary", "😀".repeat(500)],
  ["Unicode over boundary", "😀".repeat(500) + "λ"],
  ["combining and ZWJ", "é 👩‍💻 日本語\n".repeat(12)],
] as const;

describe("owned text-paste policy", () => {
  it.each(cases)("matches the pinned editor for %s", (_name, source) => {
    const pinned = new Editor(createTuiFacade({ getColumns: () => 80, getRows: () => 24, requestRender() {} }), theme);
    pinned.handleInput(`\x1b[200~${source}\x1b[201~`);
    const chips = store();
    const label = chips.transformPastedContent({ kind: "text", text: source });
    expect(label).toBe(pinned.getText());
    expect(chips.prepareSubmission(label)).toEqual({ text: pinned.getExpandedText(), images: [] });
    expect(prepareTextPaste(source).text).toBe(pinned.getExpandedText());
  });

  it("keeps unique recoverable records and expands every occurrence without replacement-string interpolation", () => {
    const chips = store();
    const payload = "literal $& $` $' ".repeat(100);
    const first = chips.transformPastedContent({ kind: "text", text: payload });
    const second = chips.transformPastedContent({ kind: "text", text: payload });
    expect(first).toContain("#1 "); expect(second).toContain("#2 ");
    const draft = `before ${first} middle ${second}${first} after`;
    expect(chips.expandCopiedText(draft)).toBe(`before ${payload} middle ${payload}${payload} after`);
    expect(chips.prepareSubmission(draft).images).toEqual([]);
    expect(chips.atomicRanges(first + "[paste #999 1001 chars]")).toEqual([{ start: 0, end: first.length }]);
    chips.resetPastes("");
    expect(chips.prepareSubmission(first).text).toBe(payload);
    expect(chips.transformPastedContent({ kind: "text", text: "z".repeat(1001) })).toContain("#3 ");
  });

  it("keeps emitted payloads opaque to chip resolution and image omission", async () => {
    const chips = store();
    const image = chips.transformPastedContent({ kind: "image", data: "aW1hZ2U=", mimeType: "image/png" });
    const url = chips.transformPastedContent({ kind: "text", text: "https://example.com/" });
    const older = chips.transformPastedContent({ kind: "text", text: "older".repeat(250) });
    const payload = `code ${older} ${image} ${url} [📄 literal] [paste #999 1001 chars]\n`.repeat(11);
    const paste = chips.beginPaste("", async () => ({ kind: "text", text: payload }), () => {});
    const ready = await paste.result;
    for (const token of [ready, paste.marker]) {
      expect(chips.expandCopiedText(token)).toBe(payload);
      expect(chips.prepareHistoryText(token)).toBe(payload.trim());
      expect(chips.prepareSubmission(token)).toEqual({ text: payload, images: [] });
      expect(chips.prepareSubmission(token + image)).toEqual({ text: payload + image, images: [{ type: "image", data: "aW1hZ2U=", mimeType: "image/png" }] });
      expect(chips.prepareHistoryText(token + image)).toBe(payload + image);
    }
    expect(chips.prepareSubmission("[paste #999 1001 chars]").text).toBe("[paste #999 1001 chars]");
  });

  it("preserves long specialized URLs instead of nesting them in text chips", () => {
    const chips = store();
    const url = "https://example.com/" + "a".repeat(1100);
    const token = chips.transformPastedContent({ kind: "text", text: url });
    expect(token).toMatch(/^\[🔗 /u);
    expect(chips.prepareSubmission(token).text).toBe(url);
  });
});

import { describe, expect, it } from "vitest";
import { BracketedPasteFramer } from "../../../../src/integrations/pi/components/bracketed-paste.js";

describe("BracketedPasteFramer", () => {
  it("completes a paste once when its end marker is split across chunks", () => {
    const framer = new BracketedPasteFramer();
    expect(framer.feed("\x1b[200~hello wor")).toBeUndefined();
    expect(framer.open).toBe(true);
    expect(framer.feed("ld\x1b[20")).toBeUndefined();
    expect(framer.feed("1~typed")).toEqual({ text: "hello world", bytes: 0, oversized: false, remaining: "typed" });
    expect(framer.open).toBe(false);
  });

  it("drops the text of a paste beyond its cap and still reports the input after it", () => {
    const framer = new BracketedPasteFramer(4);
    expect(framer.feed("\x1b[200~12345\x1b[201~x")).toEqual({ text: "", bytes: 5, oversized: true, remaining: "x" });
  });

  it("forwards typed input around a dropped paste, holding a split start marker", () => {
    const framer = new BracketedPasteFramer();
    const forwarded: string[] = [];
    const forward = (data: string): void => { forwarded.push(data); };
    expect(framer.discard("before\x1b[2", forward)).toBe(true);
    expect(framer.discard("00~secret\x1b[2", forward)).toBe(true);
    expect(framer.discard("01~after", forward)).toBe(true);
    expect(forwarded).toEqual(["before", "after"]);
    expect(framer.discard("plain", forward)).toBe(false);
    expect(framer.discard("\x1b", forward)).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { LineInput, handleLineInputKey, wordLeft, wordRight } from "../../../src/ui/components/index.js";

const ESC = String.fromCharCode(27);
const BACKSPACE = String.fromCharCode(127);
const CTRL_BACKSPACE = String.fromCharCode(8);
const CTRL_W = String.fromCharCode(23);

const CTRL_LEFT = `${ESC}[1;5D`;
const CTRL_RIGHT = `${ESC}[1;5C`;
const ALT_LEFT = `${ESC}[1;3D`;
const CTRL_DELETE = `${ESC}[3;5~`;
const ALT_BACKSPACE = `${ESC}${BACKSPACE}`;

function typed(text: string, caret = text.length): LineInput {
  const input = new LineInput(text);
  input.moveCaretToStart();
  input.moveCaret(caret);
  return input;
}

describe("word boundaries", () => {
  it("treats a run of one class as one word", () => {
    expect(wordLeft("one two", 7)).toBe(4);
    expect(wordRight("one two", 0)).toBe(3);
  });

  it("skips the whitespace before the word it lands on", () => {
    expect(wordLeft("one   two", 9)).toBe(6);
    expect(wordLeft("one   ", 6)).toBe(0);
  });

  it("counts punctuation as a word of its own", () => {
    expect(wordLeft("a.b", 3)).toBe(2);
    expect(wordRight("a.b", 1)).toBe(2);
  });

  it("stays put at either end", () => {
    expect(wordLeft("word", 0)).toBe(0);
    expect(wordRight("word", 4)).toBe(4);
  });
});

describe("a single-line input", () => {
  it("jumps a word with ctrl and with alt", () => {
    const input = typed("alpha beta gamma");
    handleLineInputKey(input, CTRL_LEFT);
    expect(input.caret).toBe(11);
    handleLineInputKey(input, ALT_LEFT);
    expect(input.caret).toBe(6);
    handleLineInputKey(input, CTRL_RIGHT);
    expect(input.caret).toBe(10);
  });

  it("removes the word before the caret", () => {
    const input = typed("alpha beta");
    handleLineInputKey(input, CTRL_BACKSPACE);
    expect(input.value).toBe("alpha ");
    expect(input.caret).toBe(6);
    handleLineInputKey(input, ALT_BACKSPACE);
    expect(input.value).toBe("");
  });

  it("removes the word after the caret and leaves the caret in place", () => {
    const input = typed("alpha beta", 0);
    handleLineInputKey(input, CTRL_DELETE);
    expect(input.value).toBe(" beta");
    expect(input.caret).toBe(0);
  });

  it("keeps a plain backspace removing one character", () => {
    const input = typed("alpha");
    handleLineInputKey(input, BACKSPACE);
    expect(input.value).toBe("alph");
  });

  it("removes a word with ctrl+w", () => {
    const input = typed("alpha beta");
    handleLineInputKey(input, CTRL_W);
    expect(input.value).toBe("alpha ");
  });

  it("swallows a key it has no answer for rather than typing it", () => {
    const input = typed("alpha");
    for (const sequence of [`${ESC}[5~`, `${ESC}[6~`, `${ESC}[15~`, `${ESC}[1;2A`, `${ESC}OP`, `${ESC}OQ`, `${ESC}[23~`]) {
      handleLineInputKey(input, sequence);
    }
    expect(input.value).toBe("alpha");
  });

  it("does nothing at the ends", () => {
    const start = typed("alpha", 0);
    handleLineInputKey(start, CTRL_BACKSPACE);
    expect(start.value).toBe("alpha");

    const end = typed("alpha");
    handleLineInputKey(end, CTRL_DELETE);
    expect(end.value).toBe("alpha");
  });
});

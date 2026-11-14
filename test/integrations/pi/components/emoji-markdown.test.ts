import { describe, expect, it } from "vitest";
import { stripTerminalSequences, visibleWidth } from "@earendil-works/pi-tui";
import { presentEmojiMarkdown } from "../../../../src/integrations/pi/components/emoji-markdown.js";
import { createPiShellTranscriptComponent } from "../../../../src/integrations/pi/components/index.js";
import { backgroundSgrSpan, composeSubmittedPromptRows, submittedPromptLayout, textSelectionText } from "../../../../src/ui/components/index.js";
import type { OwnedUiTranscriptBlock } from "../../../../src/contracts/owned-ui/index.js";

const all = { start: { line: 0, column: 0 }, end: { line: 0, column: Number.MAX_SAFE_INTEGER } };
const plain = (text: string) => stripTerminalSequences(presentEmojiMarkdown(text));
const source = (text: string) => textSelectionText(all, [text]);
function block(kind: OwnedUiTranscriptBlock["kind"], text: string): OwnedUiTranscriptBlock {
  return { id: "emoji", kind, status: "finalized", revision: 1, title: null, text, payload: {} };
}
const composer = { layout: submittedPromptLayout, compose: composeSubmittedPromptRows };

describe("content-area emoji presentation", () => {
  it.each([
    ["# ℹ **➡** *🖼* ~~⚠~~", "# ℹ️ **➡️** *🖼️* ~~⚠️~~"],
    ["> ℹ\n> ➡", "> ℹ️\n> ➡️"],
    ["- ℹ\n  - ➡\n\n    🖼", "- ℹ️\n  - ➡️\n\n    🖼️"],
    ["| ℹ | ➡ |\n| - | - |\n| 🖼 | ⚠ |", "| ℹ️ | ➡️ |\n| - | - |\n| 🖼️ | ⚠️ |"],
    ["[ℹ](https://example.com/➡) ➡", "[ℹ️](https://example.com/➡) ➡️"],
    ["[ℹ][ref]\n\n[ref]: https://example.com/➡", "[ℹ️][ref]\n\n[ref]: https://example.com/➡"],
    ["ℹ `➡` 🖼\n\n```txt\nℹ ➡\n```\n\n    ℹ\n\n➡", "ℹ️ `➡` 🖼️\n\n```txt\nℹ ➡\n```\n\n    ℹ\n\n➡️"],
    ["> `ℹ` ➡\n> ```\n> 🖼\n> ```", "> `ℹ` ➡️\n> ```\n> 🖼\n> ```"],
    ["https://example.com/➡ C:/images/🖼.png /tmp/ℹ ../➡.txt ➡", "https://example.com/➡ C:/images/🖼.png /tmp/ℹ ../➡.txt ➡️"],
    ["[🖼  ℹ.png] ➡", "[🖼  ℹ.png] ➡️"],
    ["[🖼  Clipboard__ℹ_.png] ➡", "[🖼  Clipboard__ℹ_.png] ➡️"],
    ["![ℹ](image-➡.png) <!-- 🖼 --> ➡", "![ℹ](image-➡.png) <!-- 🖼 --> ➡️"],
    ["ℹ️ ℹ\uFE0E 👩‍💻 1️⃣ 1 # * →", "ℹ️ ℹ\uFE0E 👩‍💻 1️⃣ 1 # * →"],
  ])("normalizes only eligible prose: %s", (input, expected) => {
    expect(plain(input)).toBe(expected);
    expect(source(presentEmojiMarkdown(input))).toBe(input);
  });

  it.each(["user", "assistant", "thinking", "compaction", "custom", "system", "retry", "error"] as const)("applies the shared rule to %s content before layout", kind => {
    const input = block(kind, "➡ ℹ 🖼 ⚠ ✔");
    const component = createPiShellTranscriptComponent(input, process.cwd(), undefined, kind === "user" ? composer : undefined, 0);
    try {
      component.setExpanded(true);
      const rows = component.render(40);
      const text = rows.map(stripTerminalSequences).join("\n");
      expect(text).toContain("➡️ ℹ️ 🖼️ ⚠️ ✔️");
      expect(input.text).toBe("➡ ℹ 🖼 ⚠ ✔");
      const copied = textSelectionText({ ...all, end: { line: rows.length - 1, column: Number.MAX_SAFE_INTEGER } }, rows);
      expect(copied).toContain(input.text);
    } finally { component.dispose?.(); }
  });

  it("keeps new adjacent image chips independently selected at renderer column boundaries", () => {
    const first = "[🖼️ first.png #abc123]", second = "[🖼️ second.png #def456]";
    const width = visibleWidth(first), selected = "\u001b[7m";
    const row = backgroundSgrSpan(first + second, width, width + visibleWidth(second), selected, "\u001b[27m", visibleWidth);
    expect(row).toContain(`${first}${selected}${second}`);
    expect(textSelectionText({ start: { line: 0, column: width }, end: { line: 0, column: width + visibleWidth(second) } }, [row])).toBe(second);
    expect(presentEmojiMarkdown(first + second)).toBe(first + second);
  });

  it("wraps at emoji width and retains source metadata at a row boundary", () => {
    const input = block("assistant", "➡➡➡➡ℹ️");
    const component = createPiShellTranscriptComponent(input, process.cwd(), undefined, undefined, 0);
    try {
      const rows = component.render(4);
      expect(rows.every(row => visibleWidth(row) <= 4)).toBe(true);
      const visible = rows.map(stripTerminalSequences).join("").trim();
      expect(visible).toBe("➡️➡️➡️➡️ℹ️");
      const copied = rows.map(row => source(row).trim()).join("");
      expect(copied).toBe(input.text);
    } finally { component.dispose?.(); }
  });

  it("recomputes presentation as streamed graphemes complete and widths change", () => {
    const initial = { ...block("assistant", "ℹ"), status: "live" as const };
    const component = createPiShellTranscriptComponent(initial, process.cwd(), undefined, undefined, 0);
    try {
      expect(component.render(12).map(stripTerminalSequences).join("")).toContain("ℹ️");
      for (const [index, text] of ["ℹ\uFE0E ➡", "ℹ\uFE0E ➡️ 👩‍", "ℹ\uFE0E ➡️ 👩‍💻"].entries()) {
        component.update({ ...initial, revision: index + 2, text });
        const rows = component.render(8);
        expect(rows.every(row => visibleWidth(row) <= 8)).toBe(true);
        expect(rows.map(row => source(row).trim()).join(" ").replace(/\s+/gu, " ").trim()).toBe(text.trim());
      }
    } finally { component.dispose?.(); }
  });
});

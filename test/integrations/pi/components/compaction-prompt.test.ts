import HeadlessXterm from "@xterm/headless";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { stripTerminalSequences, visibleWidth } from "#pi-tui";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { OwnedUiTranscriptBlock } from "../../../../src/contracts/owned-ui/index.js";
import { createPiShellTranscriptComponent } from "../../../../src/integrations/pi/components/index.js";
import { composeSubmittedPromptRows, formatSubmittedPromptTime, submittedPromptLayout } from "../../../../src/ui/components/index.js";

// Provenance: Pi owns a nested Chalk instance; set its capability explicitly rather than the checkout's copy.
const pinnedRequire = createRequire(new URL("../../../../node_modules/@earendil-works/pi-coding-agent/dist/index.js", import.meta.url));
const { default: chalk } = await import(pathToFileURL(pinnedRequire.resolve("chalk")).href) as typeof import("chalk");
const composer = { layout: submittedPromptLayout, compose: composeSubmittedPromptRows };
const timestamp = new Date(2026, 8, 13, 14, 35, 42).getTime();
const summary: OwnedUiTranscriptBlock = {
  id: "compaction-1", kind: "compaction", status: "finalized", revision: 1,
  title: "Compaction summary", text: "## Goal\n\nKeep **important content**.\n\nLast summary line.",
  payload: { role: "compactionSummary", tokensBefore: 281483, timestamp },
};
const plain = (rows: readonly string[]) => rows.map(stripTerminalSequences);

// Provenance: use the same injected geometry as the custom shell; omission is the comparison route.
function mount(block = summary, owned = true) {
  return createPiShellTranscriptComponent(block, "D:/work", undefined, owned ? composer : undefined);
}

describe("prompt-style compaction presenter", () => {
  let previousLevel = chalk.level;
  beforeEach(() => { previousLevel = chalk.level; chalk.level = 3; });
  afterEach(() => { chalk.level = previousLevel; });

  it("uses ordinary prompt layout without parsing the generated heading as emphasis", async () => {
    const component = mount();
    const rows = component.render(80);
    const text = plain(rows);
    expect(text[0]).toContain("❯ Compacted from 281,483 tokens");
    expect(text[0]).toContain(formatSubmittedPromptTime(timestamp));
    expect(text.join("\n")).toContain("Last summary line.");
    expect(text.join("\n")).not.toMatch(/\[compaction\]|ctrl\+o|expand/i);
    const ordinary = mount({ ...summary, kind: "user", text: `Compacted from 281,483 tokens\n\n${summary.text}` });
    expect(text).toEqual(plain(ordinary.render(80)));

    const terminal = new HeadlessXterm.Terminal({ cols: 80, rows: rows.length + 1, allowProposedApi: true });
    try {
      await new Promise<void>(resolve => terminal.write(rows.map(row => `${row}\u001b[0m`).join("\r\n"), resolve));
      const first = terminal.buffer.active.getLine(0)!;
      const start = text[0]!.indexOf("Compacted");
      for (let column = start; column < start + "Compacted from 281,483 tokens".length; column++) {
        expect(first.getCell(column)!.isBold()).toBe(0);
      }
      const boldRow = text.findIndex(row => row.includes("important content"));
      const boldColumn = text[boldRow]!.indexOf("important content");
      expect(terminal.buffer.active.getLine(boldRow)!.getCell(boldColumn)!.isBold()).not.toBe(0);
    } finally { terminal.dispose(); }
    expect(summary.text).toBe("## Goal\n\nKeep **important content**.\n\nLast summary line.");
  });

  it("ignores expansion while retaining identity and exact source rows", () => {
    const component = mount();
    const rows = component.render(80);
    for (const expanded of [true, false, true, false]) {
      component.setExpanded(expanded);
      expect(component.render(80)).toEqual(rows);
      expect(component.id).toBe(summary.id);
      expect(component.revision).toBe(summary.revision);
    }
  });

  it.each([1, 8, 20, 40, 80, 120])("reuses prompt width and timestamp rules at %i cells", width => {
    const component = mount();
    const before = component.render(80);
    const rows = component.render(width);
    expect(rows.every(row => visibleWidth(row) <= width)).toBe(true);
    const ordinary = mount({ ...summary, kind: "user", text: `Compacted from 281,483 tokens\n\n${summary.text}` });
    if (width > 1) expect(plain(rows)).toEqual(plain(ordinary.render(width)));
    if (submittedPromptLayout(width, timestamp).timestamp === null) {
      expect(plain(rows).join("\n")).not.toContain(formatSubmittedPromptTime(timestamp));
    }
    expect(component.render(80)).toEqual(before);
    component.invalidate();
    expect(component.render(80)).toEqual(before);
  });

  it.each([null, {}, { timestamp: "invalid", tokensBefore: Number.NaN }])("uses safe metadata fallbacks for %j", payload => {
    const component = mount({ ...summary, payload: { ...payload, role: "compactionSummary" } });
    const text = plain(component.render(80)).join("\n");
    expect(text).toContain("Compacted from 0 tokens");
    expect(text).not.toMatch(/NaN|Invalid Date/);
    expect(text).not.toContain(formatSubmittedPromptTime(timestamp));
  });

  it("still expands ordinary tool output alongside an unchanged compaction", () => {
    const component = mount();
    const tool = mount({ ...summary, kind: "tool-result", title: "read",
      text: Array.from({ length: 80 }, (_, i) => `tool line ${i}`).join("\n"),
      payload: { toolName: "read", args: { path: "notes.txt" }, isError: false },
    });
    const sourceRows = component.render(80);
    const collapsed = tool.render(80);
    component.setExpanded(true);
    tool.setExpanded(true);
    expect(component.render(80)).toEqual(sourceRows);
    expect(tool.render(80).length).toBeGreaterThan(collapsed.length);
    tool.setExpanded(false);
    expect(tool.render(80)).toEqual(collapsed);
  });

  it("preserves comparison expansion and excludes branch summaries and unfinished blocks", () => {
    for (const component of [
      mount(summary, false),
      mount({ ...summary, payload: { ...summary.payload as object, role: "branchSummary" } }),
      mount({ ...summary, status: "live" }),
    ]) {
      expect(plain(component.render(80)).join("\n")).toContain("ctrl+o");
      expect(plain(component.render(80)).join("\n")).not.toContain("Last summary line.");
      component.setExpanded(true);
      expect(plain(component.render(80)).join("\n")).toContain("Last summary line.");
    }
  });
});

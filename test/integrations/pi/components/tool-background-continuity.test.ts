import HeadlessXterm from "@xterm/headless";
import { afterEach, describe, expect, it } from "vitest";
import { ToolExecutionComponent as PinnedTool, createEditToolDefinition } from "@earendil-works/pi-coding-agent";
import { Box, Text } from "@earendil-works/pi-tui";
import { ToolExecutionComponent as OwnedTool } from "../../../../src/integrations/pi/components/upstream/components/tool-execution.js";
import { applyPiTheme, piTheme, setPiPackageBorderProjectionEnabled } from "../../../../src/integrations/pi/components/theme.js";
import { createTuiFacade, ensureTheme } from "../../../../src/integrations/pi/components/shell-shared-facade.js";
import { TranscriptViewport } from "../../../../src/ui/components/transcript-viewport.js";
import { stripAnsi } from "../../../../src/ui/components/text.js";
import { presentationSourceSlice } from "../../../../src/ui/components/presentation-source.js";

const ESC = "\u001b";
const diff = `-1 const before = "${ESC}[0m"; tail\n+1 const after = "${ESC}[0m"; tail\n 2 next ${ESC}[49m tail\n 3 nested ${ESC}[48;2;1;2;3mblue${ESC}[49m tail`;
const ui = () => createTuiFacade({ getColumns: () => 80, getRows: () => 40, requestRender() {} });
afterEach(() => setPiPackageBorderProjectionEnabled(true));

async function paint(screen: HeadlessXterm.Terminal, rows: readonly string[]) {
  await new Promise<void>(resolve => screen.write(`${ESC}[?7l${ESC}[2J` + rows.map((row, index) => `${ESC}[${index + 1};1H${row}`).join(""), resolve));
}

async function roleColor(role: "toolPendingBg" | "toolSuccessBg" | "toolErrorBg") {
  const screen = new HeadlessXterm.Terminal({ cols: 1, rows: 1, allowProposedApi: true });
  try {
    await paint(screen, [piTheme().bg(role, "x")]);
    return screen.buffer.active.getLine(0)!.getCell(0)!.getBgColor();
  } finally { screen.dispose(); }
}

describe("tool surface background continuity in emitted terminal cells", () => {
  it.each(["truecolor", "256color"] as const)("repairs actual built-in self-rendered edit diffs in %s across cached, changed, clipped, and resized frames", async mode => {
    ensureTheme();
    applyPiTheme("dark", false, mode);
    const tool = new OwnedTool("edit", "call", { path: "fixture.ts", edits: [] }, {}, undefined, ui(), process.cwd());
    const viewport = new TranscriptViewport();
    viewport.setConfig({ scrollbarAppearance: "always", scrollbarStyle: "thin" });
    const screen = new HeadlessXterm.Terminal({ cols: 80, rows: 24, allowProposedApi: true, scrollback: 0 });
    try {
      const expected = await roleColor("toolSuccessBg");
      for (const width of [80, 40, 80]) {
        screen.resize(width, 24);
        for (const suffix of ["", "", " replaced"]) {
          tool.updateResult({ content: [{ type: "text", text: "done" }], details: { diff: diff + suffix, firstChangedLine: 1 }, isError: false });
          const rows = tool.render(width - 1);
          const frame = viewport.compose({ width, height: 24, documentRows: rows, dockRows: ["editor"], promptAnchors: [] });
          await paint(screen, frame.rows);
          for (const [index, row] of frame.rows.entries()) {
            const plain = stripAnsi(row);
            if (!plain.includes("tail")) continue;
            const line = screen.buffer.active.getLine(index)!;
            expect(line.translateToString(true).trimEnd()).toBe(plain.trimEnd());
            const nested = plain.indexOf("blue");
            for (let column = 0; column < width; column++) {
              const actual = line.getCell(column)!.getBgColor();
              expect(actual, `width ${width}, row ${index}, column ${column}`).toBe(nested >= 0 && column >= nested && column < nested + 4 ? 0x010203 : expected);
            }
            expect(presentationSourceSlice(row, 0, plain.length)).toBe(plain);
          }
          expect(frame.rows.some(row => stripAnsi(row).includes("tail"))).toBe(true);
          expect(viewport.compose({ width, height: 24, documentRows: rows, dockRows: ["editor"], promptAnchors: [] }).rows).toEqual(frame.rows);
        }
      }
    } finally { tool.dispose(); screen.dispose(); }
  });

  it.each(["toolPendingBg", "toolSuccessBg", "toolErrorBg"] as const)("preserves the self renderer's chosen %s instead of guessing its lifecycle role", async role => {
    ensureTheme();
    applyPiTheme("dark", false, "truecolor");
    const definition = {
      renderShell: "self", renderCall: () => {
        const box = new Box(1, 1, text => piTheme().bg(role, text));
        box.addChild(new Text(`head${ESC}[0m tail ${ESC}[48;2;1;2;3mnested${ESC}[49m end`, 0, 0));
        return box;
      },
    } as unknown as ConstructorParameters<typeof OwnedTool>[4];
    const tool = new OwnedTool("self", "call", {}, {}, definition, ui(), process.cwd());
    const screen = new HeadlessXterm.Terminal({ cols: 40, rows: 8, allowProposedApi: true });
    try {
      const expected = await roleColor(role);
      await paint(screen, tool.render(40));
      const row = tool.render(40).findIndex(row => stripAnsi(row).includes("head"));
      const plain = stripAnsi(tool.render(40)[row]!);
      const nested = plain.indexOf("nested");
      for (let column = 0; column < 40; column++) {
        expect(screen.buffer.active.getLine(row)!.getCell(column)!.getBgColor()).toBe(column >= nested && column < nested + 6 ? 0x010203 : expected);
      }
      expect(screen.buffer.active.getLine(row + 1)!.getCell(0)!.getBgColor()).toBe(expected);
    } finally { tool.dispose(); screen.dispose(); }
  });

  it("leaves actual pinned comparison bytes and unrelated extension-owned backgrounds unchanged", () => {
    ensureTheme();
    setPiPackageBorderProjectionEnabled(false);
    const args = { path: "fixture.ts", edits: [] };
    const definition = createEditToolDefinition(process.cwd());
    const owned = new OwnedTool("edit", "call", args, {}, undefined, ui(), process.cwd());
    const pinned = new PinnedTool("edit", "call", args, {}, definition, ui(), process.cwd());
    const result = { content: [{ type: "text" as const, text: "done" }], details: { diff, firstChangedLine: 1 }, isError: false };
    try {
      owned.updateResult(result);
      pinned.updateResult(result);
      expect(owned.render(80)).toEqual(pinned.render(80));
    } finally { owned.dispose(); }
    setPiPackageBorderProjectionEnabled(true);
    const row = `${ESC}[48;2;1;2;3mextension${ESC}[0m tail`;
    const custom = new OwnedTool("custom", "call", {}, {}, { renderShell: "self", renderCall: () => ({ render: () => [row], invalidate() {} }) } as unknown as ConstructorParameters<typeof OwnedTool>[4], ui(), process.cwd());
    try { expect(custom.render(40)).toEqual(["", row]); }
    finally { custom.dispose(); }
  });
});

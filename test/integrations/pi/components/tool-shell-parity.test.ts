import { ToolExecutionComponent as PinnedTool } from "@earendil-works/pi-coding-agent";
import { afterEach, describe, expect, it } from "vitest";
import { getCapabilities, setCapabilities, Text } from "#pi-tui";
import { ToolExecutionComponent as OwnedTool } from "../../../../src/integrations/pi/components/upstream/components/tool-execution.js";
import { createTuiFacade, ensureTheme } from "../../../../src/integrations/pi/components/shell-shared-facade.js";

const caps = getCapabilities();
afterEach(() => setCapabilities(caps));
function pair(name: string, args: unknown, definition?: ConstructorParameters<typeof PinnedTool>[4]) {
  ensureTheme();
  setCapabilities({ ...caps, images: null, hyperlinks: true });
  const ui = createTuiFacade({ getColumns: () => 80, getRows: () => 30, requestRender() {} });
  const params = [name, "call", args, { showImages: true, imageWidthCells: 80 }, definition, ui, process.cwd()] as const;
  return { owned: new OwnedTool(...params), pinned: new PinnedTool(...params) };
}

describe("source-derived tool shell with independent actual pinned renderers", () => {
  it.each([
    ["read", { path: "fixture.ts" }], ["bash", { command: "fixture" }],
    ["edit", { path: "fixture.ts", edits: [] }], ["write", { path: "fixture.ts", content: "new" }],
    ["grep", { pattern: "fixture", path: "." }], ["find", { pattern: "*.ts", path: "." }],
    ["ls", { path: "." }], ["unknown", { option: true }],
  ])("retains %s styling, arguments, partial/final state, expansion and fallback", (name, args) => {
    const { owned, pinned } = pair(String(name), args);
    const check = () => { for (const width of [40, 80, 192]) expect(owned.render(width)).toEqual(pinned.render(width)); };
    check();
    for (const tool of [owned, pinned]) { tool.updateArgs(args); tool.setArgsComplete(); tool.markExecutionStarted(); }
    const content = [{ type: "text" as const, text: "\u001b[31mred\u001b[0m\r\nwide 字🙂\t\u0000\uFFF9" },
      { type: "text" as const, text: Array.from({ length: 20 }, (_, n) => `line ${n}`).join("\n") }];
    for (const partial of [true, false]) {
      for (const tool of [owned, pinned]) tool.updateResult({ content, details: { diff: "-1 old\n+1 new", firstChangedLine: 1 }, isError: !partial }, partial);
      check();
      for (const expanded of [true, false]) {
        for (const tool of [owned, pinned]) { tool.setExpanded(expanded); tool.invalidate(); }
        check();
      }
    }
    owned.dispose();
  });

  it.each(["default", "self"] as const)("preserves extension content, state, and previous components in %s shells", renderShell => {
    const states: unknown[] = [];
    const received: unknown[] = [];
    const definition = {
      name: "extension", renderShell,
      renderCall: (_args: unknown, _theme: unknown, context: { state: unknown; lastComponent?: Text }) => {
        states.push(context.state); return context.lastComponent ?? new Text("CALL", 0, 0);
      },
      renderResult: (result: unknown, _options: unknown, _theme: unknown, context: { state: unknown; lastComponent?: Text }) => {
        received.push(result); return context.lastComponent ?? new Text("RESULT", 0, 0);
      },
    } as unknown as ConstructorParameters<typeof PinnedTool>[4];
    const { owned, pinned } = pair("extension", { keep: true }, definition);
    const result = { content: [{ type: "text" as const, text: "result" }, { type: "image" as const, mimeType: "image/jpeg", data: "AQID" }], details: { retained: true }, isError: false };
    for (const tool of [owned, pinned]) { tool.setArgsComplete(); tool.markExecutionStarted(); tool.updateResult(result, true); }
    expect(owned.render(80)).toEqual(pinned.render(80));
    expect(received).toEqual([{ content: result.content, details: result.details }, { content: result.content, details: result.details }]);
    expect(new Set(states).size).toBe(2);
    owned.invalidate();
    expect(new Set(states).size).toBe(2);
    owned.dispose();
  });
});

import { ToolExecutionComponent as PinnedTool } from "@earendil-works/pi-coding-agent";
import { afterEach, describe, expect, it } from "vitest";
import { getCapabilities, setCapabilities, stripTerminalSequences, Text } from "@earendil-works/pi-tui";
import { mergeBuiltInRenderers, ToolExecutionComponent as OwnedTool } from "../../../../src/integrations/pi/components/upstream/components/tool-execution.js";
import { createBashToolDefinition, createEditToolDefinition, createFindToolDefinition, createGrepToolDefinition, createLsToolDefinition, createReadToolDefinition, createWriteToolDefinition } from "@earendil-works/pi-coding-agent";
import { createTuiFacade, ensureTheme } from "../../../../src/integrations/pi/components/shell-shared-facade.js";
import {
  applyPiTheme,
  piTheme,
  setPiAccentColor,
  setPiPackageBorderProjectionEnabled,
} from "../../../../src/integrations/pi/components/theme.js";

const caps = getCapabilities();
afterEach(() => {
  setCapabilities(caps);
  setPiPackageBorderProjectionEnabled(true);
  setPiAccentColor("purple");
});
function pair(name: string, args: unknown, definition?: ConstructorParameters<typeof OwnedTool>[4]) {
  ensureTheme();
  setCapabilities({ ...caps, images: null, hyperlinks: true });
  const ui = createTuiFacade({ getColumns: () => 80, getRows: () => 30, requestRender() {} });
  const params = [name, "call", args, { showImages: true, imageWidthCells: 80 }, definition, ui, process.cwd()] as const;
  // Rationale: since 0.85.1 the pinned component expects its caller to merge the built-in renderers; the owned copy still does it itself.
  const factories = { read: createReadToolDefinition, bash: createBashToolDefinition, edit: createEditToolDefinition, write: createWriteToolDefinition, grep: createGrepToolDefinition, find: createFindToolDefinition, ls: createLsToolDefinition } as const;
  const builtIn = Object.hasOwn(factories, name) ? factories[name as keyof typeof factories](process.cwd()) : undefined;
  const pinnedParams = [name, "call", args, { showImages: true, imageWidthCells: 80 }, mergeBuiltInRenderers(definition, builtIn), ui, process.cwd()] as const;
  return { owned: new OwnedTool(...params), pinned: new PinnedTool(...pinnedParams) };
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

  it("paints built-in read ranges with the live secondary accent", () => {
    applyPiTheme("dark", false, "truecolor");
    setPiPackageBorderProjectionEnabled(true);
    const { owned } = pair("read", { path: "fixture.ts", offset: 95, limit: 170 });
    const renderedRanges = new Set<string>();
    try {
      for (const color of ["purple", "green"] as const) {
        setPiAccentColor(color);
        owned.invalidate();
        const rendered = owned.render(80).join("\n");
        const range = piTheme().fg("mdHeading", ":95-264");
        expect(rendered).toContain(range);
        expect(rendered).not.toContain(piTheme().fg("warning", ":95-264"));
        renderedRanges.add(range);
      }
      expect(renderedRanges.size).toBe(2);
    } finally {
      owned.dispose();
    }
  });

  it.each([
    [{ path: "fixture.ts", offset: 95 }, "read fixture.ts:95"],
    [{ path: "fixture.ts", limit: 170 }, "read fixture.ts:1-170"],
    [{ path: "skills/example/SKILL.md", offset: 95 }, "[skill] example:95"],
    [{ path: "fixture.ts" }, "read fixture.ts"],
  ])("preserves built-in read range formatting for %j", (args, expected) => {
    const { owned, pinned } = pair("read", args);
    try {
      const ownedRows = owned.render(80).map(stripTerminalSequences);
      const pinnedRows = pinned.render(80).map(stripTerminalSequences);
      expect(ownedRows).toEqual(pinnedRows);
      expect(ownedRows.join("\n")).toContain(expected);
    } finally {
      owned.dispose();
    }
  });

  it("keeps read-result warnings and extension read renderers on their original theme roles", () => {
    applyPiTheme("dark", false, "truecolor");
    setPiPackageBorderProjectionEnabled(true);
    setPiAccentColor("green");
    const warningText = "[Truncated: showing 1 of 2 lines (1 line limit)]";
    const builtIn = pair("read", { path: "fixture.ts", offset: 95, limit: 170 }).owned;
    try {
      builtIn.updateResult({
        content: [{ type: "text", text: "fixture" }],
        details: { truncation: { truncated: true, truncatedBy: "lines", outputLines: 1, totalLines: 2, maxLines: 1 } },
        isError: false,
      });
      builtIn.setExpanded(true);
      const rendered = builtIn.render(80).join("\n");
      expect(rendered).toContain(piTheme().fg("warning", warningText));
      expect(rendered).not.toContain(piTheme().fg("mdHeading", warningText));
    } finally {
      builtIn.dispose();
    }

    const definition = {
      renderCall: (_args: unknown, theme: ReturnType<typeof piTheme>) => new Text(theme.fg("warning", ":95-264"), 0, 0),
    } as unknown as ConstructorParameters<typeof OwnedTool>[4];
    const { owned, pinned } = pair("read", { path: "fixture.ts", offset: 95, limit: 170 }, definition);
    try {
      expect(owned.render(80)).toEqual(pinned.render(80));
      expect(owned.render(80).join("\n")).toContain(piTheme().fg("warning", ":95-264"));
    } finally {
      owned.dispose();
    }
  });

  it("retains exact pinned read-range presentation when the accent projection is disabled", () => {
    applyPiTheme("dark", false, "truecolor");
    setPiPackageBorderProjectionEnabled(false);
    const { owned, pinned } = pair("read", { path: "fixture.ts", offset: 95, limit: 170 });
    try {
      expect(owned.render(80)).toEqual(pinned.render(80));
    } finally {
      owned.dispose();
    }
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
    } as unknown as ConstructorParameters<typeof OwnedTool>[4];
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

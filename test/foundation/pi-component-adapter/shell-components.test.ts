import { stripTerminalSequences } from "@earendil-works/pi-tui";
import { describe, expect, it, vi } from "vitest";
import type { OwnedUiDialog, OwnedUiSessionViewModel, OwnedUiTranscriptBlock } from "../../../src/foundation/owned-ui-contracts/index.js";
import {
  createPiShellDialog,
  createPiShellEditor,
  createPiShellFooter,
  createPiShellHeader,
  createPiShellLoadedResources,
  createPiShellSelector,
  createPiShellStatus,
  PINNED_PI_BUILTIN_SLASH_COMMANDS,
  renderPiShellTranscriptBlock,
} from "../../../src/foundation/pi-component-adapter/index.js";

function block(kind: OwnedUiTranscriptBlock["kind"], text: string, payload: unknown = {}): OwnedUiTranscriptBlock {
  return { id: `${kind}-1`, kind, status: "finalized", revision: 1, title: kind.startsWith("tool") ? "read" : null, text, payload };
}

function view(): OwnedUiSessionViewModel {
  return {
    contractVersion: 1,
    sessionId: "session",
    revision: 1,
    lifecycle: "ready",
    transcript: [],
    editor: { text: "", queuedSubmissions: [], selection: null, cursorOffset: 0, historyRevision: 0, submitEnabled: true },
    status: { title: "Pi", workingMessage: null, diagnostics: [], badges: ["ready"] },
    terminal: { columns: 80, rows: 24, focusedRegion: "editor", hardwareCursor: false },
    activeModel: { providerId: "openai", modelId: "gpt-5", displayName: "GPT-5" },
    thinkingLevel: "medium",
    activeCommandIds: [],
    dialog: null,
    overlay: null,
    customizations: [],
    diagnostics: [],
  };
}

describe("Pi shell public component adapters", () => {
  it("adapts editor input and focus through owned contracts", () => {
    const submit = vi.fn();
    const editor = createPiShellEditor({
      getColumns: () => 80,
      getRows: () => 24,
      requestRender() {},
      onSubmit: submit,
    });
    editor.setFocused?.(true);
    editor.setText("hello");
    editor.handleInput?.("\r");
    expect(submit).toHaveBeenCalledWith("hello");
    expect(editor.render(40).length).toBeGreaterThan(0);
  });

  it("binds the pinned built-in command manifest to public editor autocomplete", async () => {
    expect(PINNED_PI_BUILTIN_SLASH_COMMANDS.map(command => command.name)).toHaveLength(22);
    const editor = createPiShellEditor({
      getColumns: () => 80,
      getRows: () => 24,
      requestRender() {},
      onSubmit() {},
      cwd: "D:/work",
    });
    editor.handleInput?.("/");
    await new Promise(resolve => setTimeout(resolve, 0));
    const rows = editor.render(80).join("\n");
    expect(rows).toContain("settings");
    expect(rows).toContain("model");
    expect(rows).toContain("scoped-models");
  });

  it("uses public message and tool components for all transcript states", () => {
    const fixtures = [
      block("user", "user text"),
      block("assistant", "assistant text"),
      block("thinking", "thinking text"),
      block("tool-call", "", { toolCallId: "tool-1", toolName: "read", arguments: { json: { path: "README.md" } } }),
      block("tool-result", "done", { toolCallId: "tool-1", toolName: "read", arguments: { json: { path: "README.md" } }, isError: false }),
      block("retry", "retrying"),
      block("compaction", "summary", { tokensBefore: 100 }),
      block("error", "failure"),
      block("system", "notice"),
    ];
    for (const fixture of fixtures) {
      const rows = renderPiShellTranscriptBlock(fixture, 60, process.cwd());
      expect(rows.length, fixture.kind).toBeGreaterThan(0);
    }
  });

  it("renders pinned compact and expanded startup resource sections with diagnostics", () => {
    const resources = createPiShellLoadedResources([
      { section: "Context", label: "AGENTS.md", sourcePath: "D:/work/AGENTS.md" },
      { section: "Skills", label: "zeta", sourcePath: "D:/work/.pi/skills/zeta/SKILL.md" },
      { section: "Skills", label: "alpha", sourcePath: "D:/work/.pi/skills/alpha/SKILL.md" },
      { section: "Prompts", label: "/review", sourcePath: "D:/work/.pi/prompts/review.md" },
      { section: "Extensions", label: "probe.ts", sourcePath: "D:/work/.pi/extensions/probe.ts" },
      { section: "Themes", label: "custom", sourcePath: "D:/work/.pi/themes/custom.json" },
      { section: "Extensions", label: "bad.ts", sourcePath: "D:/bad.ts", diagnostic: "load failed" },
    ]);
    const compact = stripTerminalSequences(resources.render(80).join("\n")).replaceAll(/ +$/gm, "");
    expect(compact).toContain("[Context]\n  AGENTS.md");
    expect(compact).toContain("[Skills]\n  alpha, zeta");
    expect(compact).toContain("[Prompts]\n  /review");
    expect(compact).toContain("[Extensions]\n  probe.ts");
    expect(compact).toContain("[Themes]\n  custom");
    expect(compact).toContain("[Extension issues]");
    expect(compact).toContain("load failed");

    resources.setExpanded(true);
    const expanded = stripTerminalSequences(resources.render(80).join("\n")).replaceAll(/ +$/gm, "");
    expect(expanded).toContain("D:/work/.pi/skills/alpha/SKILL.md");
    expect(expanded).toContain("D:/work/.pi/extensions/probe.ts");
  });

  it("adapts selectors, dialogs, and status through public Pi TUI components", () => {
    const selected = vi.fn();
    const selector = createPiShellSelector({ options: [{ id: "one", label: "One" }], onSelect: selected });
    selector.handleInput?.("\r");
    expect(selected).toHaveBeenCalledWith("one");

    const dialog: OwnedUiDialog = { id: "dialog", title: "Choose", kind: "choice", payload: { options: [{ id: "yes", label: "Yes" }] } };
    expect(createPiShellDialog(dialog).render(50).join("\n")).toContain("Choose");
    expect(createPiShellStatus(view()).render(80)).toEqual([]);
    expect(createPiShellFooter(view(), "D:/work").render(80).join("\n")).toContain("gpt-5 • medium");
    expect(createPiShellHeader().render(80).join("\n")).toContain("v0.84.1");
  });
});

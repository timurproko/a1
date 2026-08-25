import { Text, stripTerminalSequences } from "@earendil-works/pi-tui";
import { describe, expect, it, vi } from "vitest";
import type { OwnedUiDialog, OwnedUiSessionViewModel, OwnedUiTranscriptBlock } from "../../../../src/contracts/owned-ui/index.js";
import {
  createPiShellDialog,
  createPiShellEditor,
  createPiShellFooter,
  createPiShellAuthProviderSelector,
  createPiShellHeader,
  createPiShellHotkeys,
  createPiShellLoadedResources,
  createPiShellSettingsSelector,
  createPiShellSelector,
  createPiShellUserMessageSelector,
  createPiShellStatus,
  createPiShellTranscriptComponent,
  PINNED_PI_BUILTIN_SLASH_COMMANDS,
  renderPiShellTranscriptBlock,
} from "../../../../src/integrations/pi/components/index.js";

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

  it("browses pinned prompt history while preserving drafts, duplicates, and multiline movement", () => {
    const editor = createPiShellEditor({
      getColumns: () => 40,
      getRows: () => 24,
      requestRender() {},
      onSubmit() {},
    });
    editor.render(40);
    editor.addToHistory("older prompt");
    editor.addToHistory("newer prompt");
    editor.addToHistory("newer prompt");
    editor.setText("draft");

    editor.handleInput?.("\x1b[A");
    expect(editor.getText()).toBe("draft");
    editor.handleInput?.("\x1b[A");
    expect(editor.getText()).toBe("newer prompt");
    editor.handleInput?.("\x1b[A");
    expect(editor.getText()).toBe("older prompt");
    editor.handleInput?.("\x1b[B");
    expect(editor.getText()).toBe("newer prompt");
    editor.handleInput?.("\x1b[B");
    expect(editor.getText()).toBe("draft");

    editor.setText("first line\nsecond line");
    editor.render(40);
    editor.handleInput?.("\x1b[A");
    expect(editor.getText()).toBe("first line\nsecond line");
    editor.handleInput?.("\x1b[A");
    expect(editor.getText()).toBe("first line\nsecond line");
    editor.handleInput?.("\x1b[A");
    expect(editor.getText()).toBe("newer prompt");
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

  it("adds a source timestamp only to the owned submitted-prompt presentation", () => {
    const source = new Date(2024, 0, 1, 9, 7).getTime();
    const prompt = block("user", "a complete prompt that can wrap", { timestamp: source });
    const pinned = stripTerminalSequences(createPiShellTranscriptComponent(prompt, process.cwd()).render(60).join("\n"));
    const owned = stripTerminalSequences(createPiShellTranscriptComponent(
      prompt,
      process.cwd(),
      undefined,
      { timestampUserPrompts: true },
    ).render(60).join("\n"));
    const narrow = stripTerminalSequences(createPiShellTranscriptComponent(
      prompt,
      process.cwd(),
      undefined,
      { timestampUserPrompts: true },
    ).render(15).join("\n"));

    expect(pinned).not.toContain("09:07");
    expect(owned).toContain("09:07");
    expect(owned).toContain("complete prompt");
    expect(narrow).not.toContain("09:07");
    expect(narrow.replaceAll(/\s+/g, " ")).toContain("complete prompt");
  });

  it("uses extension custom-message and tool renderers with fallback isolation", () => {
    const resolver = {
      getMessageRenderer: (customType: string) => customType === "extension-message"
        ? (() => new Text("extension message renderer", 0, 0))
        : undefined,
      getToolDefinition: (toolName: string) => toolName === "extension-tool" ? {
        name: toolName,
        label: toolName,
        description: "fixture",
        parameters: {},
        execute: async () => ({ content: [] }),
        renderCall: () => new Text("extension tool call", 0, 0),
        renderResult: () => new Text("extension tool result", 0, 0),
      } : undefined,
    };
    const custom = createPiShellTranscriptComponent(block("custom", "fallback", { customType: "extension-message" }), process.cwd(), resolver);
    expect(stripTerminalSequences(custom.render(80).join("\n"))).toContain("extension message renderer");
    const tool = createPiShellTranscriptComponent(block("tool-result", "done", {
      toolCallId: "extension-call", toolName: "extension-tool", arguments: { json: {} }, argsComplete: true,
    }), process.cwd(), resolver);
    expect(stripTerminalSequences(tool.render(80).join("\n"))).toContain("extension tool result");

    const broken = createPiShellTranscriptComponent(block("custom", "fallback survives", { customType: "broken" }), process.cwd(), {
      ...resolver,
      getMessageRenderer: () => (() => { throw new Error("renderer failed"); }),
    });
    expect(stripTerminalSequences(broken.render(80).join("\n"))).toContain("fallback survives");
  });

  it("renders the complete keybinding-derived pinned hotkey tables", () => {
    const rows = stripTerminalSequences(createPiShellHotkeys().render(120).join("\n"));
    expect(rows).toContain("Keyboard Shortcuts");
    expect(rows).toContain("Navigation");
    expect(rows).toContain("Editing");
    expect(rows).toContain("Other");
    expect(rows).toContain("Move cursor / browse history");
    expect(rows).toContain("Run bash command (excluded from context)");
    expect(rows).toContain("Ctrl+O");
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

  it("adapts the pinned settings and specialized workflow selectors with focus-safe cancellation", () => {
    const changed = vi.fn();
    const cancelled = vi.fn();
    const settings = createPiShellSettingsSelector({
      config: {
        autoCompact: true, showImages: true, imageWidthCells: 80, autoResizeImages: true,
        blockImages: false, enableSkillCommands: true, steeringMode: "one-at-a-time", followUpMode: "one-at-a-time",
        transport: "sse", httpIdleTimeoutMs: 300_000, thinkingLevel: "medium",
        availableThinkingLevels: ["off", "minimal", "low", "medium", "high", "xhigh"], currentTheme: "dark",
        terminalTheme: "dark", availableThemes: ["dark", "light"], hideThinkingBlock: false,
        mermaidRenderingMode: "off", showCacheMissNotices: false, collapseChangelog: true,
        enableInstallTelemetry: true, doubleEscapeAction: "tree", treeFilterMode: "default",
        showHardwareCursor: true, editorPaddingX: 0, outputPad: 1, autocompleteMaxVisible: 5,
        quietStartup: false, defaultProjectTrust: "ask", clearOnShrink: false, showTerminalProgress: false,
        tuiMode: "fullscreen", fullscreenExitOutput: "transcript", fullscreenScrollbar: "auto", warnings: { anthropicExtraUsage: true },
      },
      onChange: changed,
      onCancel: cancelled,
    });
    const rows = stripTerminalSequences(settings.render(88).join("\n"));
    expect(rows).toContain("Auto-compact            true");
    expect(rows).toContain("Auto-resize images      true");
    settings.handleInput?.("\x1b[B");
    expect(stripTerminalSequences(settings.render(88).join("\n"))).toContain("(2/29)");
    settings.handleInput?.("\x1b");
    expect(cancelled).toHaveBeenCalledOnce();

    const selected = vi.fn();
    const messages = createPiShellUserMessageSelector([{ id: "entry-1", label: "first prompt" }], selected, cancelled);
    messages.handleInput?.("\r");
    expect(selected).toHaveBeenCalledWith("entry-1");
    const auth = createPiShellAuthProviderSelector("login", [{
      id: "oauth:openai",
      providerId: "openai",
      label: "OpenAI",
      authType: "oauth",
      status: { type: "oauth", source: "stored" },
    }], selected, cancelled);
    expect(stripTerminalSequences(auth.render(80).join("\n"))).toContain("OpenAI ✓ stored");
    auth.handleInput?.("\r");
    expect(selected).toHaveBeenCalledWith("oauth:openai");

    const unconfigured = createPiShellAuthProviderSelector("login", [{
      id: "api_key:anthropic",
      providerId: "anthropic",
      label: "Anthropic",
      authType: "api_key",
    }], selected, cancelled);
    expect(stripTerminalSequences(unconfigured.render(44).join("\n"))).toContain("Anthropic • unconfigured");

    const environment = createPiShellAuthProviderSelector("login", [{
      id: "api_key:anthropic",
      providerId: "anthropic",
      label: "Anthropic",
      authType: "api_key",
      status: { type: "api_key", source: "ANTHROPIC_API_KEY" },
    }], selected, cancelled);
    expect(stripTerminalSequences(environment.render(80).join("\n"))).toContain("Anthropic ✓ env: ANTHROPIC_API_KEY");

    const mismatchedMethod = createPiShellAuthProviderSelector("login", [{
      id: "api_key:openai",
      providerId: "openai",
      label: "OpenAI",
      authType: "api_key",
      status: { type: "oauth", source: "stored" },
    }], selected, cancelled);
    expect(stripTerminalSequences(mismatchedMethod.render(80).join("\n"))).toContain("OpenAI • subscription configured");
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
    expect(createPiShellHeader().render(80).join("\n")).toContain("v0.84.2");
  });
});

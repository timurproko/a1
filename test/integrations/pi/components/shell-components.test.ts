import { VERSION } from "@earendil-works/pi-coding-agent";
import { Text, stripTerminalSequences, visibleWidth } from "@earendil-works/pi-tui";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { OwnedUiDialog, OwnedUiSessionViewModel, OwnedUiTranscriptBlock } from "../../../../src/contracts/owned-ui/index.js";
import { promptInputPresentation } from "../../../support/prompt-input-presentation.js";
import { piTheme } from "../../../../src/integrations/pi/components/theme.js";
import {
  createPiShellDialog,
  createPiShellEditor,
  createPiShellFooter,
  createPiShellAuthProviderSelector,
  createPiShellHeader,
  createPiShellChangelog,
  createPiShellHotkeys,
  createPiShellLoadedResources,
  createPiShellLoginDialog,
  createPiQueuedInputStatus,
  createPiShellSettingsSelector,
  createPiShellSessionInfo,
  createPiShellSelector,
  createPiShellUserMessageSelector,
  createPiShellStatus,
  createPiShellTranscriptComponent,
  PINNED_PI_BUILTIN_SLASH_COMMANDS,
  renderPiShellChangelogLines,
  renderPiShellHotkeySections,
  renderPiShellHotkeysLines,
  renderPiShellTranscriptBlock,
  WorkingStatusIndicator,
} from "../../../../src/integrations/pi/components/index.js";
import { renderPiShellSessionInfoReferenceDocument } from "../../../../src/integrations/pi/components/shell-session-info-reference.js";
import { PINNED_PI_WORKFLOW_COMMAND_NAMES } from "../../../../src/integrations/pi/engine/index.js";
import { composeSubmittedPromptRows, progressStatusFrame, progressStatusText, submittedPromptLayout } from "../../../../src/ui/components/index.js";

function block(kind: OwnedUiTranscriptBlock["kind"], text: string, payload: unknown = {}): OwnedUiTranscriptBlock {
  return { id: `${kind}-1`, kind, status: "finalized", revision: 1, title: kind.startsWith("tool") ? "read" : null, text, payload };
}

const PROMPT_PRESENTATION = promptInputPresentation();

const canonicalProgressStatus = {
  text: (message: string, mode: "pinned" | "custom-viewport") => progressStatusText(message, mode === "pinned" ? "..." : "…"),
  frame: progressStatusFrame,
};

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
  it("matches Pi's queued steering rows and derives the dequeue hint from live bindings", () => {
    let dequeueBinding = "alt+up";
    const queued = createPiQueuedInputStatus(
      ["first", "second\nline"],
      "custom-viewport",
      () => ({ "app.message.dequeue": dequeueBinding as "alt+up" | "ctrl+r" }),
    );
    let rows = queued.render(80).map(row => stripTerminalSequences(row).trimEnd());
    expect(rows).toEqual([
      "",
      " Steering: first",
      " Steering: second ⏎ line",
      ` ↳ ${process.platform === "darwin" ? "Option" : "Alt"}+Up to edit all queued messages`,
    ]);
    dequeueBinding = "ctrl+r";
    rows = queued.render(80).map(row => stripTerminalSequences(row).trimEnd());
    expect(rows.at(-1)).toBe(" ↳ Ctrl+R to edit all queued messages");
  });

  it.each([
    "[paste #1 1001 chars]",
    "[📷 screenshot-0123456789]",
    "[📁 C:/workspace/folder]",
    "[📄 C:/workspace/file.txt]",
    "[🖼  converted-image.png]",
    "[🔗 https://example.com/resource]",
  ])("moves a fitting queued chip intact to its next custom-viewport row: %s", marker => {
    const queued = createPiQueuedInputStatus([`${"x".repeat(70)}${marker}`], "custom-viewport");
    const rows = queued.render(40).map(row => stripTerminalSequences(row).trimEnd());
    expect(rows.filter(row => row.includes(marker))).toHaveLength(1);
    expect(rows.every(row => visibleWidth(row) <= 40)).toBe(true);
  });

  it("keeps adjacent queued chips individually atomic and refreshes wrapping with current queue text", () => {
    const first = "[📷 screenshot-0123456789]";
    const second = "[📄 C:/workspace/file.txt]";
    let dequeueBinding = "alt+up";
    const queued = createPiQueuedInputStatus(
      [`${"x".repeat(70)}${first}${second}${first}${"y".repeat(70)}`],
      "custom-viewport",
      () => ({ "app.message.dequeue": dequeueBinding as "alt+up" | "ctrl+r" }),
    );
    let rows = queued.render(40).map(row => stripTerminalSequences(row).trimEnd());
    expect(rows.filter(row => row.includes(first))).toHaveLength(2);
    expect(rows.filter(row => row.includes(second))).toHaveLength(1);
    // Platform: macOS names Alt "Option", so the same hint exceeds the 38-column content
    // width and wraps at a word boundary like any other Pi text row.
    expect(rows.slice(process.platform === "darwin" ? -2 : -1)).toEqual(process.platform === "darwin"
      ? [" ↳ Option+Up to edit all queued", " messages"]
      : [" ↳ Alt+Up to edit all queued messages"]);

    dequeueBinding = "ctrl+r";
    queued.update([`updated${second}tail`, "[ordinary bracketed text]"]);
    rows = queued.render(40).map(row => stripTerminalSequences(row).trimEnd());
    expect(rows.join("\n")).not.toContain("screenshot-0123456789");
    expect(rows.filter(row => row.includes(second))).toHaveLength(1);
    expect(rows.join("\n")).toContain("[ordinary bracketed text]");
    expect(rows.some(row => row.includes("Ctrl+R to edit all queued messages"))).toBe(true);
  });

  it("ellipsizes an oversized queued chip on one row and leaves pinned queue wrapping unchanged", () => {
    const marker = "[📷 screenshot-👩‍💻-0123456789]";
    const custom = createPiQueuedInputStatus([marker], "custom-viewport");
    const customRows = custom.render(14).map(row => stripTerminalSequences(row).trimEnd());
    expect(customRows.every(row => visibleWidth(row) <= 14)).toBe(true);
    expect(customRows.filter(row => row.includes("…"))).toHaveLength(1);
    expect(customRows.join("\n")).not.toContain("0123456789");
    expect(custom.render(80).map(stripTerminalSequences).some(row => row.includes(marker))).toBe(true);
    expect(custom.render(14).map(stripTerminalSequences).filter(row => row.includes("…"))).toHaveLength(1);

    const fitting = `[📷 screenshot-0123456789]`;
    const pinned = createPiQueuedInputStatus([`${"x".repeat(70)}${fitting}`], "pinned");
    const pinnedRows = pinned.render(40).map(row => stripTerminalSequences(row).trimEnd());
    expect(pinnedRows.some(row => row.includes(fitting))).toBe(false);
    expect(pinnedRows.some(row => row.includes("[📷"))).toBe(true);
    expect(pinnedRows.some(row => row.includes("screenshot-0123456789]"))).toBe(true);
  });

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
    editor.setPaddingX(3);
    editor.setAutocompleteMaxVisible(12);
    expect(editor.getText()).toBe("hello");
    editor.handleInput?.("\r");
    expect(submit).toHaveBeenCalledWith("hello");
    expect(editor.render(40).length).toBeGreaterThan(0);
  });

  it("renders and accepts a bare-A1 contextual suggestion without changing or submitting empty text", () => {
    const submit = vi.fn();
    const accepted = vi.fn();
    const editor = createPiShellEditor({
      getColumns: () => 80,
      getRows: () => 24,
      requestRender() {},
      onSubmit: submit,
      onPromptSuggestionAccepted: accepted,
      keybindingProfile: "a1",
      promptPresentation: PROMPT_PRESENTATION,
    });
    editor.setFocused?.(true);
    editor.setPromptSuggestion("go ahead and merge it");
    const ghost = editor.render(40).join("\n");
    expect(stripTerminalSequences(ghost)).toContain("❯ go ahead and merge it");
    expect(ghost).toContain(piTheme().fg("muted", "❯ "));
    expect(ghost).toContain("\u001b[2m");
    expect(editor.getText()).toBe("");

    editor.handleInput?.("\r");
    expect(submit).not.toHaveBeenCalled();
    expect(editor.getText()).toBe("");

    editor.handleInput?.("\t");
    expect(editor.getText()).toBe("go ahead and merge it");
    expect(accepted).toHaveBeenCalledWith("go ahead and merge it");
    const ordinary = editor.render(40).join("\n");
    expect(stripTerminalSequences(ordinary)).toContain("❯ go ahead and merge it");
    expect(ordinary).not.toContain("\u001b[2mgo ahead and merge it");
    editor.handleInput?.("\r");
    expect(submit).toHaveBeenCalledOnce();
    expect(submit).toHaveBeenCalledWith("go ahead and merge it");
  });

  it("keeps a contextual suggestion behind draft text and repaints it once the draft is cleared", () => {
    const accepted = vi.fn();
    const editor = createPiShellEditor({
      getColumns: () => 80, getRows: () => 24, requestRender() {}, onSubmit() {},
      onPromptSuggestionAccepted: accepted, keybindingProfile: "a1", promptPresentation: PROMPT_PRESENTATION,
    });
    editor.setFocused?.(true);
    editor.setPromptSuggestion("go ahead and merge it");
    editor.setText("draft");
    expect(stripTerminalSequences(editor.render(40).join("\n"))).not.toContain("go ahead and merge it");
    editor.handleInput?.("\t");
    expect(editor.getText()).toBe("draft");
    expect(accepted).not.toHaveBeenCalled();
    editor.setText("");
    expect(stripTerminalSequences(editor.render(40).join("\n"))).toContain("❯ go ahead and merge it");
    editor.handleInput?.("\t");
    expect(editor.getText()).toBe("go ahead and merge it");
    expect(accepted).toHaveBeenCalledOnce();
    expect(editor.render(40).join("\n")).not.toContain("\u001b[2mgo ahead and merge it");
  });

  it("closes autocomplete from a deleted draft before restoring its contextual suggestion", async () => {
    const accepted = vi.fn();
    const editor = createPiShellEditor({
      getColumns: () => 80, getRows: () => 24, requestRender() {}, onSubmit() {},
      onPromptSuggestionAccepted: accepted, keybindingProfile: "a1", promptPresentation: PROMPT_PRESENTATION,
    });
    editor.setFocused?.(true);
    editor.setPromptSuggestion("run the tests");
    editor.handleInput?.("/");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(editor.getText()).toBe("/");
    expect(stripTerminalSequences(editor.render(40).join("\n"))).not.toContain("run the tests");

    editor.handleInput?.("\u0015");
    expect(editor.getText()).toBe("");
    expect(editor.promptSuggestionBlockReason?.()).toBeNull();
    expect(stripTerminalSequences(editor.render(40).join("\n"))).toContain("❯ run the tests");
    editor.handleInput?.("\t");
    expect(editor.getText()).toBe("run the tests");
    expect(accepted).toHaveBeenCalledOnce();
  });

  it("cancels debounced autocomplete from a deleted draft before restoring its contextual suggestion", async () => {
    const getSuggestions = vi.fn(async () => ({ prefix: "@", items: [{ value: "resource", label: "resource" }] }));
    const editor = createPiShellEditor({
      getColumns: () => 80, getRows: () => 24, requestRender() {}, onSubmit() {},
      keybindingProfile: "a1", promptPresentation: PROMPT_PRESENTATION,
    });
    editor.setFocused?.(true);
    editor.addAutocompleteProvider(() => ({
      triggerCharacters: ["@"],
      getSuggestions,
      applyCompletion: () => ({ lines: ["resource"], cursorLine: 0, cursorCol: 8 }),
    }));
    editor.setPromptSuggestion("run the tests");
    editor.handleInput?.("@");
    editor.handleInput?.("\u0015");
    await new Promise(resolve => setTimeout(resolve, 30));

    expect(editor.getText()).toBe("");
    expect(getSuggestions).not.toHaveBeenCalled();
    expect(editor.promptSuggestionBlockReason?.()).toBeNull();
    expect(stripTerminalSequences(editor.render(40).join("\n"))).toContain("❯ run the tests");
  });

  it("reports semantic suggestion presentation blockers without inspecting rendered text", async () => {
    const editor = createPiShellEditor({ getColumns: () => 80, getRows: () => 24, requestRender() {}, onSubmit() {}, keybindingProfile: "a1", promptPresentation: PROMPT_PRESENTATION });
    editor.setFocused?.(true);
    expect(editor.promptSuggestionBlockReason?.()).toBeNull();
    editor.setFocused?.(false);
    expect(editor.promptSuggestionBlockReason?.()).toBe("not-focused");
    editor.setFocused?.(true);
    editor.setSubmitEnabled(false);
    expect(editor.promptSuggestionBlockReason?.()).toBe("not-ready");
    editor.setSubmitEnabled(true);
    editor.setText("draft");
    expect(editor.promptSuggestionBlockReason?.()).toBe("draft");
    editor.setText("");
    editor.addAutocompleteProvider(() => ({
      getSuggestions: () => ({ prefix: "", items: [{ value: "first", label: "first" }, { value: "second", label: "second" }] }),
      applyCompletion: () => ({ lines: ["first"], cursorLine: 0, cursorCol: 5 }),
    }));
    editor.handleInput?.("\t");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(editor.getText()).toBe("");
    expect(editor.promptSuggestionBlockReason?.()).toBe("autocomplete");
    const comparison = createPiShellEditor({ getColumns: () => 80, getRows: () => 24, requestRender() {}, onSubmit() {} });
    comparison.setFocused?.(true);
    expect(comparison.promptSuggestionBlockReason?.()).toBe("prompt-mode");
  });

  it("wraps Unicode suggestion text within the prompt glyph's remaining width", () => {
    const editor = createPiShellEditor({
      getColumns: () => 12,
      getRows: () => 24,
      requestRender() {},
      onSubmit() {},
      keybindingProfile: "a1",
      promptPresentation: PROMPT_PRESENTATION,
    });
    editor.setFocused?.(true);
    editor.setPromptSuggestion("review 日本語 output");
    const rows = editor.render(12);
    expect(rows.every(row => visibleWidth(row) <= 12)).toBe(true);
    expect(stripTerminalSequences(rows.join("\n"))).toContain("❯ review");
    expect(editor.getText()).toBe("");
  });

  it("uses the configured Tab action rather than a raw Tab byte", async () => {
    const agentDir = await mkdtemp(join(tmpdir(), "a1-prompt-suggestion-bindings-"));
    try {
      await writeFile(join(agentDir, "keybindings.json"), JSON.stringify({ "tui.input.tab": "ctrl+r" }));
      const editor = createPiShellEditor({
        getColumns: () => 80,
        getRows: () => 24,
        requestRender() {},
        onSubmit() {},
        keybindingProfile: "a1",
        promptPresentation: PROMPT_PRESENTATION,
        agentDir,
      });
      editor.setFocused?.(true);
      editor.setPromptSuggestion("run the tests");
      editor.handleInput?.("\t");
      expect(editor.getText()).toBe("");
      editor.handleInput?.("\u0012");
      expect(editor.getText()).toBe("run the tests");
    } finally {
      await rm(agentDir, { recursive: true, force: true });
    }
  });

  it("keeps contextual suggestions out of comparison editor rows", () => {
    const editor = createPiShellEditor({ getColumns: () => 80, getRows: () => 24, requestRender() {}, onSubmit() {} });
    editor.setFocused?.(true);
    editor.setPromptSuggestion("run the tests");
    expect(stripTerminalSequences(editor.render(40).join("\n"))).not.toContain("run the tests");
    expect(stripTerminalSequences(editor.render(40).join("\n"))).not.toContain("❯");
  });

  it("gives autocomplete precedence over contextual suggestion Tab acceptance", async () => {
    const editor = createPiShellEditor({
      getColumns: () => 80,
      getRows: () => 24,
      requestRender() {},
      onSubmit() {},
      keybindingProfile: "a1",
      promptPresentation: PROMPT_PRESENTATION,
      cwd: "D:/work",
    });
    editor.setFocused?.(true);
    editor.setPromptSuggestion("run the tests");
    editor.handleInput?.("/");
    await new Promise(resolve => setTimeout(resolve, 0));
    editor.handleInput?.("\t");
    expect(editor.getText()).toMatch(/^\/[a-z-]+/);
    expect(editor.getText()).not.toBe("run the tests");
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
    // Invariant: the editor catalog lists exactly the routes the shell runs, in their order. A count
    // here only records how many there were when it was written, and went stale when `thinking` landed.
    expect(PINNED_PI_BUILTIN_SLASH_COMMANDS.map(command => command.name)).toEqual([...PINNED_PI_WORKFLOW_COMMAND_NAMES]);
    expect(PINNED_PI_BUILTIN_SLASH_COMMANDS.find(command => command.name === "quit")).toEqual({
      name: "quit",
      description: "Quit",
    });
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

  it("omits thinking and login argument hints only from bare-A1 command rows", async () => {
    const options = {
      getColumns: () => 100,
      getRows: () => 24,
      requestRender() {},
      onSubmit() {},
      cwd: "D:/work",
    };
    const bare = createPiShellEditor({
      ...options,
      keybindingProfile: "a1",
      promptPresentation: PROMPT_PRESENTATION,
      autocompleteCommands: [
        {
          name: "login",
          description: "Configure provider authentication",
          argumentOptions: [{ id: "openai", label: "OpenAI" }],
          source: "builtin",
        },
        { name: "deploy", description: "Deploy extension", argumentHint: "<environment>", source: "extension" },
      ],
    });
    const comparison = createPiShellEditor({ ...options, keybindingProfile: "pi" });
    const selectedRow = async (editor: ReturnType<typeof createPiShellEditor>, input: string, label: string): Promise<string> => {
      editor.setText("");
      for (const character of input) editor.handleInput?.(character);
      await new Promise(resolve => setTimeout(resolve, 0));
      const row = editor.render(100).map(stripTerminalSequences)
        .find(line => line.trimStart().startsWith(`→ ${label}`));
      expect(row).toBeDefined();
      return row!.trimEnd();
    };

    const bareThinking = await selectedRow(bare, "/thinking", "thinking");
    expect(bareThinking).toMatch(/→ thinking\s+Set thinking level$/u);
    expect(bareThinking).not.toContain("<level>");
    expect(bareThinking).not.toContain("—");
    const bareLogin = await selectedRow(bare, "/login", "login");
    expect(bareLogin).toMatch(/→ login\s+Configure provider authentication$/u);
    expect(bareLogin).not.toContain("<provider>");
    expect(bareLogin).not.toContain("—");
    expect(await selectedRow(bare, "/deploy", "deploy")).toContain("<environment> — Deploy extension");

    bare.setText("");
    for (const character of "/login ") bare.handleInput?.(character);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(bare.render(100).map(stripTerminalSequences).join("\n")).toContain("OpenAI");
    bare.handleInput?.("\t");
    expect(bare.getText()).toBe("/login openai");

    expect(await selectedRow(comparison, "/thinking", "thinking")).toContain("<level> — Set thinking level");
    expect(await selectedRow(comparison, "/login", "login")).toContain("<provider> — Configure provider authentication");
  });

  it("keeps selected autocomplete descriptions muted only in bare A1", async () => {
    const options = {
      getColumns: () => 80,
      getRows: () => 24,
      requestRender() {},
      onSubmit() {},
    };
    const bare = createPiShellEditor({
      ...options,
      keybindingProfile: "a1",
      promptPresentation: PROMPT_PRESENTATION,
    });
    bare.setAutocompleteCommands([{ name: "deploy", description: "Deploy extension", source: "extension" }]);
    bare.handleInput?.("/");
    await new Promise(resolve => setTimeout(resolve, 0));

    const accentStart = piTheme().fg("accent", "MARK").split("MARK")[0]!;
    const mutedStart = piTheme().fg("muted", "MARK").split("MARK")[0]!;
    const selectedRow = (editor: ReturnType<typeof createPiShellEditor>, width: number, label: string): string => {
      const row = editor.render(width)
        .map(line => line.replaceAll(/\u001b\[2?7m/gu, ""))
        .find(line => stripTerminalSequences(line).trimStart().startsWith(`→ ${label}`));
      expect(row).toBeDefined();
      return row!;
    };
    const expectSplitRoles = (row: string, label: string, description: string): void => {
      const selected = row.slice(row.indexOf(`→ ${label}`));
      expect(row).toContain(`${accentStart}→ ${label}`);
      expect(selected).toContain(mutedStart);
      expect(stripTerminalSequences(selected.slice(selected.indexOf(mutedStart)))).toMatch(new RegExp(`^\\s+${description}`, "u"));
      expect(selected.slice(selected.indexOf(mutedStart))).not.toContain(accentStart);
    };

    expectSplitRoles(selectedRow(bare, 80, "settings"), "settings", "Open settings menu");
    bare.handleInput?.("\u001b[B");
    expectSplitRoles(selectedRow(bare, 80, "models"), "models", "Switch models and manage scoped model cycling");
    bare.handleInput?.("\u001b");
    bare.setText("");
    bare.handleInput?.("/dep");
    await new Promise(resolve => setTimeout(resolve, 0));
    expectSplitRoles(selectedRow(bare, 80, "deploy"), "deploy", "Deploy extension");
    const narrow = selectedRow(bare, 40, "deploy");
    expect(stripTerminalSequences(narrow)).not.toContain("Deploy extension");
    expect(narrow.slice(narrow.indexOf("→ deploy"))).not.toContain(mutedStart);

    const comparison = createPiShellEditor({ ...options, keybindingProfile: "pi" });
    comparison.setAutocompleteCommands([{ name: "deploy", description: "Deploy extension", source: "extension" }]);
    comparison.handleInput?.("/dep");
    await new Promise(resolve => setTimeout(resolve, 0));
    const pinnedRow = selectedRow(comparison, 80, "deploy");
    const pinned = pinnedRow.slice(pinnedRow.indexOf("→ deploy"));
    expect(pinnedRow).toContain(`${accentStart}→ deploy`);
    expect(stripTerminalSequences(pinned)).toMatch(/→ deploy\s+Deploy extension/u);
    expect(pinned).not.toContain(mutedStart);
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

  it("hides derived resize guidance only in the bare-A1 submitted-prompt presenter", () => {
    const marker = "[📷 screenshot-0123456789]";
    const note = "[Image: original 3840x2280, displayed at 2000x1188. Multiply coordinates by 1.92 to map to original image.]";
    const imageBlock: OwnedUiTranscriptBlock = {
      ...block("user", `inspect ${marker}\n\n${note}`, { role: "user", timestamp: 1_000 }),
      userPresentation: { visibleText: `inspect ${marker}` },
      imageReferences: [{ assetId: "image-1", mimeType: "image/png", byteLength: 128, source: "user" }],
    };
    const pinned = createPiShellTranscriptComponent(imageBlock, process.cwd(), undefined, undefined, 1, false, "off", false, 40,
      { resolve: () => null });
    const composer = { layout: submittedPromptLayout, compose: composeSubmittedPromptRows };
    const bare = createPiShellTranscriptComponent(imageBlock, process.cwd(), undefined, composer,
      1, false, "off", false, 40, { resolve: () => null });
    const pinnedText = stripTerminalSequences(pinned.render(120).join("\n"));
    const bareText = stripTerminalSequences(bare.render(120).join("\n"));
    expect(pinnedText).toContain(marker);
    expect(pinnedText).toContain(note);
    expect(bareText).toContain("inspect");
    expect(bareText).toContain(marker);
    expect(bareText).not.toContain(note);
    expect(bareText).toContain("Image hidden: image/png");
  });

  it("moves every fitting prompt-chip family intact to a submitted-prompt continuation row", () => {
    const composer = { layout: submittedPromptLayout, compose: composeSubmittedPromptRows };
    const prefix = "123456789012345678901234567890";
    const chips = [
      "[paste #1 1001 chars]",
      "[📷 screenshot-0123456789]",
      "[📁 C:/repo]",
      "[📄 C:/repo/file.txt]",
      "[🖼  Clipboard.png]",
      "[🔗 https://x.dev]",
    ];
    for (const chip of chips) {
      const source = block("user", `${prefix.repeat(5)}${chip}suffix`);
      const component = createPiShellTranscriptComponent(source, process.cwd(), undefined, composer,
        1, false, "off", false, 40, { resolve: () => null });
      const rawRows = component.render(40);
      const rows = rawRows.map(row => stripTerminalSequences(row).trimEnd());
      expect(rows.filter(row => row.includes(chip)), chip).toHaveLength(1);
      expect(rows.find(row => row.includes(chip)), chip).toContain(chip);
      expect(rawRows.every(row => visibleWidth(row) <= 40), chip).toBe(true);
      expect(source.text).toBe(`${prefix.repeat(5)}${chip}suffix`);
    }
  });

  it("keeps adjacent chips independently whole and preserves URL links and pinned rendering", () => {
    const composer = { layout: submittedPromptLayout, compose: composeSubmittedPromptRows };
    const folder = "[📁 C:/one]", file = "[📄 C:/two]";
    const adjacent = createPiShellTranscriptComponent(block("user", `${folder}${file}`), process.cwd(), undefined, composer,
      1, false, "off", false, 20, { resolve: () => null });
    const adjacentRows = adjacent.render(20).map(row => stripTerminalSequences(row).trimEnd());
    expect(adjacentRows.filter(row => row.includes(folder))).toHaveLength(1);
    expect(adjacentRows.filter(row => row.includes(file))).toHaveLength(1);

    const chip = "[🔗 https://x.dev]";
    const linkedBlock = block("user", `123456789012345 ${chip}`, { timestamp: 1_000 });
    const linked = createPiShellTranscriptComponent(linkedBlock,
      process.cwd(), undefined, composer, 1, false, "off", false, 32, { resolve: () => null }).render(32);
    const pinnedLinked = renderPiShellTranscriptBlock(linkedBlock, 32, process.cwd());
    const linkOpen = "\u001b]8;;https://x.dev";
    expect(linked.some(row => stripTerminalSequences(row).includes(chip))).toBe(true);
    expect(linked.join("\n").includes(linkOpen)).toBe(pinnedLinked.join("\n").includes(linkOpen));

    const screenshot = "[📷 screenshot-0123456789]";
    const source = block("user", `${"1".repeat(30)} ${screenshot}`);
    const bareRows = createPiShellTranscriptComponent(source, process.cwd(), undefined, composer,
      1, false, "off", false, 40, { resolve: () => null }).render(40).map(stripTerminalSequences);
    const pinnedRows = renderPiShellTranscriptBlock(source, 40, process.cwd()).map(stripTerminalSequences);
    expect(bareRows.some(row => row.includes(screenshot))).toBe(true);
    expect(pinnedRows.some(row => row.includes(screenshot))).toBe(false);

    const ordinary = "[ordinary words]";
    const ordinaryRows = createPiShellTranscriptComponent(block("user", `${"1".repeat(24)} ${ordinary}`),
      process.cwd(), undefined, composer, 1, false, "off", false, 40, { resolve: () => null })
      .render(40).map(row => stripTerminalSequences(row));
    expect(ordinaryRows.some(row => row.includes(ordinary))).toBe(false);
  });

  it("ellipsizes an oversized submitted chip on one row while keeping its complete source", () => {
    const composer = { layout: submittedPromptLayout, compose: composeSubmittedPromptRows };
    const chip = "[📷 screenshot-0123456789-extra-long-label]";
    const source = block("user", chip);
    const component = createPiShellTranscriptComponent(source, process.cwd(), undefined, composer,
      1, false, "off", false, 14, { resolve: () => null });
    const rows = component.render(14);
    const visible = rows.map(row => stripTerminalSequences(row).trimEnd());
    expect(visible.filter(row => row.includes("…"))).toHaveLength(1);
    expect(visible.join("\n")).not.toContain("0123456789");
    expect(rows.every(row => visibleWidth(row) <= 14)).toBe(true);
    expect(component.render(80).map(stripTerminalSequences).some(row => row.includes(chip))).toBe(true);
    expect(component.render(14).map(stripTerminalSequences).filter(row => row.includes("…"))).toHaveLength(1);
    expect(source.text).toBe(chip);
  });

  it("renders safe transcript-image placeholders for hidden and unavailable assets", () => {
    const imageBlock = {
      ...block("user", "image prompt"),
      imageReferences: [{ assetId: "image-1", mimeType: "image/png", byteLength: 128, source: "user" as const }],
    };
    const component = createPiShellTranscriptComponent(
      imageBlock, process.cwd(), undefined, undefined, 1, false, "off", false, 40,
      { resolve: () => null },
    );
    expect(stripTerminalSequences(component.render(80).join("\n"))).toContain("Image hidden: image/png");
    component.setImagePresentation(true, 40);
    expect(stripTerminalSequences(component.render(80).join("\n"))).toContain("Image unavailable: image/png");
  });

  it("uses an optional submitted-image preview without changing retained attachment data", async () => {
    const imageBlock = {
      ...block("user", "image prompt"),
      imageReferences: [{ assetId: "image-1", mimeType: "image/png", byteLength: 3, source: "user" as const }],
    };
    const source = { type: "image" as const, mimeType: "image/png", data: "AQID" };
    const preview = vi.fn(() => ({
      result: Promise.resolve({ rows: ["\u001b[38;2;255;0;0;48;2;0;0;0m▀\u001b[0m"] }),
      cancel: vi.fn(),
    }));
    const changed = vi.fn();
    const component = createPiShellTranscriptComponent(
      imageBlock, process.cwd(), undefined, undefined, 1, false, "off", true, 40,
      { resolve: () => source, preview }, { getColumns: () => 80, getRows: () => 24, changed },
    );
    expect(stripTerminalSequences(component.render(80).join("\n"))).toContain("preparing preview");
    await vi.waitFor(() => expect(changed).toHaveBeenCalledOnce());
    expect(stripTerminalSequences(component.render(80).join("\n"))).toContain("▀");
    expect(preview).toHaveBeenCalledWith("image-1", source, 40, expect.objectContaining({ widthPx: expect.any(Number) }));
    expect(source.data).toBe("AQID");
    component.dispose?.();
  });

  it("rebuilds finalized and streaming assistant presentation for thinking and Mermaid modes", () => {
    const mixed = createPiShellTranscriptComponent(block("assistant", "fallback", {
      content: [{ type: "thinking", thinking: "private chain" }, { type: "text", text: "public answer" }],
    }), process.cwd());
    expect(stripTerminalSequences(mixed.render(80).join("\n"))).toContain("private chain");
    mixed.setHideThinkingBlock(true);
    const hidden = stripTerminalSequences(mixed.render(80).join("\n"));
    expect(hidden).not.toContain("private chain");
    expect(hidden).toContain("public answer");

    const diagramText = "```mermaid\ngraph TD\nA-->B\n```";
    const finalized = createPiShellTranscriptComponent(block("assistant", diagramText), process.cwd());
    expect(stripTerminalSequences(finalized.render(80).join("\n"))).toContain("graph TD");
    finalized.setMermaidRenderingMode("final");
    expect(stripTerminalSequences(finalized.render(80).join("\n"))).not.toContain("graph TD");

    const liveBlock = { ...block("assistant", diagramText), status: "live" as const };
    const streaming = createPiShellTranscriptComponent(liveBlock, process.cwd());
    streaming.setMermaidRenderingMode("final");
    expect(stripTerminalSequences(streaming.render(80).join("\n"))).toContain("graph TD");
    streaming.setMermaidRenderingMode("streaming");
    expect(stripTerminalSequences(streaming.render(80).join("\n"))).not.toContain("graph TD");
  });

  it("rebuilds existing transcript presentation for live output padding without changing identity", () => {
    const component = createPiShellTranscriptComponent(block("error", "failure"), process.cwd());
    const identity = component.id;
    const revision = component.revision;
    expect(stripTerminalSequences(component.render(60)[0] ?? "").startsWith(" ")).toBe(true);
    component.setOutputPad(0);
    expect(component.id).toBe(identity);
    expect(component.revision).toBe(revision);
    expect(stripTerminalSequences(component.render(60)[0] ?? "").startsWith("Error:")).toBe(true);
  });

  it("uses extension custom-message and tool renderers with fallback isolation", () => {
    const resolver = {
      getMessageRenderer: (customType: string) => customType === "extension-message"
        ? (() => new Text("extension message renderer", 0, 0))
        : undefined,
      getToolRenderers: (toolName: string) => toolName === "extension-tool" ? {
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

  it("derives session reference preamble and sections from the pinned report values", () => {
    const presentation = {
      sessionName: "Parity fixture",
      stats: {
        sessionFile: "D:/sessions/parity.jsonl", sessionId: "session-1", userMessages: 2,
        assistantMessages: 2, toolCalls: 1, toolResults: 1, totalMessages: 6,
        tokens: { input: 100, output: 20, cacheRead: 300, cacheWrite: 50, total: 470 }, cost: 0.125,
      },
      cacheWaste: { missedTokens: 2048, missedCost: 0.002, missCount: 1 },
      usageBreakdown: [
        { key: "openai/gpt-5", cost: 0.1, tokens: 400 },
        { key: "Tools/summaries", cost: 0.025, tokens: 70 },
      ],
      cacheWarming: {
        mode: "streaming",
        status: {
          state: "scheduled" as const,
          decision: {
            phase: "idle" as const, action: "warm", warmCost: 0.01, missCost: 0.2,
            continuationProbability: 0.5, expectedSavings: 0.1, economicsAvailable: true,
          },
        },
      },
    };
    const reference = renderPiShellSessionInfoReferenceDocument(presentation, 100);
    expect(reference.sections.map(section => section.title)).toEqual(["Messages", "Tokens", "Cache Warming", "Cost"]);
    expect(reference.sections.every(section => !section.title.includes("\u001b"))).toBe(true);
    const preamble = stripTerminalSequences(reference.preamble.join("\n"));
    expect(preamble).toMatch(/Name: Parity fixture\s*\n\s*File: D:\/sessions\/parity\.jsonl\s*\n\s*ID: session-1/);
    const grouped = stripTerminalSequences(reference.sections.flatMap(section => section.rows).join("\n"));
    expect(grouped).toMatch(/Total: 6\s*\n\s*User: 2\s*\n\s*Assistant: 2\s*\n\s*Tools: 1 calls, 1 results/);
    expect(grouped).toMatch(/Input: 450\s*\n\s*Cached: 300 \(66\.7%\)\s*\n\s*Uncached: 150 \(50 written to cache\)/);
    expect(grouped).toContain("Status: Decision now (50% continuation probability, expected savings 0.100 >= 0.050 -> warm)");
    expect(grouped).toContain("Cache miss penalty: $0.200");
    expect(grouped).toContain("Refresh cost: $0.010");
    expect(grouped).toContain("Cache Re-billed: $0.002 (2,048 tokens, 1 miss)");

    const pinned = stripTerminalSequences(createPiShellSessionInfo(presentation).render(100).join("\n"));
    expect(pinned).toMatch(/Session Info\s*\n\s*\n\s*Name: Parity fixture/);
    expect(pinned).toMatch(/Cache Warming\s*\n\s*Mode: streaming/);
    expect(pinned).toContain("Status: Decision now (50% continuation probability, expected savings 0.100 >= 0.050 -> warm)");

    const { sessionName: _sessionName, ...unnamedPresentation } = presentation;
    const minimal = renderPiShellSessionInfoReferenceDocument({
      ...unnamedPresentation,
      stats: { ...presentation.stats, cost: 0 },
      cacheWaste: { missedTokens: 0, missedCost: 0, missCount: 0 },
      usageBreakdown: [],
    }, 100);
    expect(stripTerminalSequences(minimal.preamble.join("\n"))).not.toContain("Name:");
    expect(minimal.sections.map(section => section.title)).toEqual(["Messages", "Tokens", "Cache Warming"]);
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

  it("reports prompt and content boundaries only in owned hotkey tables", () => {
    const owned = stripTerminalSequences(createPiShellHotkeys(undefined, undefined, "a1").render(120).join("\n"));
    const pinned = stripTerminalSequences(createPiShellHotkeys().render(120).join("\n"));
    for (const [key, action] of [["Home", "Start of prompt line"], ["End", "End of prompt line"], ["Ctrl+Home", "Start of content"], ["Ctrl+End", "End of content / follow output"]]) {
      const row = owned.split("\n").find(line => line.includes(action!));
      expect(row).toContain(key);
      if (action!.includes("prompt")) expect(row).not.toContain("Ctrl+Home");
      if (action!.includes("prompt")) expect(row).not.toContain("Ctrl+End");
    }
    expect(pinned).not.toContain("Start of content");
    expect(pinned.split("\n").find(line => line.includes("Start of line"))).toContain("Home/Ctrl+A");
    expect(pinned.split("\n").find(line => line.includes("End of line"))).toContain("End/Ctrl+E");
  });

  it.each([80, 120])("renders the reference screen rows as the in-feed documents minus their chrome at %i columns", width => {
    // Rationale: the feed document is spacer, border, heading, spacer, Markdown rows, border; the
    // screen shows exactly the Markdown rows.
    const markdown = ["## 0.85.1", "", "- **Fixed selection rendering** in the [docs](docs/README.md)", `- Long entry ${"word ".repeat(40)}`].join("\n");
    const feed = createPiShellChangelog(markdown).render(width);
    expect(stripTerminalSequences(feed[2] ?? "")).toContain("What's New");
    const changelog = renderPiShellChangelogLines(markdown, width);
    expect(changelog.length).toBeGreaterThan(2);
    expect(changelog).toEqual(feed.slice(4, feed.length - 1));
    expect(stripTerminalSequences(changelog.join("\n"))).toContain("Fixed selection rendering");
    expect(changelog.every(row => visibleWidth(row) <= width)).toBe(true);
    expect(renderPiShellChangelogLines("   ", width).map(stripTerminalSequences).join("\n")).toContain("No changelog entries found.");

    const shortcuts = () => [{ key: "ctrl+alt+p", description: "Probe extension" }];
    const hotkeysFeed = createPiShellHotkeys(undefined, shortcuts, "a1").render(width);
    expect(stripTerminalSequences(hotkeysFeed[2] ?? "")).toContain("Keyboard Shortcuts");
    const sections = renderPiShellHotkeySections({ getShortcuts: shortcuts, profile: "a1" }, width);
    expect(sections.map(section => section.title)).toEqual(["Navigation", "Editing", "Other", "Models dialog", "Extensions"]);
    for (const section of sections) expect(stripTerminalSequences(section.rows[0] ?? "").trim()).not.toBe("");
    const plain = stripTerminalSequences(sections.flatMap(section => section.rows).join("\n"));
    expect(plain).toContain("Start of content");
    expect(plain).toContain("Probe extension");
    expect(plain).not.toContain("Keyboard Shortcuts");
    // Compatibility: the comparison profile retains the exact in-feed Markdown rows.
    expect(renderPiShellHotkeysLines({}, width)).toEqual(createPiShellHotkeys().render(width).slice(4, -1));
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
        transport: "sse", httpIdleTimeoutMs: 300_000, cacheWarmingMode: "streaming", thinkingLevel: "medium", modelThinkingLevels: {}, defaultModel: "not set", availableDefaultModels: [], fullscreenCopyOnSelect: false,
        availableThinkingLevels: ["off", "minimal", "low", "medium", "high", "xhigh"], currentTheme: "dark",
        terminalTheme: "dark", availableThemes: ["dark", "light"], hideThinkingBlock: false,
        mermaidRenderingMode: "off", showCacheMissNotices: false, collapseChangelog: true,
        enableInstallTelemetry: true, doubleEscapeAction: "tree", treeFilterMode: "default",
        showHardwareCursor: true, editorPaddingX: 0, outputPad: 1, autocompleteMaxVisible: 5,
        quietStartup: false, defaultProjectTrust: "ask", clearOnShrink: false, showTerminalProgress: false,
        tuiMode: "fullscreen", fullscreenExitOutput: "transcript", fullscreenScrollbar: "auto", fullscreenWheelScrollLines: "auto", warnings: { anthropicExtraUsage: true },
      },
      onChange: changed,
      onCancel: cancelled,
    });
    const rows = stripTerminalSequences(settings.render(88).join("\n"));
    expect(rows).toMatch(/Auto-compact\s+true/);
    expect(rows).toMatch(/Auto-resize images\s+true/);
    settings.handleInput?.("\x1b[B");
    expect(stripTerminalSequences(settings.render(88).join("\n"))).toContain("(2/32)");
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
    const authRows = auth.render(80).map(stripTerminalSequences);
    expect(authRows[1]?.trimEnd()).toBe(" Select provider to configure:");
    expect(authRows.join("\n")).toContain("OpenAI ✓ stored");
    auth.handleInput?.("\r");
    expect(selected).toHaveBeenCalledWith("oauth:openai");

    const login = createPiShellLoginDialog(
      { getColumns: () => 80, getRows: () => 24, requestRender: vi.fn() },
      "openai",
      vi.fn(),
    );
    const loginRows = login.render(80).map(stripTerminalSequences);
    expect(loginRows[1]?.trimEnd()).toBe(" Login to openai");

    const unconfigured = createPiShellAuthProviderSelector("login", [{
      id: "api_key:anthropic",
      providerId: "anthropic",
      label: "Anthropic",
      authType: "api_key",
    }], selected, cancelled);
    expect(stripTerminalSequences(unconfigured.render(44).join("\n"))).toContain("Anthropic • not configured");

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

  it("applies one injected formatter to every spinner-backed status source", () => {
    for (const [message, expected] of [
      ["Working", "Working..."],
      ["Retrying", "Retrying..."],
      ["Compacting", "Compacting..."],
    ] as const) {
      const candidate = view();
      const status = createPiShellStatus({
        ...candidate,
        lifecycle: "busy",
        status: { ...candidate.status, workingMessage: message, badges: ["busy"] },
      }, canonicalProgressStatus);
      try {
        expect(status.placement()).toBe("live");
        expect(status.renderDock(80)).toEqual([]);
        expect(stripTerminalSequences(status.renderLive(80).join("\n"))).toContain(expected);
        expect(status.render(80)).toEqual(status.renderLive(80));
      } finally {
        status.dispose?.();
      }
    }

    const candidate = view();
    const extension = createPiShellStatus({
      ...candidate,
      lifecycle: "busy",
      status: { ...candidate.status, workingMessage: "Working", badges: ["busy"] },
    }, canonicalProgressStatus);
    try {
      for (const [message, expected] of [
        ["Indexing sources", "Indexing sources..."],
        ["Legacy extension…", "Legacy extension..."],
        ["Legacy extension......", "Legacy extension..."],
      ] as const) {
        extension.setWorkingOverride(message);
        const rendered = stripTerminalSequences(extension.renderLive(80).join("\n"));
        expect(extension.placement()).toBe("live");
        expect(rendered).toContain(expected);
        expect(rendered).not.toContain("…");
        expect(rendered).not.toContain("....");
      }
    } finally {
      extension.dispose?.();
    }
  });

  it("shows measured compaction progress beside the working word in bare A1 only and updates the spinner in place", () => {
    const candidate = view();
    const busy = (progress: number | null, message = "Compacting") => ({
      ...candidate,
      lifecycle: "busy" as const,
      status: { ...candidate.status, workingMessage: message, workingProgress: progress, badges: ["busy"] },
    });
    const status = createPiShellStatus(busy(0), canonicalProgressStatus);
    try {
      expect(stripTerminalSequences(status.renderLive(80).join("\n"))).toContain("Compacting...");
      status.setProgressPresentation("custom-viewport");
      expect(stripTerminalSequences(status.renderLive(80).join("\n"))).toContain("Compacting(0%)…");
      const live = status.renderLive(80);
      status.update(busy(37));
      expect(stripTerminalSequences(status.renderLive(80).join("\n"))).toContain("Compacting(37%)…");
      expect(status.renderLive(80)).toHaveLength(live.length);
      status.update(busy(99));
      expect(stripTerminalSequences(status.renderLive(80).join("\n"))).toContain("Compacting(99%)…");
      status.update(busy(100));
      expect(stripTerminalSequences(status.renderLive(80).join("\n"))).toContain("Compacting(100%)…");
      status.update(busy(37, "Working"));
      expect(stripTerminalSequences(status.renderLive(80).join("\n"))).toContain("Working(37%)…");
      status.update(busy(null));
      expect(stripTerminalSequences(status.renderLive(80).join("\n"))).toContain("Compacting…");
      expect(stripTerminalSequences(status.renderLive(80).join("\n"))).not.toContain("%");
      status.update(busy(80));
      status.setWorkingOverride("Indexing sources");
      expect(stripTerminalSequences(status.renderLive(80).join("\n"))).toContain("Indexing sources…");
      expect(stripTerminalSequences(status.renderLive(80).join("\n"))).not.toContain("%");
      status.setWorkingOverride(undefined);
      status.setProgressPresentation("pinned");
      expect(stripTerminalSequences(status.renderLive(80).join("\n"))).toContain("Compacting...");
      expect(stripTerminalSequences(status.renderLive(80).join("\n"))).not.toContain("%");
    } finally {
      status.dispose?.();
    }
  });

  it("keeps extension working overrides semantic and never scrollable after completion", () => {
    const candidate = view();
    const status = createPiShellStatus({
      ...candidate,
      lifecycle: "busy",
      status: { ...candidate.status, workingMessage: "Working", badges: ["busy"] },
    }, canonicalProgressStatus);
    try {
      status.setWorkingOverride("Indexing sources");
      expect(status.placement()).toBe("live");
      expect(stripTerminalSequences(status.renderLive(80).join("\n"))).toContain("Indexing sources...");
      expect(status.renderDock(80)).toEqual([]);

      const hiddenOverride = view();
      status.update(hiddenOverride);
      expect(status.placement()).toBe("hidden");
      expect(status.renderLive(80)).toEqual([]);
      expect(status.renderDock(80)).toEqual([]);

      const plain = { ...hiddenOverride, status: { ...hiddenOverride.status, workingMessage: "Plain status…" } };
      status.update(plain);
      expect(status.placement()).toBe("dock");
      expect(status.renderLive(80)).toEqual([]);
      expect(stripTerminalSequences(status.renderDock(80).join("\n")).trim()).toBe("Plain status…");

      const failed = {
        ...plain,
        lifecycle: "failed" as const,
        status: { ...plain.status, workingMessage: null, diagnostics: ["Failure…"] },
      };
      status.update(failed);
      expect(status.placement()).toBe("dock");
      expect(status.renderLive(80)).toEqual([]);
      expect(stripTerminalSequences(status.renderDock(80).join("\n")).trim()).toBe("Failure…");
    } finally {
      status.dispose?.();
    }
  });

  it("preserves synchronized spinner frames, ANSI roles, geometry, and non-spinner text", () => {
    const candidate = view();
    const runtime = { getColumns: () => 40, getRows: () => 24, requestRender() {} };
    const owned = createPiShellStatus({
      ...candidate,
      lifecycle: "busy",
      status: { ...candidate.status, workingMessage: "Working", badges: ["busy"] },
    }, canonicalProgressStatus, runtime);
    const synchronized = new WorkingStatusIndicator(
      { requestRender() {}, invalidate() {}, terminal: { kittyProtocolActive: false } } as never,
      "Working...",
    );
    try {
      expect(owned.render(40)).toEqual(synchronized.render(40));
    } finally {
      owned.dispose?.();
      synchronized.dispose();
    }

    const untouched = {
      text: vi.fn(canonicalProgressStatus.text),
      frame: vi.fn(canonicalProgressStatus.frame),
    };
    const failed = createPiShellStatus({
      ...candidate,
      lifecycle: "failed",
      status: { ...candidate.status, diagnostics: ["Failure…"], workingMessage: null },
    }, untouched);
    const nonSpinner = createPiShellStatus({
      ...candidate,
      status: { ...candidate.status, workingMessage: "Plain status…" },
    }, untouched);
    try {
      expect(failed.placement()).toBe("dock");
      expect(failed.renderLive(80)).toEqual([]);
      expect(nonSpinner.placement()).toBe("dock");
      expect(nonSpinner.renderLive(80)).toEqual([]);
      expect(createPiShellStatus(view(), canonicalProgressStatus).placement()).toBe("hidden");
      expect(stripTerminalSequences(failed.renderDock(80).join("\n")).trim()).toBe("Failure…");
      expect(stripTerminalSequences(nonSpinner.renderDock(80).join("\n")).trim()).toBe("Plain status…");
      expect(untouched.text).not.toHaveBeenCalled();
      expect(untouched.frame).not.toHaveBeenCalled();
    } finally {
      failed.dispose?.();
      nonSpinner.dispose?.();
    }
  });

  it("adapts selectors, dialogs, and status through public Pi TUI components", () => {
    const selected = vi.fn();
    const selector = createPiShellSelector({ options: [{ id: "one", label: "One" }], onSelect: selected });
    selector.handleInput?.("\r");
    expect(selected).toHaveBeenCalledWith("one");

    const dialog: OwnedUiDialog = { id: "dialog", title: "Choose", kind: "choice", payload: { options: [{ id: "yes", label: "Yes" }] } };
    expect(createPiShellDialog(dialog).render(50).join("\n")).toContain("Choose");
    expect(createPiShellStatus(view(), canonicalProgressStatus).render(80)).toEqual([]);
    expect(createPiShellFooter(view(), "D:/work").render(80).join("\n")).toContain("gpt-5 • medium");
    const routed = { ...view(), routedModel: {
      model: { providerId: "anthropic", modelId: "claude-sonnet", displayName: "Claude Sonnet" },
      thinkingLevel: "high" as const,
    } };
    expect(createPiShellFooter(routed, "D:/work").render(80).join("\n")).toContain("gpt-5 • medium → claude-sonnet • high");
    expect(createPiShellHeader().render(80).join("\n")).toContain(`v${VERSION}`);
  });
});

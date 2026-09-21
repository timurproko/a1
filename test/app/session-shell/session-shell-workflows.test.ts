import { join } from "node:path";
import { stripTerminalSequences } from "@earendil-works/pi-tui";
import { describe, expect, it, onTestFailed, onTestFinished, vi } from "vitest";
// Performance: this integration file exercises real cold emitted entries; dedicated tests retain source-loader coverage.
vi.mock("../../../src/app/session-shell/paste-executor.js", async importOriginal => {
  const actual = await importOriginal<typeof import("../../../src/app/session-shell/paste-executor.js")>();
  const { coldPasteHelper } = await import("../../support/cold-clipboard-entries.js");
  return { ...actual, startPasteExecutor: (...args: Parameters<typeof actual.startPasteExecutor>) =>
    actual.startPasteExecutor(args[0], args[1], args[2], coldPasteHelper(args[3])) };
});
vi.mock("node:worker_threads", async importOriginal => {
  const actual = await importOriginal<typeof import("node:worker_threads")>();
  const { coldClipboardWorker } = await import("../../support/cold-clipboard-entries.js");
  return { ...actual, Worker: class extends actual.Worker {
    constructor(entry: string | URL, options?: import("node:worker_threads").WorkerOptions) {
      const selected = coldClipboardWorker(entry, options);
      super(selected.entry, selected.options);
    }
  } };
});
import { piTheme } from "../../../src/integrations/pi/components/index.js";
import { cellStyle } from "../../support/ansi-cell-style.js";
import { Session, fixture, nextImmediate } from "./session-shell-fixture.js";

describe("OwnedUiSessionShell dialogs and workflows", () => {
  it("uses the resolved bare-A1 thinking shortcut and styled heading without changing the comparison profile", async () => {
    const bare = await fixture([], [], true);
    await bare.shell.submit("/thinking");
    const rows = bare.shell.root.render(100);
    const plain = rows.map(stripTerminalSequences).join("\n");
    expect(plain).toContain("Ctrl+L cycles thinking levels in-session");
    expect(plain).not.toContain("Shift+Tab");
    expect(plain).toContain("medium Moderate reasoning (~8k tokens)");
    expect(plain.match(/Moderate reasoning/g)).toHaveLength(1);
    const heading = rows.find(row => stripTerminalSequences(row).includes("Thinking Level"))!;
    expect(cellStyle(heading, "T")).toEqual(cellStyle(piTheme().fg("accent", piTheme().bold("T")), "T"));
    const selectedRow = rows.find(row => stripTerminalSequences(row).includes("Moderate reasoning"))!;
    expect(cellStyle(selectedRow, "M")).toEqual(cellStyle(piTheme().fg("muted", "M"), "M"));
    expect(cellStyle(selectedRow, "✓")).toEqual(cellStyle(piTheme().fg("success", "✓"), "✓"));
    bare.terminal.input("\x1b");
    expect(bare.shell.root.usesDefaultInputSurface()).toBe(true);
    await bare.shell.dispose();

    const comparison = await fixture();
    await comparison.shell.submit("/thinking");
    const comparisonFrame = comparison.shell.root.render(100).map(stripTerminalSequences).join("\n");
    expect(comparisonFrame).toContain("Shift+Tab cycles thinking levels in-session");
    expect(comparison.shell.root.editor.keybindingConfig()["app.thinking.cycle"]).toBe("shift+tab");
    await comparison.shell.dispose();
  });

  it("preserves deep settings submenus, theme mode nesting, and parent restoration", async () => {
    const { terminal, shell } = await fixture();
    const frame = () => stripTerminalSequences(shell.root.render(100).join("\n"));

    await shell.submit("/settings");
    terminal.input("theme");
    terminal.input("\r");
    expect(frame()).toContain("Select a theme, or choose Automatic to follow terminal appearance.");
    terminal.input("\x1b[A");
    terminal.input("\r");
    expect(frame()).toContain("Automatic Theme");
    expect(frame()).toContain("Light theme");
    terminal.input("\r");
    expect(frame()).toContain("Light Theme");
    expect(frame()).toContain("Select the theme to use for light terminal appearance");
    terminal.input("\x1b");
    expect(frame()).toContain("Automatic Theme");
    terminal.input("\x1b");
    expect(frame()).toContain("Type to search · Enter/Space to change · Esc to cancel");
    expect(frame()).toContain("> theme");
    terminal.input("\x1b");

    await shell.submit("/settings");
    // Rationale: 0.85.1 keeps thinking levels per model behind a stepped submenu; the global level is a /thinking command.
    terminal.input("per model");
    terminal.input("\r");
    expect(frame()).toContain("Per-Model Thinking Level");
    expect(frame()).toContain("Select a model to configure");
    terminal.input("\x1b");
    terminal.input("\x1b");

    await shell.submit("/settings");
    terminal.input("warnings");
    terminal.input("\r");
    expect(frame()).toContain("Anthropic extra usage");
    terminal.input("\x1b");
    terminal.input("\x1b");
    expect(frame()).not.toContain("Auto-compact");
    await shell.dispose();
  });

  it("keeps /settings open while agent lifecycle and status events arrive", async () => {
    const { engine, shell } = await fixture();
    await shell.submit("/settings");
    expect(shell.root.usesDefaultInputSurface()).toBe(false);

    engine.session.emit({ type: "agent_start" });
    await shell.backend.flushEvents();
    expect(shell.root.usesDefaultInputSurface()).toBe(false);

    engine.session.emit({ type: "agent_settled" });
    await shell.backend.flushEvents();
    expect(shell.root.usesDefaultInputSurface()).toBe(false);
    await shell.dispose();
  });

  it("keeps scoped-model changes session-only until Ctrl+S and leaves the modal open", async () => {
    const { engine, terminal, shell } = await fixture();
    await shell.submit("/scoped-models");
    expect(shell.root.render(100).join("\n")).toContain("Model Configuration");
    expect(shell.root.render(100).join("\n")).toContain("Ctrl+S");

    terminal.input("\r");
    const dirtyFrame = shell.root.render(100).join("\n");
    expect(dirtyFrame).toContain("Model Configuration");
    expect(dirtyFrame).toContain("(unsaved)");
    expect(engine.session.calls).toContain("scoped:1");
    expect(engine.enabledModels).toBeUndefined();

    terminal.input("\x13");
    const savedFrame = shell.root.render(100).join("\n");
    expect(savedFrame).toContain("Model Configuration");
    expect(savedFrame).toContain("Model selection saved to settings");
    expect(savedFrame).not.toContain("(unsaved)");
    // Rationale: since 0.85.1 the first toggle from "all enabled" disables the selected model rather than keeping only it.
    expect(engine.enabledModels).toEqual(["anthropic/claude"]);

    terminal.input("\x1b");
    const restoredFrame = shell.root.render(100).join("\n");
    expect(restoredFrame).not.toContain("Model Configuration");
    expect(restoredFrame).not.toContain("Scoped models cancelled");
    await shell.dispose();
  });

  it("ports project trust as a stateful save-or-cancel selector", async () => {
    const { adapter, terminal, shell } = await fixture();
    vi.spyOn(adapter, "pinnedProjectTrustContext").mockReturnValue({
      cwd: "D:\\work",
      savedDecision: null,
      projectTrusted: false,
      trustOptions: [
        { label: "Trust", trusted: true, updates: [{ path: "D:\\work", decision: true }], savedPath: "D:\\work" },
        { label: "Do not trust", trusted: false, updates: [{ path: "D:\\work", decision: false }], savedPath: "D:\\work" },
      ],
    });
    const persist = vi.spyOn(adapter, "persistProjectTrust").mockImplementation(() => {});

    await shell.submit("/trust");
    expect(shell.root.render(100).join("\n")).toContain("Project trust");
    expect(shell.root.render(100).join("\n")).toContain("Current session: untrusted");
    terminal.input("\x1b");
    expect(persist).not.toHaveBeenCalled();
    expect(shell.root.render(100).join("\n")).not.toContain("Project trust");

    await shell.submit("/trust");
    terminal.input("\r");
    expect(persist).toHaveBeenCalledWith([{ path: "D:\\work", decision: true }]);
    expect(shell.root.render(100).join("\n")).toContain("Saved trust decision: trusted. Restart pi for this to take effect.");
    await shell.dispose();
  });

  it("uses the stateful session controller and closes resume cancellation silently", async () => {
    const { engine, adapter, terminal, shell } = await fixture();
    const session = {
      path: "D:/sessions/one.jsonl",
      id: "one",
      cwd: "D:/work",
      name: "Named session",
      created: new Date(0),
      modified: new Date(),
      messageCount: 3,
      firstMessage: "First prompt",
      allMessagesText: "First prompt response",
    };
    vi.spyOn(adapter, "pinnedSessionSelectorContext").mockReturnValue({
      currentSessionFilePath: "D:/sessions/current.jsonl",
      loadCurrentSessions: async () => [session],
      loadAllSessions: async progress => {
        progress?.(1, 1);
        return [session];
      },
      renameSession: async () => {},
    });

    await shell.submit("/resume");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("Resume Session (Current Folder)");
    terminal.input("\t");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("Resume Session (All)");
    terminal.input("\x1b");
    expect(shell.root.render(100).join("\n")).not.toContain("Resume Session");
    expect(shell.root.render(100).join("\n")).not.toContain("Resume cancelled");

    await shell.submit("/resume");
    await new Promise(resolve => setTimeout(resolve, 0));
    terminal.input("\r");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(engine.calls).toContain("switch:D:/sessions/one.jsonl");
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("Resumed session");
    await shell.dispose();
  });

  it("nests tree summary choice and custom instructions while restoring cancellation", async () => {
    const { adapter, terminal, shell } = await fixture();
    const tree = [{
      entry: {
        type: "message",
        id: "entry-1",
        parentId: null,
        timestamp: new Date(0).toISOString(),
        message: { role: "user", content: [{ type: "text", text: "First prompt" }], timestamp: 0 },
      },
      children: [],
    }];
    vi.spyOn(adapter, "pinnedTreeSelectorContext").mockReturnValue({
      tree,
      currentLeafId: null,
      filterMode: "default",
      skipSummaryPrompt: false,
      appendLabelChange() {},
    });
    const execute = vi.spyOn(adapter, "executeWorkflow").mockImplementation(async request => ({
      command: request.command,
      outcome: "completed",
      message: "Navigated to selected point",
    }));

    await shell.submit("/tree");
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("Session Tree");
    terminal.input("\r");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("Summarize branch?");
    terminal.input("\x1b");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("Session Tree");

    terminal.input("\r");
    await new Promise(resolve => setTimeout(resolve, 0));
    terminal.input("\x1b[B");
    terminal.input("\x1b[B");
    terminal.input("\r");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("Custom summarization instructions");
    terminal.input("Preserve decisions");
    terminal.input("\r");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(execute).toHaveBeenCalledWith({
      command: "tree",
      argument: "",
      selection: "entry-1",
      treeSummary: { summarize: true, customInstructions: "Preserve decisions" },
    });
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("Navigated to selected point");
    await shell.dispose();
  });

  it("renders configured and unconfigured provider state from the model authority", async () => {
    const { terminal, shell } = await fixture();
    await shell.submit("/login");
    terminal.input("\r");
    let frame = stripTerminalSequences(shell.root.render(100).join("\n"));
    expect(frame).toContain("OpenAI Codex");
    expect(frame).toContain("✓ stored");
    expect(frame).not.toContain("OpenAI Codex • unconfigured");

    terminal.input("\x1b");
    terminal.input("\x1b");
    await shell.runWorkflow({ command: "logout", argument: "", selection: "oauth:openai" });
    await shell.backend.flushEvents();
    expect(shell.view().activeModel).toBeNull();
    expect(shell.view().status.footer?.availableProviderCount).toBe(1);
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).not.toContain("gpt-5 • medium");
    await shell.submit("/login");
    terminal.input("\r");
    frame = stripTerminalSequences(shell.root.render(100).join("\n"));
    expect(frame).toContain("OpenAI Codex • unconfigured");
    await shell.dispose();
  });

  it("renders empty fork and logout outcomes as pinned statuses", async () => {
    const { adapter, shell } = await fixture();
    vi.spyOn(adapter, "pinnedForkOptions").mockReturnValue([]);
    vi.spyOn(adapter, "pinnedLogoutOptions").mockResolvedValue([]);

    shell.showForkSelector();
    const forkFrame = stripTerminalSequences(shell.root.render(100).join("\n"));
    expect(forkFrame).toContain("No messages to fork from");
    expect(forkFrame).not.toContain("Error: No messages to fork from");

    await shell.showLogoutSelector();
    const logoutFrame = stripTerminalSequences(shell.root.render(200).join("\n"));
    expect(logoutFrame).toContain("No stored credentials to remove. /logout only removes credentials saved by /login; environment variables and models.json config are unchanged.");
    expect(logoutFrame).not.toContain("No authenticated providers available.");
    await shell.dispose();
  });

  it("nests login authentication type and provider selection with pinned cancellation", async () => {
    const { adapter, terminal, shell } = await fixture();
    vi.spyOn(adapter, "pinnedLoginOptions").mockImplementation(authType => [{
      id: `${authType ?? "oauth"}:openai`,
      providerId: "openai",
      label: "OpenAI",
      description: authType === "api_key" ? "API key" : "Account / OAuth",
      authType: authType ?? "oauth",
    }]);
    const execute = vi.spyOn(adapter, "executeWorkflow").mockImplementation(async request => ({
      command: request.command,
      outcome: "completed",
      message: `completed ${request.selection ?? ""}`,
    }));

    await shell.submit("/login");
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("Select authentication method:");
    terminal.input("\r");
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("OpenAI");
    terminal.input("\x1b");
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("Select authentication method:");
    terminal.input("\r");
    terminal.input("\r");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(execute).toHaveBeenCalledWith({ command: "login", argument: "", selection: "oauth:openai" });
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("completed oauth:openai");
    await shell.dispose();
  });

  it("preserves a blank optional OAuth prompt before a device-code flow", async () => {
    const { engine, terminal, shell } = await fixture();
    engine.loginPromptKind = "optional-text";

    const login = shell.runWorkflow({ command: "login", argument: "", selection: "oauth:openai" });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("GitHub Enterprise URL/domain (blank for github.com)");

    terminal.input("\r");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(engine.calls).toContain("login-domain:");
    const deviceCode = stripTerminalSequences(shell.root.render(100).join("\n"));
    expect(deviceCode).toContain("https://github.test/login/device");
    expect(deviceCode).toContain("Enter code: SAFE-CODE");
    expect(deviceCode).toContain("Waiting for authentication...");

    engine.completeLogin?.();
    await login;
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("Logged in to OpenAI Codex");
    await shell.dispose();
  });

  it("ports the nested provider authentication-method selector and restores its parent dialog", async () => {
    const { engine, terminal, shell } = await fixture();
    await shell.submit("/login");
    terminal.input("\r");
    terminal.input("\r");
    await new Promise(resolve => setTimeout(resolve, 0));
    const nested = stripTerminalSequences(shell.root.render(100).join("\n"));
    expect(nested).toContain("Select OpenAI Codex login method:");
    expect(nested).toContain("Browser login (default)");
    expect(nested).toContain("Device code login (headless)");
    expect(nested).not.toContain("Login to provider");

    terminal.input("\x1b[B");
    terminal.input("\r");
    await new Promise(resolve => setTimeout(resolve, 0));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(engine.calls).toContain("login-method:device");
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("Logged in to OpenAI Codex");
    await shell.dispose();
  });

  it("cycles levels only in the owned agent input and keeps model selection command-accessible", async () => {
    const { terminal, shell } = await fixture([], [], true);
    const cycle = vi.spyOn(shell, "cycleThinkingLevel");
    const select = vi.spyOn(shell, "showModelsDialog");
    try {
      shell.root.editor.setText("draft");
      terminal.input("\u001b[Z");
      expect(cycle).not.toHaveBeenCalled();
      expect(select).not.toHaveBeenCalled();
      expect(shell.root.editor.getText()).toBe("draft");
      terminal.input("\u000c");
      await vi.waitFor(() => expect(cycle).toHaveBeenCalledOnce());
      expect(select).not.toHaveBeenCalled();
      await shell.submit("/models");
      expect(select).toHaveBeenCalledOnce();
      const frame = stripTerminalSequences(shell.root.render(100).join("\n"));
      expect(frame).toContain("gpt-5");
      cycle.mockClear();
      terminal.input("\u000c");
      await nextImmediate();
      expect(cycle).not.toHaveBeenCalled();
      terminal.input("\u001b");
      await nextImmediate();
      terminal.input("\u000c");
      await vi.waitFor(() => expect(cycle).toHaveBeenCalledOnce());
    } finally { await shell.dispose(); }
  });

  it("opens the model selector with the original search after a command-owned refresh misses", async () => {
    const { adapter, shell } = await fixture();
    vi.spyOn(adapter, "executeWorkflow").mockResolvedValue({
      command: "model",
      outcome: "requires-selection",
      message: "Select a model",
      detail: "openai/missing",
      messageKind: "silent",
      messages: [
        { kind: "status", message: "Refreshing model catalogs…" },
        { kind: "warning", message: "Could not refresh openai; searching cached models." },
      ],
    });
    const show = vi.spyOn(shell, "showModelSelector");

    await shell.runWorkflow({ command: "model", argument: "openai/missing" });
    expect(show).toHaveBeenCalledWith("openai/missing");
    const frame = stripTerminalSequences(shell.root.render(100).join("\n"));
    expect(frame).toContain("Warning: Could not refresh openai; searching cached models.");
    expect(frame).not.toContain("Owned controller missing for model");
    await shell.dispose();
  });
});

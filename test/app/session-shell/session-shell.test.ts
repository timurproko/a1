import { VERSION } from "@earendil-works/pi-coding-agent";
import { type AgentSessionRuntime } from "@earendil-works/pi-coding-agent";
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
import { createPiEngineAdapter, PINNED_PI_HIDDEN_COMMAND_NAMES, PINNED_PI_WORKFLOW_COMMAND_NAMES } from "../../../src/integrations/pi/engine/index.js";
import { piTheme } from "../../../src/integrations/pi/components/index.js";
import { OwnedUiSessionShell } from "../../../src/app/session-shell/index.js";
import { TestPresentationTerminal } from "../../features/owned-ui/neutral-port-doubles.js";
import { Session, Runtime, fixture, nextImmediate } from "./session-shell-fixture.js";

describe("OwnedUiSessionShell commands, notices, and presentation", () => {
  it("renders every advertised and hidden route without a generic raw/plain fallback at narrow and wide widths", async () => {
    const { shell } = await fixture();
    const routes = [...PINNED_PI_WORKFLOW_COMMAND_NAMES, ...PINNED_PI_HIDDEN_COMMAND_NAMES];
    for (const command of routes) {
      shell.root.resetWorkflowPresentation();
      const result = command === "session"
        ? {
            command,
            outcome: "completed" as const,
            message: "Session Info",
            presentation: {
              kind: "session-info" as const,
              stats: {
                sessionId: "matrix-session", userMessages: 0, assistantMessages: 0, toolCalls: 0, toolResults: 0, totalMessages: 0,
                tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 }, cost: 0,
              },
              cacheWaste: { missedTokens: 0, missedCost: 0, missCount: 0 },
              usageBreakdown: [],
              cacheWarming: { mode: "streaming" },
            },
          }
        : command === "changelog"
          ? { command, outcome: "completed" as const, message: "What's New", detail: "## 0.84.2\n\n- parity" }
          : command === "hotkeys"
            ? { command, outcome: "completed" as const, message: "Keyboard Shortcuts" }
            : command === "new"
              ? { command, outcome: "completed" as const, message: "✓ New session started" }
              : command === "debug"
                ? { command, outcome: "completed" as const, message: "✓ Debug log written", detail: "D:/debug.log" }
                : { command, outcome: "completed" as const, message: `route:${command}` };
      shell.root.appendWorkflowResult(result);
      for (const width of [44, 100]) {
        const frame = stripTerminalSequences(shell.root.render(width).join("\n"));
        expect(frame, `${command}@${width}`).not.toContain("{\n  \"");
        if (command === "quit" || command === "compact") expect(frame).not.toContain(`route:${command}`);
        else if (command === "session") expect(frame).toContain("Messages");
        else if (command === "changelog") expect(frame).toContain("What's New");
        else if (command === "hotkeys") expect(frame).toContain("Keyboard Shortcuts");
        else if (command === "arminsayshi") expect(frame).toContain("ARMIN SAYS HI");
        else if (command === "dementedelves") expect(frame).toContain("pi has joined Earendil");
        else expect(frame).toContain(result.message);
      }
    }
    await shell.dispose();
  });

  it("routes the complete command manifest, hidden routes, prompt resources, bash modes, and streaming queues", async () => {
    const { engine, adapter, shell } = await fixture();
    const workflow = vi.spyOn(adapter, "executeWorkflow").mockImplementation(async request => ({
      command: request.command,
      outcome: "completed",
      message: `ran ${request.command}`,
    }));
    const routedCommands = [...PINNED_PI_WORKFLOW_COMMAND_NAMES, ...PINNED_PI_HIDDEN_COMMAND_NAMES]
      .filter(command => !["settings", "model", "thinking", "scoped-models", "fork", "tree", "trust", "login", "logout", "resume"].includes(command));
    for (const command of routedCommands) {
      await shell.submit(`/${command}`);
    }
    expect(workflow.mock.calls.map(([request]) => request.command)).toEqual(routedCommands);

    await shell.submit("/plan release");
    await shell.submit("/skill:review src");
    await shell.submit("!echo included");
    await shell.submit("!!echo excluded");
    expect(engine.session.calls).toContain("prompt:/plan release");
    expect(engine.session.calls).toContain("prompt:/skill:review src");
    expect(engine.session.calls).toContain("bash:echo included:false");
    expect(engine.session.calls).toContain("bash:echo excluded:true");

    engine.session.emit({ type: "agent_start" });
    await adapter.flushEvents();
    await shell.submit("steer now");
    shell.root.editor.setText("follow later");
    await shell.queueFollowUp();
    expect(engine.session.calls).toContain("prompt:steer now");
    expect(engine.session.calls).toContain("prompt:follow later");
    await shell.dispose();
  });

  it.each(["steer", "follow-up"])("rejects an invalid deferred %s once and continues valid queued work", async type => {
    const { engine, adapter, shell } = await fixture([], [], true);
    try {
      engine.session.isCompacting = true;
      engine.session.emit({ type: "compaction_start", reason: "manual" });
      await adapter.flushEvents();
      const attachment = { type: "image" as const, data: "invalid!", mimeType: "image/png" };
      const preparation = vi.spyOn(shell.root, "preparePromptSubmission").mockReturnValueOnce({ text: "bad later", images: [attachment] });
      if (type === "follow-up") { shell.root.editor.setText("bad later"); await shell.queueFollowUp(); }
      else await shell.submit("bad later");
      preparation.mockRestore();
      expect(engine.session.queued).toEqual([]);
      await shell.submit("good later");
      expect(engine.session.queued).toEqual([{ mode: "steer", text: "good later" }]);
      engine.session.isCompacting = false;
      engine.session.emit({ type: "compaction_end", reason: "manual", result: {}, aborted: false, willRetry: false });
      await adapter.flushEvents();
      await nextImmediate();
      expect(engine.session.calls.filter(call => call.startsWith("prompt:"))).toEqual(["prompt:good later"]);
      expect(shell.root.editor.getText()).toBe("bad later");
      expect(stripTerminalSequences(shell.root.render(100).join("\n")).match(/Image data is invalid/g)).toHaveLength(1);
    } finally { await shell.dispose(); }
  });

  it("queues compaction-time input through the engine and starts one run from it when the manual compaction ends", async () => {
    const { engine, adapter, shell } = await fixture();
    engine.session.isCompacting = true;
    engine.session.emit({ type: "compaction_start", reason: "manual" });
    await adapter.flushEvents();
    await shell.submit("after compaction");
    shell.root.editor.setText("and then"); await shell.queueFollowUp();
    expect(engine.session.calls.filter(call => call.startsWith("prompt:"))).toEqual([]);
    expect(engine.session.calls).toEqual(expect.arrayContaining(["steer:after compaction", "followUp:and then"]));
    await adapter.flushEvents();
    expect(adapter.view().editor.queuedSubmissions).toEqual(["after compaction", "and then"]);
    engine.session.isCompacting = false;
    engine.session.emit({ type: "compaction_end", reason: "manual", result: {}, aborted: false, willRetry: false });
    await adapter.flushEvents();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(engine.session.calls.filter(call => call.startsWith("prompt:"))).toEqual(["prompt:after compaction"]);
    expect(engine.session.promptOptions.at(-1)).toMatchObject({ streamingBehavior: "steer" });
    expect(engine.session.queued).toEqual([{ mode: "followUp", text: "and then" }]);

    await engine.session.steer("queued steer");
    shell.restoreQueuedInput();
    expect(shell.root.editor.getText()).toBe("queued steer\nand then");
    await shell.dispose();
  });

  it("shows compaction-time input as pending steering rows that the dequeue action takes back", async () => {
    const { engine, adapter, shell, terminal } = await fixture([], [], true);
    try {
      terminal.resize(80, 20);
      engine.session.isCompacting = true;
      engine.session.emit({ type: "compaction_start", reason: "manual" });
      await adapter.flushEvents();
      await shell.submit("first");
      await shell.submit("second");
      await adapter.flushEvents();
      const frame = stripTerminalSequences(shell.root.render(80).join("\n"));
      expect(frame).toContain("Steering: first");
      expect(frame).toContain("Steering: second");
      expect(frame).toContain("↳ Alt+Up to edit all queued messages");
      expect(frame).toContain("Compacting...");
      expect(frame).not.toContain("Queued during compaction");
      shell.restoreQueuedInput();
      expect(shell.root.editor.getText()).toBe("first\nsecond");
      await adapter.flushEvents();
      expect(stripTerminalSequences(shell.root.render(80).join("\n"))).not.toContain("Steering:");
      engine.session.isCompacting = false;
      engine.session.emit({ type: "compaction_end", reason: "manual", result: {}, aborted: false, willRetry: false });
      await adapter.flushEvents(); await nextImmediate();
      expect(engine.session.calls.filter(call => call.startsWith("prompt:"))).toEqual([]);
    } finally { await shell.dispose(); }
  });

  it("cancels the share operation through its loader without rendering late success", async () => {
    const { adapter, terminal, shell } = await fixture();
    const execute = vi.spyOn(adapter, "executeWorkflow").mockImplementation(async request => {
      if (request.command !== "share" || !request.signal) return { command: request.command, outcome: "completed", message: "done" };
      await new Promise<void>(resolve => request.signal?.addEventListener("abort", () => resolve(), { once: true }));
      return { command: "share", outcome: "cancelled", message: "Share cancelled", messageKind: "status" };
    });

    const share = shell.runWorkflow({ command: "share", argument: "" });
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("Creating gist...");
    terminal.input("\x1b");
    await share;
    const frame = stripTerminalSequences(shell.root.render(100).join("\n"));
    expect(execute.mock.calls[0]?.[0].signal?.aborted).toBe(true);
    expect(frame).toContain("Share cancelled");
    expect(frame).not.toContain("Share URL:");
    await shell.dispose();
  });

  it("uses pinned editor-replacement loaders for share and reload operations", async () => {
    const { adapter, shell } = await fixture();
    let resolveShare: ((result: Awaited<ReturnType<typeof adapter.executeWorkflow>>) => void) | undefined;
    const execute = vi.spyOn(adapter, "executeWorkflow").mockImplementation(request => request.command === "share"
      ? new Promise(resolve => { resolveShare = resolve; })
      : Promise.resolve({ command: request.command, outcome: "completed", message: "Reloaded keybindings, extensions, skills, prompts, themes, and context files" }));

    const share = shell.runWorkflow({ command: "share", argument: "" });
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("Creating gist...");
    resolveShare?.({ command: "share", outcome: "completed", message: "Share URL: https://example.test", detail: "https://gist.test/id" });
    await share;
    const shareRows = shell.root.render(100);
    expect(stripTerminalSequences(shareRows.join("\n"))).not.toContain("Creating gist...");
    expect(shareRows.every(row => !row.includes("\n"))).toBe(true);
    const plainShareRows = shareRows.map(row => stripTerminalSequences(row));
    const shareRow = plainShareRows.findIndex(row => row.trimEnd() === " Share URL: https://example.test");
    expect(shareRow).toBeGreaterThanOrEqual(0);
    expect(plainShareRows[shareRow + 1]?.trimEnd()).toBe(" Gist: https://gist.test/id");

    const reload = shell.runWorkflow({ command: "reload", argument: "" });
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("Reloading keybindings, extensions, skills, prompts, themes, and context files...");
    await reload;
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).not.toContain("Reloading keybindings");
    expect(execute).toHaveBeenCalledTimes(2);
    await shell.dispose();
  });

  it("holds the reload box for the minimum visible window when reload finishes instantly", async () => {
    let clock = 1_000;
    const sleeps: number[] = [];
    let releaseSleep: (() => void) | undefined;
    const { adapter, shell } = await fixture([], [], false, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, {
      minVisibleMs: 400,
      now: () => clock,
      sleep: ms => {
        sleeps.push(ms);
        return new Promise<void>(resolve => { releaseSleep = resolve; });
      },
    });
    vi.spyOn(adapter, "executeWorkflow").mockImplementation(async request => {
      clock += 50;
      return { command: request.command, outcome: "completed", message: "Reloaded keybindings, extensions, skills, prompts, themes, and context files" };
    });

    const reload = shell.runWorkflow({ command: "reload", argument: "" });
    await vi.waitFor(() => expect(sleeps).toEqual([350]));
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("Reloading keybindings, extensions, skills, prompts, themes, and context files...");
    releaseSleep?.();
    await reload;
    const frame = stripTerminalSequences(shell.root.render(100).join("\n"));
    expect(frame).not.toContain("Reloading keybindings");
    expect(frame).toContain("Reloaded keybindings, extensions, skills, prompts, themes, and context files");
    await shell.dispose();
  });

  it("skips the reload hold once the box already stayed visible long enough", async () => {
    let clock = 1_000;
    const sleeps: number[] = [];
    const { adapter, shell } = await fixture([], [], false, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, {
      minVisibleMs: 400,
      now: () => clock,
      sleep: async ms => { sleeps.push(ms); },
    });
    vi.spyOn(adapter, "executeWorkflow").mockImplementation(async request => {
      clock += 400;
      return { command: request.command, outcome: "completed", message: "Reloaded keybindings, extensions, skills, prompts, themes, and context files" };
    });

    await shell.runWorkflow({ command: "reload", argument: "" });
    expect(sleeps).toEqual([]);
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).not.toContain("Reloading keybindings");
    await shell.dispose();
  });

  it("renders and removes extension status contributions in the footer", async () => {
    const { engine, shell } = await fixture();
    await vi.waitFor(() => expect(engine.session.calls).toContain("bindExtensions"));
    const bindings = engine.session.extensionBindings as {
      uiContext: { setStatus(key: string, text: string | undefined): void };
    };

    bindings.uiContext.setStatus("mcp", "🔌 MCP: 1 server enabled");
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("🔌 MCP: 1 server enabled");
    bindings.uiContext.setStatus("mcp", undefined);
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).not.toContain("MCP: 1 server enabled");
    await shell.dispose();
  });

  it("rebinds extension UI and clears stale command presentation before reload status", async () => {
    const { engine, shell } = await fixture();
    expect(engine.session.calls.filter(call => call === "bindExtensions")).toHaveLength(1);
    shell.root.appendWorkflowStatus("stale extension command status");
    shell.root.appendWorkflowResult({ command: "debug", outcome: "failed", message: "stale extension command error" });
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("stale extension command");
    await shell.runWorkflow({ command: "reload", argument: "" });
    expect(engine.session.calls.filter(call => call === "bindExtensions")).toHaveLength(2);
    expect(engine.session.calls).toContain("reload");
    const frame = stripTerminalSequences(shell.root.render(100).join("\n"));
    expect(frame).not.toContain("stale extension command");
    expect(frame).toContain("Reloaded keybindings, extensions, skills, prompts, themes, and context files");
    await shell.dispose();
  });

  it("cancels active extension surfaces and restores the editor on session rebind", async () => {
    const { engine, shell } = await fixture();
    await new Promise(resolve => setTimeout(resolve, 0));
    const bindings = engine.session.extensionBindings as {
      uiContext: { input(title: string, placeholder?: string): Promise<string | undefined> };
    };
    const pending = bindings.uiContext.input("Session switch input", "cancelled on rebind");
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("Session switch input");
    await engine.rebindSession?.(new Session());
    await expect(pending).resolves.toBeUndefined();
    const frame = stripTerminalSequences(shell.root.render(100).join("\n"));
    expect(frame).not.toContain("Session switch input");
    expect(frame).toContain("commands");
    await shell.dispose();
  });

  it("keeps working and chronological command messages in their pinned root order with the dock spacer", async () => {
    const { engine, adapter, shell } = await fixture();
    engine.session.emit({ type: "agent_start" });
    await adapter.flushEvents();
    let rows = shell.root.render(100).map(row => stripTerminalSequences(row).trimEnd());
    const working = rows.findIndex(row => row.includes("Working..."));
    expect(working).toBeGreaterThan(-1);
    expect(rows[working + 1]?.trim()).toBe("");
    expect(rows[working + 2]).toMatch(/^─+$/);

    shell.root.setExtensionWorking("Extension indexing source");
    rows = shell.root.render(100).map(row => stripTerminalSequences(row).trimEnd());
    expect(rows.some(row => row.includes("Extension indexing source..."))).toBe(true);
    expect(rows.some(row => row.includes("Working..."))).toBe(false);

    shell.root.setExtensionWorking("Legacy extension…");
    rows = shell.root.render(100).map(row => stripTerminalSequences(row).trimEnd());
    expect(rows.some(row => row.includes("Legacy extension..."))).toBe(true);
    expect(rows.some(row => row.includes("Legacy extension…"))).toBe(false);

    shell.root.setExtensionWorking(undefined);
    rows = shell.root.render(100).map(row => stripTerminalSequences(row).trimEnd());
    expect(rows.some(row => row.includes("Legacy extension"))).toBe(false);
    expect(rows.some(row => row.includes("Working..."))).toBe(true);

    engine.session.emit({ type: "agent_end", messages: [] });
    engine.session.emit({ type: "agent_settled" });
    await adapter.flushEvents();
    shell.root.appendWorkflowStatus("first informational message");
    shell.root.appendWorkflowResult({ command: "import", outcome: "failed", message: "Usage: /import <path.jsonl>" });
    shell.root.appendWorkflowStatus("latest informational message");
    rows = shell.root.render(100).map(row => stripTerminalSequences(row).trimEnd());
    const first = rows.findIndex(row => row.includes("first informational message"));
    const error = rows.findIndex(row => row.includes("Error: Usage: /import <path.jsonl>"));
    const latest = rows.findIndex(row => row.includes("latest informational message"));
    const editorBorder = rows.findIndex((row, index) => index > latest && /^─+$/.test(row));
    expect(first).toBeGreaterThan(-1);
    expect(error).toBeGreaterThan(first);
    expect(latest).toBeGreaterThan(error);
    expect(editorBorder).toBe(latest + 2);
    expect(rows[latest + 1]?.trim()).toBe("");
    await shell.dispose();
  });

  it("shows bare-A1 informational messages as one transient dock notice above the editor", async () => {
    const { engine, adapter, terminal, shell } = await fixture([], [], true);
    try {
      terminal.resize(80, 20);
      const plainRows = () => shell.root.render(80).map(row => stripTerminalSequences(row).trimEnd());
      const rowOf = (rows: readonly string[], text: string) => rows.findIndex(row => row.includes(text));

      shell.root.appendWorkflowStatus("Switched to GPT-5.6 Sol (thinking: high)");
      let rows = plainRows();
      const notice = rowOf(rows, "Switched to GPT-5.6 Sol (thinking: high)");
      const border = rows.findIndex((row, index) => index > notice && /^─+$/.test(row));
      expect(notice).toBeGreaterThan(0);
      expect(rows.slice(0, notice - 1).every(row => row === "")).toBe(true);
      expect(rows[notice - 1]).toBe("");
      expect(rows[notice]!.startsWith(" Switched to")).toBe(true);
      expect(rows[notice + 1]).toBe("");
      expect(border).toBe(notice + 2);
      const descriptor = shell.root.viewportFrameDescriptor();
      expect(descriptor?.dock?.rowStart).toBeLessThanOrEqual(notice + 1);
      expect(descriptor?.nextDocumentRange.end).toBe(0);

      shell.root.appendWorkflowStatus("Thinking level: medium");
      rows = plainRows();
      expect(rowOf(rows, "Switched to")).toBe(-1);
      expect(rowOf(rows, "Thinking level: medium")).toBe(notice);

      engine.session.emit({ type: "agent_start" });
      const streamed = { role: "assistant", timestamp: 10, content: [{ type: "text", text: "streamed" }] };
      engine.session.emit({ type: "message_start", message: streamed });
      await adapter.flushEvents();
      rows = plainRows();
      expect(rowOf(rows, "Thinking level: medium")).toBeGreaterThan(rowOf(rows, "Working..."));

      shell.root.appendWorkflowStatus("Switched to GPT-6 Astra (thinking: high)");
      rows = plainRows();
      const working = rowOf(rows, "Working...");
      let astra = rowOf(rows, "Switched to GPT-6 Astra");
      expect(working).toBeGreaterThan(rowOf(rows, "streamed"));
      expect(astra).toBeGreaterThan(working);
      expect(rows[astra - 1]).toBe("");
      expect(rows.findIndex((row, index) => index > astra && /^─+$/.test(row))).toBe(astra + 2);

      const longer = { ...streamed, content: [{ type: "text", text: "streamed further" }] };
      engine.session.emit({ type: "message_update", message: longer, assistantMessageEvent: { type: "text_delta", delta: " further" } });
      await adapter.flushEvents();
      rows = plainRows();
      astra = rowOf(rows, "Switched to GPT-6 Astra");
      expect(rowOf(rows, "streamed further")).toBeGreaterThan(-1);
      expect(astra).toBeGreaterThan(rowOf(rows, "Working..."));

      engine.session.emit({ type: "message_end", message: longer });
      const toolCall = { role: "assistant", timestamp: 11, content: [{ type: "toolCall", id: "call-1", name: "read", arguments: { path: "a.txt" } }] };
      engine.session.emit({ type: "message_start", message: toolCall });
      engine.session.emit({ type: "message_end", message: toolCall });
      engine.session.emit({ type: "message_start", message: { role: "assistant", timestamp: 12, content: [{ type: "text", text: "next block" }] } });
      await adapter.flushEvents();
      rows = plainRows();
      expect(rowOf(rows, "next block")).toBeGreaterThan(-1);
      expect(rowOf(rows, "Switched to GPT-6 Astra")).toBeGreaterThan(rowOf(rows, "next block"));

      engine.session.emit({ type: "agent_end", messages: [] });
      engine.session.emit({ type: "agent_settled" });
      await adapter.flushEvents();
      expect(rowOf(plainRows(), "Switched to GPT-6 Astra")).toBeGreaterThan(-1);
      engine.session.emit({ type: "message_start", message: { role: "user", timestamp: 13, content: [{ type: "text", text: "next prompt" }] } });
      await adapter.flushEvents();
      rows = plainRows();
      expect(rowOf(rows, "next prompt")).toBeGreaterThan(-1);
      expect(rowOf(rows, "Switched to GPT-6 Astra")).toBe(-1);

      shell.root.appendWorkflowStatus("Copied selected message to clipboard");
      shell.root.appendWorkflowResult({ command: "import", outcome: "failed", message: "Usage: /import <path.jsonl>" });
      rows = plainRows();
      expect(rowOf(rows, "Copied selected message")).toBe(-1);
      expect(rowOf(rows, "Error: Usage: /import <path.jsonl>")).toBeGreaterThan(-1);

      shell.root.appendWorkflowStatus("Model selection saved to settings");
      shell.runtime.renderNow();
      expect(rowOf(plainRows(), "Model selection saved to settings")).toBeGreaterThan(-1);
      // Performance: a notice changes the dock height once; keyboard input beside it keeps dock-only reuse.
      const work = shell.root.viewportCompositionEvidence();
      terminal.input("x"); await nextImmediate(); await nextImmediate();
      expect(shell.root.viewportCompositionEvidence().full).toBe(work.full);
      expect(shell.root.viewportCompositionEvidence().dockOnly).toBeGreaterThan(work.dockOnly);
      expect(rowOf(plainRows(), "Model selection saved to settings")).toBeGreaterThan(-1);
      shell.root.resetWorkflowPresentation();
      expect(rowOf(plainRows(), "Model selection saved to settings")).toBe(-1);
    } finally {
      await shell.dispose();
    }
  });

  it("shows bare-A1 command errors and warnings as the transient dock notice above the editor", async () => {
    const { terminal, shell } = await fixture([], [], true);
    try {
      terminal.resize(100, 20);
      const exportFailure = "Failed to export session: Nothing to export yet - start a conversation first";
      shell.root.appendWorkflowResult({ command: "export", outcome: "failed", message: exportFailure });
      let rawRows = shell.root.render(100);
      let rows = rawRows.map(row => stripTerminalSequences(row).trimEnd());
      let notice = rows.findIndex(row => row.includes(`Error: ${exportFailure}`));
      let border = rows.findIndex((row, index) => index > notice && /^─+$/.test(row));
      expect(notice).toBeGreaterThan(0);
      expect(rows.slice(0, notice - 1).every(row => row === "")).toBe(true);
      expect(rows[notice - 1]).toBe("");
      expect(rows[notice + 1]).toBe("");
      expect(border).toBe(notice + 2);
      expect(rawRows[notice]).toContain(piTheme().fg("error", `Error: ${exportFailure}`));
      expect(shell.root.viewportFrameDescriptor()?.nextDocumentRange.end).toBe(0);

      shell.root.appendWorkflowMessage({ kind: "warning", message: "Use a destination with write access" });
      rawRows = shell.root.render(100);
      rows = rawRows.map(row => stripTerminalSequences(row).trimEnd());
      expect(rows.some(row => row.includes(exportFailure))).toBe(false);
      notice = rows.findIndex(row => row.includes("Warning: Use a destination with write access"));
      expect(notice).toBeGreaterThan(0);
      expect(rows[notice]!.startsWith(" Warning:")).toBe(true);
      expect(rawRows[notice]).toContain(piTheme().fg("warning", "Warning: Use a destination with write access"));
      expect(shell.root.viewportFrameDescriptor()?.nextDocumentRange.end).toBe(0);

      shell.root.addExtensionNotification("Extension export failed", "error");
      rows = shell.root.render(100).map(row => stripTerminalSequences(row).trimEnd());
      expect(rows.some(row => row.includes("Use a destination"))).toBe(false);
      expect(rows.some(row => row.includes("Error: Extension export failed"))).toBe(true);

      shell.root.appendWorkflowStatus("Model selection saved to settings");
      rows = shell.root.render(100).map(row => stripTerminalSequences(row).trimEnd());
      expect(rows.some(row => row.includes("Extension export failed"))).toBe(false);
      expect(rows.some(row => row.includes("Model selection saved to settings"))).toBe(true);

      shell.root.addExtensionNotification("Extension warning whose complete message wraps in a narrow dock", "warning");
      rows = shell.root.render(32).map(row => stripTerminalSequences(row).trimEnd());
      notice = rows.findIndex(row => row.includes("Warning: Extension warning"));
      border = rows.findIndex((row, index) => index > notice && /^─+$/.test(row));
      expect(notice).toBeGreaterThan(0);
      const wrappedNotice = rows.slice(notice, border).join(" ").replace(/\s+/g, " ");
      expect(wrappedNotice).toContain("complete message wraps in a");
      expect(wrappedNotice).toContain("narrow dock");
      expect(shell.root.viewportFrameDescriptor()?.nextDocumentRange.end).toBe(0);

      shell.root.appendWorkflowResult({ command: "new", outcome: "completed", message: "New session started" });
      rows = shell.root.render(100).map(row => stripTerminalSequences(row).trimEnd());
      expect(rows.some(row => row.includes("Extension warning"))).toBe(false);
      expect(rows.some(row => row.includes("New session started"))).toBe(true);
      expect(shell.root.viewportFrameDescriptor()?.nextDocumentRange.end).toBeGreaterThan(0);
    } finally {
      await shell.dispose();
    }
  });

  it("renders /session with pinned structured groups, styles, and indentation instead of JSON", async () => {
    const { shell } = await fixture();
    shell.root.appendWorkflowResult({
      command: "session",
      outcome: "completed",
      message: "Session Info",
      presentation: {
        kind: "session-info",
        sessionName: "Parity fixture",
        stats: {
          sessionFile: "D:/sessions/parity.jsonl",
          sessionId: "session-1",
          userMessages: 2,
          assistantMessages: 2,
          toolCalls: 1,
          toolResults: 1,
          totalMessages: 6,
          tokens: { input: 100, output: 20, cacheRead: 300, cacheWrite: 50, total: 470 },
          cost: 0.125,
        },
        cacheWaste: { missedTokens: 2048, missedCost: 0.002, missCount: 1 },
        usageBreakdown: [
          { key: "openai/gpt-5", cost: 0.1, tokens: 400 },
          { key: "Tools/summaries", cost: 0.025, tokens: 70 },
        ],
        cacheWarming: { mode: "streaming" },
      },
    });
    const raw = shell.root.render(100).join("\n");
    const plain = stripTerminalSequences(raw);
    expect(plain).toMatch(/Session Info\s*\n\s*\n\s*Name: Parity fixture/);
    expect(plain).toMatch(/Messages\s*\n\s*Total: 6\s*\n\s*User: 2\s*\n\s*Assistant: 2\s*\n\s*Tools: 1 calls, 1 results/);
    expect(plain).toMatch(/Tokens\s*\n\s*Input: 450\s*\n\s*Cached: 300 \(66\.7%\)\s*\n\s*Uncached: 150 \(50 written to cache\)/);
    expect(plain).toMatch(/Cost\s*\n\s*Total: \$0\.125/);
    expect(plain).toContain("Cache Re-billed: $0.002 (2,048 tokens, 1 miss)");
    expect(plain).not.toContain("\"sessionId\"");
    expect(raw).toContain("\x1b[");
    await shell.dispose();
  });

  it("renders explicit ordered partial-success messages without prefix inference", async () => {
    const { shell } = await fixture();
    shell.root.appendWorkflowResult({
      command: "login",
      outcome: "completed",
      message: "Saved API key for OpenAI Codex",
      messages: [
        { kind: "status", message: "Saved API key for OpenAI Codex. Credentials saved to D:/auth.json" },
        { kind: "error", message: "Saved API key for OpenAI Codex, but no models are available for that provider. Use /model to select a model." },
      ],
    });
    shell.root.appendWorkflowResult({
      command: "name",
      outcome: "failed",
      message: "Usage: /name <name>",
      messageKind: "warning",
    });
    shell.root.appendWorkflowResult({ command: "fork", outcome: "cancelled", message: "Fork cancelled", messageKind: "silent" });

    const frame = stripTerminalSequences(shell.root.render(100).join("\n"));
    expect(frame.indexOf("Saved API key for OpenAI Codex. Credentials saved")).toBeLessThan(frame.indexOf("Error: Saved API key"));
    expect(frame).toContain("Warning: Usage: /name <name>");
    expect(frame).not.toContain("Fork cancelled");
    await shell.dispose();
  });

  it("renders changelog, errors, and reload through pinned route-specific presentation", async () => {
    const { shell } = await fixture();
    shell.root.appendWorkflowResult({
      command: "changelog",
      outcome: "completed",
      message: "What's New",
      detail: "# Changelog\n\n## 0.84.2\n\n- **Fixed selection rendering**",
    });
    shell.root.appendWorkflowResult({
      command: "export",
      outcome: "failed",
      message: "Failed to export session: Nothing to export yet - start a conversation first",
    });
    shell.root.appendWorkflowResult({
      command: "reload",
      outcome: "completed",
      message: "Reloaded keybindings, extensions, skills, prompts, themes, and context files",
    });
    const raw = shell.root.render(100).join("\n");
    const plain = stripTerminalSequences(raw);
    expect(plain).toContain("What's New");
    expect(plain).toContain("Fixed selection rendering");
    expect(plain).not.toContain("# Changelog");
    expect(plain).toContain("Error: Failed to export session: Nothing to export yet - start a conversation first");
    expect(plain).toContain("Reloaded keybindings, extensions, skills, prompts, themes, and context files");
    expect(plain).not.toContain("✓ Reloaded");
    expect(raw).toContain("\x1b[");
    await shell.dispose();
  });

  it("uses specialized hidden-command presenters without exposing raw debug objects", async () => {
    const { shell } = await fixture();
    shell.root.appendWorkflowResult({ command: "debug", outcome: "completed", message: "✓ Debug log written", detail: "D:/agent/pi-debug.log" });
    shell.root.appendWorkflowResult({ command: "arminsayshi", outcome: "completed", message: "Armin says hi" });
    shell.root.appendWorkflowResult({ command: "dementedelves", outcome: "completed", message: "Demented elves announcement" });
    const plain = stripTerminalSequences(shell.root.render(100).join("\n"));
    expect(plain).toContain("✓ Debug log written");
    expect(plain).toContain("D:/agent/pi-debug.log");
    expect(plain).not.toContain("\"snapshotId\"");
    expect(plain).toContain("ARMIN SAYS HI");
    expect(plain).toContain("pi has joined Earendil");
    expect(plain).toContain("Read the blog post:");
    await shell.dispose();
  });

  it("uses the pinned confirmation surface without committing on cancel", async () => {
    const { adapter, terminal, shell } = await fixture();
    const workflow = vi.spyOn(adapter, "executeWorkflow")
      .mockResolvedValueOnce({ command: "import", outcome: "requires-confirmation", message: "Replace current session with fixture.jsonl?" })
      .mockResolvedValueOnce({ command: "import", outcome: "cancelled", message: "Import cancelled", messageKind: "status" })
      .mockResolvedValueOnce({ command: "import", outcome: "requires-confirmation", message: "Replace current session with fixture.jsonl?" })
      .mockResolvedValueOnce({ command: "import", outcome: "completed", message: "Session imported" });

    const cancelled = shell.runWorkflow({ command: "import", argument: "fixture.jsonl" });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(shell.root.render(80).join("\n")).toContain("Import session");
    expect(shell.root.render(80).join("\n")).toContain("Replace current session");
    terminal.input("\x1b");
    await cancelled;
    expect(workflow).toHaveBeenNthCalledWith(1, { command: "import", argument: "fixture.jsonl" });
    expect(workflow).toHaveBeenNthCalledWith(2, { command: "import", argument: "fixture.jsonl", confirmed: false });

    const confirmed = shell.runWorkflow({ command: "import", argument: "fixture.jsonl" });
    await new Promise(resolve => setTimeout(resolve, 0));
    terminal.input("\r");
    await confirmed;
    expect(workflow).toHaveBeenNthCalledWith(3, { command: "import", argument: "fixture.jsonl" });
    expect(workflow).toHaveBeenNthCalledWith(4, { command: "import", argument: "fixture.jsonl", confirmed: true });
    await shell.dispose();
  });

  it("continues import through the missing-cwd recovery confirmation", async () => {
    const { adapter, terminal, shell } = await fixture();
    const workflow = vi.spyOn(adapter, "executeWorkflow")
      .mockResolvedValueOnce({ command: "import", outcome: "requires-confirmation", message: "Replace current session with fixture.jsonl?" })
      .mockResolvedValueOnce({
        command: "import",
        outcome: "requires-confirmation",
        message: "cwd from session file does not exist\nD:/missing\n\ncontinue in current cwd\nD:/work",
        detail: "D:/work",
      })
      .mockResolvedValueOnce({ command: "import", outcome: "completed", message: "Session imported from: fixture.jsonl" });

    const operation = shell.runWorkflow({ command: "import", argument: "fixture.jsonl" });
    await new Promise(resolve => setTimeout(resolve, 0));
    terminal.input("\r");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("Session cwd not found");
    terminal.input("\r");
    await operation;
    expect(workflow).toHaveBeenNthCalledWith(3, {
      command: "import",
      argument: "fixture.jsonl",
      confirmed: true,
      cwdOverride: "D:/work",
    });
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("Session imported from: fixture.jsonl");
    await shell.dispose();
  });

  it("closes selectors silently, restores editor input, and continues selected workflows", async () => {
    const { adapter, terminal, shell } = await fixture();
    const workflow = vi.spyOn(adapter, "executeWorkflow")
      .mockResolvedValueOnce({ command: "model", outcome: "completed", message: "Selected GPT-5" })
      .mockResolvedValueOnce({ command: "copy", outcome: "failed", message: "clipboard denied" });

    await shell.submit("/model");
    terminal.input("\x1b");
    const cancelledFrame = shell.root.render(80).join("\n");
    expect(cancelledFrame).not.toContain("Model cancelled");
    terminal.input("restored input");
    expect(shell.root.editor.getText()).toBe("restored input");
    shell.root.editor.setText("");

    await shell.submit("/model");
    terminal.input("\r");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(workflow).toHaveBeenNthCalledWith(1, { command: "model", argument: "", selection: "openai/gpt-5" });
    await shell.submit("/copy");
    expect(shell.root.render(80).join("\n")).toContain("Error: clipboard denied");
    await shell.dispose();
  });

  it("renders startup warnings and the package-update banner with pinned styling and order", async () => {
    const engine = new Runtime();
    (engine.diagnostics as { type: string; message: string }[]).push(
      { type: "warning", message: 'No models match pattern "github-copilot/gpt-5.6-sol"' },
      { type: "warning", message: 'No models match pattern "github-copilot/gpt-5.5"' },
      { type: "warning", message: 'No models match pattern "github-copilot/claude-opus-5"' },
    );
    const adapter = await createPiEngineAdapter({
      cwd: "D:/work",
      sessionId: "owned-shell",
      createRuntime: async () => engine as unknown as AgentSessionRuntime,
      checkPackageUpdates: async () => ["pi-mcp-adapter"],
    });
    await vi.waitFor(() => {
      expect(adapter.view().diagnostics.some(diagnostic => diagnostic.code === "package-updates")).toBe(true);
    });
    const terminal = new TestPresentationTerminal();
    const shell = new OwnedUiSessionShell({ engine: { backend: adapter, cwd: "D:/work" }, presentation: { terminal } });
    shell.start();
    shell.runtime.renderNow();

    const rawRows = shell.root.render(100);
    const rows = rawRows.map(row => stripTerminalSequences(row));
    const frame = rows.join("\n");
    for (const pattern of ["github-copilot/gpt-5.6-sol", "github-copilot/gpt-5.5", "github-copilot/claude-opus-5"]) {
      expect(frame).toContain(`Warning: No models match pattern "${pattern}"`);
    }
    const firstWarningRow = rows.findIndex(row => row.startsWith("Warning: No models match"));
    const bannerRow = rows.findIndex(row => row.includes(`v${VERSION}`));
    const updateTitleRow = rows.findIndex(row => row.includes("Package Updates Available"));
    expect(firstWarningRow).toBeGreaterThanOrEqual(0);
    expect(firstWarningRow).toBeLessThan(bannerRow);
    expect(rawRows[firstWarningRow]).toContain(`${String.fromCharCode(27)}[33mWarning: `);
    expect(updateTitleRow).toBeGreaterThan(bannerRow);
    expect(frame).toContain("Package updates are available. Run a1 pi update --extensions");
    expect(frame).toContain("Packages:");
    expect(frame).toContain("- pi-mcp-adapter");
    expect(rows[updateTitleRow - 1]).toMatch(/─/);
    await shell.dispose();
  });
});

import { stripAnsi } from "../../../../src/ui/components/index.js";
import { type AgentSessionRuntime } from "@earendil-works/pi-coding-agent";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stripTerminalSequences } from "@earendil-works/pi-tui";
import { describe, expect, it, onTestFailed, onTestFinished, vi } from "vitest";
// Performance: this integration file exercises real cold emitted entries; dedicated tests retain source-loader coverage.
vi.mock("../../../../src/integrations/pi/session-ui/paste-executor.js", async importOriginal => {
  const actual = await importOriginal<typeof import("../../../../src/integrations/pi/session-ui/paste-executor.js")>();
  const { coldPasteHelper } = await import("../../../support/cold-clipboard-entries.js");
  return { ...actual, startPasteExecutor: (...args: Parameters<typeof actual.startPasteExecutor>) =>
    actual.startPasteExecutor(args[0], args[1], args[2], coldPasteHelper(args[3])) };
});
vi.mock("node:worker_threads", async importOriginal => {
  const actual = await importOriginal<typeof import("node:worker_threads")>();
  const { coldClipboardWorker } = await import("../../../support/cold-clipboard-entries.js");
  return { ...actual, Worker: class extends actual.Worker {
    constructor(entry: string | URL, options?: import("node:worker_threads").WorkerOptions) {
      const selected = coldClipboardWorker(entry, options);
      super(selected.entry, selected.options);
    }
  } };
});
import { createPiEngineAdapter } from "../../../../src/integrations/pi/engine/index.js";
import { formatSessionResumeCommand, OwnedUiSessionShell } from "../../../../src/integrations/pi/session-ui/index.js";
import { TestPresentationTerminal } from "../../../features/owned-ui/neutral-port-doubles.js";
import { Runtime, fixture, InputImmediateScheduler, nextImmediate } from "./session-shell-fixture.js";

describe("OwnedUiSessionShell lifecycle, quit, and restoration", () => {
  it("coordinates rapid bare-A1 editor input into one latest-state dock frame while pinned input stays synchronous", async () => {
    const scheduler = new InputImmediateScheduler();
    const phases: Array<{ phase: string; revision: number }> = [];
    const custom = await fixture([], [], true, undefined, undefined, undefined, {
      scheduler,
      onEvent: event => phases.push(event),
    });
    await nextImmediate();
    const before = custom.shell.root.viewportCompositionEvidence();

    custom.terminal.input("a");
    custom.terminal.input("e\u0301");
    expect(custom.shell.root.editor.getText()).toBe("");
    expect(scheduler.callbacks.size).toBe(1);
    scheduler.flush();
    await nextImmediate();

    expect(custom.shell.root.editor.getText()).toBe("ae\u0301");
    expect(custom.shell.root.viewportFrameDescriptor()?.cause).toBe("dock-input");
    expect(custom.shell.root.viewportCompositionEvidence()).toEqual({
      full: before.full,
      dockOnly: before.dockOnly + 1,
    });
    expect(phases.filter(event => event.phase === "semantic-end").map(event => event.revision)).toEqual([1, 2]);
    await custom.shell.dispose();

    const pinned = await fixture();
    pinned.terminal.input("p");
    expect(pinned.shell.root.editor.getText()).toBe("p");
    await pinned.shell.dispose();
  });

  it("applies repeated owned-surface navigation in order and treats opaque extension input as a barrier", async () => {
    const scheduler = new InputImmediateScheduler();
    const custom = await fixture([], [], true, undefined, undefined, undefined, { scheduler });
    const navigation = {
      selected: 0,
      render() { return [`selected:${this.selected}`, "instructions"]; },
      handleInput(data: string) { if (data === "\u001b[B") this.selected += 1; },
      invalidate() {},
      setFocused() {},
    };
    custom.shell.root.setInputSurface(navigation);
    custom.shell.runtime.renderNow();
    const before = custom.shell.root.viewportCompositionEvidence();
    custom.terminal.input("\u001b[B");
    custom.terminal.input("\u001b[B");
    custom.terminal.input("\u001b[B");
    expect(navigation.selected).toBe(0);
    scheduler.flush();
    await nextImmediate();
    expect(navigation.selected).toBe(3);
    expect(custom.shell.root.viewportCompositionEvidence()).toEqual({ full: before.full, dockOnly: before.dockOnly + 1 });

    const opaqueInputs: string[] = [];
    const opaque = { render: () => ["opaque", "instructions"], handleInput: (data: string) => opaqueInputs.push(data), invalidate() {}, setFocused() {} };
    custom.shell.root.setInputSurface(opaque, true, "opaque");
    custom.terminal.input("x");
    expect(opaqueInputs).toEqual(["x"]);
    expect(scheduler.callbacks.size).toBe(0);
    await custom.shell.dispose();
  });

  it("forces the custom bare-A1 surface to fullscreen without changing pinned mode policy", async () => {
    const custom = await fixture([], [], true);
    expect(custom.shell.runtime.mode).toBe("fullscreen");
    await custom.shell.dispose();

    const pinned = await fixture();
    expect(pinned.shell.runtime.mode).toBe("regular");
    await pinned.shell.dispose();
  });

  it("leaves bare A1's parent terminal without any frame or transcript rows", async () => {
    const { shell, terminal } = await fixture([
      { role: "user", content: [{ type: "text", text: "exit user" }] },
      { role: "assistant", content: [{ type: "text", text: "exit answer" }] },
    ], [], true);
    expect(terminal.writes.join("")).toContain("exit answer");
    await shell.dispose();
    const bytes = terminal.writes.join("");
    expect(bytes.match(/\x1b\[\?1049h/g)).toHaveLength(1);
    expect(bytes.match(/\x1b\[\?1049l/g)).toHaveLength(1);
    const parent = bytes.slice(bytes.indexOf("\x1b[?1049l"));
    expect(parent).not.toContain("exit answer");
    expect(parent).not.toContain("\x1b[2K");
    expect(stripAnsi(parent).trim()).toBe("");
  });

  it("prints the comparison profile's fullscreen transcript after restoration without a frame dump", async () => {
    const { shell, terminal } = await fixture([
      { role: "user", content: [{ type: "text", text: "exit user" }] },
      { role: "assistant", content: [{ type: "text", text: "exit answer" }] },
    ], [], false, undefined, undefined, undefined, undefined, undefined, undefined, engine => {
      Object.assign(engine.services.settingsManager, { getTuiMode: () => "fullscreen", getFullscreenExitOutput: () => "transcript" });
    });
    expect(shell.runtime.mode).toBe("fullscreen");
    await shell.dispose();
    const bytes = terminal.writes.join("");
    const restored = bytes.lastIndexOf("\x1b[?1049l");
    expect(restored).toBeGreaterThanOrEqual(0);
    expect(bytes.lastIndexOf("exit answer")).toBeGreaterThan(restored);
    const parent = bytes.slice(restored);
    expect(parent).not.toContain("\x1b[?1049h");
    expect(parent).not.toContain("\r\x1b[2K");
  });

  it("plays the quit outro on the alternate screen before the only leave and drops frames meanwhile", async () => {
    let clock = 0;
    const shellRef: { current?: OwnedUiSessionShell } = {};
    const { shell, terminal } = await fixture([
      { role: "user", content: [{ type: "text", text: "outro user" }] },
      { role: "assistant", content: [{ type: "text", text: "outro answer" }] },
    ], [], true, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, {
      interactive: true,
      snapshot: () => ({ enabled: true, effect: "dissolve", durationMs: 300 }),
      now: () => clock,
      seed: 7,
      sleep: async ms => {
        clock += ms;
        // Invariant: a render scheduled mid-outro must not reach the terminal.
        shellRef.current?.runtime.renderNow(true);
      },
    });
    shellRef.current = shell;
    const before = terminal.writes.length;
    await shell.dispose();
    const writes = terminal.writes.slice(before);
    const bytes = writes.join("");
    const outroStart = writes.findIndex(write => write.startsWith("\x1b[?2026h\x1b[?25l\x1b[2J\x1b[H"));
    const leave = writes.findIndex(write => write.includes("\x1b[?1049l"));
    expect(outroStart).toBeGreaterThanOrEqual(0);
    expect(leave).toBeGreaterThan(outroStart);
    const held = writes.slice(outroStart, leave);
    // Invariant: nothing but outro ticks and the stop sequence reach the terminal once the
    // outro starts; the render forced from the sleep seam must have been dropped.
    expect(held.join("")).not.toContain(";1H\x1b[2K");
    const outroWrites = held.filter(write => write.startsWith("\x1b[?2026h\x1b[?25l") || write.startsWith("\x1b[?2026h\x1b[0m"));
    expect(outroWrites.length).toBeGreaterThan(2);
    expect(outroWrites.every(write => write.endsWith("\x1b[?2026l"))).toBe(true);
    expect(outroWrites.at(-1)).toContain("\x1b[2J\x1b[H\x1b[0m\x1b[?2026l");
    expect(outroWrites.join("")).toContain("\x1b[38;2;238;238;238m");
    expect(bytes.match(/\x1b\[\?1049l/g)).toHaveLength(1);
    expect(bytes).not.toContain("\x1b[?1049h");
    const parent = bytes.slice(bytes.indexOf("\x1b[?1049l"));
    expect(parent).not.toContain("\x1b[2J");
    expect(stripAnsi(parent).trim()).toBe("");
    expect(clock).toBeGreaterThanOrEqual(300);
    expect(clock).toBeLessThan(300 + 500 + 100);
  });

  it.each([
    ["a switched-off exit animation", { interactive: true, snapshot: () => ({ enabled: false, effect: "fall" as const, durationMs: 800 }) }],
    ["a non-interactive terminal", { interactive: false, snapshot: () => ({ enabled: true, effect: "fall" as const, durationMs: 800 }) }],
  ])("skips the quit outro for %s while restoring normally", async (_label, quitOutro) => {
    const { shell, terminal } = await fixture([
      { role: "assistant", content: [{ type: "text", text: "skip answer" }] },
    ], [], true, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, quitOutro);
    const before = terminal.writes.length;
    await shell.dispose();
    const writes = terminal.writes.slice(before);
    expect(writes.some(write => write.startsWith("\x1b[?2026h\x1b[?25l\x1b[2J\x1b[H"))).toBe(false);
    expect(writes.join("").match(/\x1b\[\?1049l/g)).toHaveLength(1);
    expect(terminal.active).toBe(false);
  });

  // Rationale: with the animation off nothing froze the presentation, so a render that landed
  // during the stop-time input drain flashed the prompt and footer before the leave.

  it("drops a frame scheduled during disposal when the exit animation is off", async () => {
    const { shell, terminal } = await fixture([
      { role: "assistant", content: [{ type: "text", text: "quiet answer" }] },
    ], [], true, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, {
      interactive: true, snapshot: () => ({ enabled: false, effect: "fall", durationMs: 800 }),
    });
    // Rationale: a throttled frame is still queued when quit begins, and the stop-time
    // input drain gives its timer room to fire, exactly as a real terminal does.
    vi.spyOn(terminal, "drainInput").mockImplementation(() => new Promise(resolve => setTimeout(resolve, 40)));
    shell.runtime.renderNow();
    shell.root.editor.setText("pending frame");
    shell.runtime.requestRender();
    const before = terminal.writes.length;
    await shell.dispose();
    const writes = terminal.writes.slice(before);
    const bytes = writes.join("");
    const leave = bytes.indexOf("\x1b[?1049l");
    expect(leave).toBeGreaterThanOrEqual(0);
    expect(bytes.slice(0, leave)).not.toContain(";1H\x1b[2K");
    expect(bytes.slice(0, leave)).not.toContain("quiet answer");
    expect(writes.some(write => write.startsWith("\x1b[?2026h\x1b[?25l\x1b[2J\x1b[H"))).toBe(false);
    expect(bytes.match(/\x1b\[\?1049l/g)).toHaveLength(1);
    expect(terminal.active).toBe(false);
  });

  it("plays the default effect when the exit animation is switched on", async () => {
    let clock = 0;
    const { shell, terminal } = await fixture([
      { role: "assistant", content: [{ type: "text", text: "default answer" }] },
    ], [], true, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, {
      interactive: true, snapshot: () => ({ enabled: true, effect: "fall", durationMs: 800 }), now: () => clock, seed: 3,
      sleep: async ms => { clock += ms; },
    });
    const before = terminal.writes.length;
    await shell.dispose();
    const writes = terminal.writes.slice(before);
    const outroStart = writes.findIndex(write => write.startsWith("\x1b[?2026h\x1b[?25l\x1b[2J\x1b[H"));
    const leave = writes.findIndex(write => write.includes("\x1b[?1049l"));
    expect(outroStart).toBeGreaterThanOrEqual(0);
    expect(leave).toBeGreaterThan(outroStart);
    expect(writes.join("").match(/\x1b\[\?1049l/g)).toHaveLength(1);
    expect(clock).toBeGreaterThanOrEqual(800);
    expect(terminal.active).toBe(false);
  });

  it("does not play the quit outro for the pinned regular-mode profile", async () => {
    const { shell, terminal } = await fixture([
      { role: "assistant", content: [{ type: "text", text: "pinned answer" }] },
    ], [], false, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, {
      interactive: true, snapshot: () => ({ enabled: true, effect: "fall", durationMs: 800 }),
    });
    expect(shell.runtime.mode).toBe("regular");
    const before = terminal.writes.length;
    await shell.dispose();
    expect(terminal.writes.slice(before).some(write => write.startsWith("\x1b[?2026h\x1b[?25l\x1b[2J\x1b[H"))).toBe(false);
    expect(terminal.active).toBe(false);
  });

  it("restores the terminal when the quit outro paint fails", async () => {
    const { shell, terminal } = await fixture([
      { role: "assistant", content: [{ type: "text", text: "failing answer" }] },
    ], [], true, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, {
      interactive: true, snapshot: () => ({ enabled: true, effect: "waves", durationMs: 300 }), now: () => 0, sleep: async () => {},
    });
    const write = terminal.write.bind(terminal);
    vi.spyOn(terminal, "write").mockImplementation(data => {
      if (data.startsWith("\x1b[?2026h\x1b[?25l\x1b[2J\x1b[H")) throw new Error("terminal write failed");
      write(data);
    });
    await shell.dispose();
    const bytes = terminal.writes.join("");
    expect(bytes.match(/\x1b\[\?1049l/g)).toHaveLength(1);
    expect(terminal.active).toBe(false);
    expect(shell.runtime.state).toBe("stopped");
  });

  it("prints only the dim compact resume hint after bare A1 restoration", async ({ onTestFinished }) => {
    const directory = await mkdtemp(join(tmpdir(), "a1-hint-"));
    onTestFinished(() => rm(directory, { recursive: true, force: true }));
    const path = join(directory, "raw-session-file.jsonl");
    await writeFile(path, "persisted session fixture");
    const { shell, engine, terminal } = await fixture([
      { role: "user", content: [{ type: "text", text: "styled exit user" }], timestamp: 1 },
      { role: "assistant", content: [{ type: "text", text: "styled exit answer" }], stopReason: "stop", timestamp: 2 },
    ], [], true);
    Object.assign(engine.session, {
      sessionManager: {
        isPersisted: () => true,
        getSessionFile: () => path,
        getSessionId: () => "compact-id",
        getSessionDir: () => "D:/default/sessions",
        usesDefaultSessionDir: () => true,
      },
    });
    await shell.dispose();
    const bytes = terminal.writes.join("");
    const restored = bytes.lastIndexOf("\u001b[?1049l");
    const parent = bytes.slice(restored);
    expect(parent).toContain("\u001b[");
    expect(parent).not.toContain("styled exit answer");
    expect(parent).toContain("\u001b[2mTo resume this session:\u001b[22m a1 --session compact-id");
    expect(parent).not.toContain("raw-session-file.jsonl");
    expect(stripAnsi(parent).trim()).toBe("To resume this session: a1 --session compact-id");
  });

  it("prints the styled transcript and the resume hint for the comparison profile's transcript mode", async ({ onTestFinished }) => {
    const directory = await mkdtemp(join(tmpdir(), "a1-hint-"));
    onTestFinished(() => rm(directory, { recursive: true, force: true }));
    const path = join(directory, "raw-session-file.jsonl");
    await writeFile(path, "persisted session fixture");
    const { shell, engine, terminal } = await fixture([
      { role: "user", content: [{ type: "text", text: "styled exit user" }], timestamp: 1 },
      { role: "assistant", content: [{ type: "text", text: "styled exit answer" }], stopReason: "stop", timestamp: 2 },
    ], [], false, undefined, undefined, undefined, undefined, undefined, undefined, runtime => {
      Object.assign(runtime.services.settingsManager, { getTuiMode: () => "fullscreen", getFullscreenExitOutput: () => "transcript" });
    });
    Object.assign(engine.session, {
      sessionManager: {
        isPersisted: () => true,
        getSessionFile: () => path,
        getSessionId: () => "compact-id",
        getSessionDir: () => "D:/default/sessions",
        usesDefaultSessionDir: () => true,
      },
    });
    await shell.dispose();
    const bytes = terminal.writes.join("");
    const parent = bytes.slice(bytes.lastIndexOf("\u001b[?1049l"));
    expect(parent).toContain("styled exit answer");
    expect(parent).toContain("\u001b[2mTo resume this session:\u001b[22m a1 --session compact-id");
    expect(parent.indexOf("styled exit answer")).toBeLessThan(parent.indexOf("To resume this session:"));
    expect(parent).not.toContain("raw-session-file.jsonl");
  });

  it("formats pinned compact resume grammar for default and custom session directories", () => {
    expect(formatSessionResumeCommand({
      sessionId: "abc123",
      sessionDir: "D:/default/sessions",
      usesDefaultSessionDir: true,
    })).toBe("a1 --session abc123");
    expect(formatSessionResumeCommand({
      sessionId: "abc123",
      sessionDir: "D:/custom session's",
      usesDefaultSessionDir: false,
    })).toBe("a1 --session-dir 'D:/custom session'\\''s' --session abc123");
  });

  it("omits Pi startup help and loaded-resource inventory from bare A1 only", async () => {
    const custom = await fixture([], [], true);
    const customFrame = stripTerminalSequences(custom.shell.root.render(80).join("\n"));
    expect(customFrame).not.toMatch(/pi v\d/i);
    expect(customFrame).not.toContain("escape interrupt");
    expect(customFrame).not.toContain("Pi can explain its own features");
    await custom.shell.dispose();

    const pinned = await fixture();
    const pinnedFrame = stripTerminalSequences(pinned.shell.root.render(80).join("\n"));
    expect(pinnedFrame).toMatch(/pi v\d/i);
    expect(pinnedFrame).toContain("escape interrupt");
    await pinned.shell.dispose();
  });

  it("stops pointer reporting when the session ends while an owned screen is presented", async () => {
    const engine = new Runtime([]);
    const adapter = await createPiEngineAdapter({
      cwd: "D:/work",
      sessionId: "owned-shell",
      createRuntime: async () => engine as unknown as AgentSessionRuntime,
    });
    const terminal = new TestPresentationTerminal();
    let mouseEvents = 0;
    const surface = {
      id: "pointer-screen",
      render: (width: number, height: number) => Array.from({ length: height }, () => " ".repeat(width)),
      handleInput: () => true,
      handleMouse: () => { mouseEvents += 1; return true; },
      isClosed: () => false,
      close: () => {},
      onRenderRequested: () => {},
      onExitRequested: () => {},
    };
    const shell = new OwnedUiSessionShell({
      backend: adapter,
      cwd: "D:/work",
      terminal,
      routeHost: { claims: (route: string) => route === "pointer", open: () => surface },
    });
    shell.start();
    shell.runtime.renderNow();

    shell.root.editor.setText("/pointer");
    terminal.input("\r");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(terminal.writes.some(write => write.includes("[?1003h"))).toBe(true);
    expect(terminal.writes.some(write => write.includes("[?1003l"))).toBe(false);
    terminal.input("\u001b[<0;20;4M");
    terminal.input("\u001b[<35;21;4M");
    terminal.input("\u001b[<0;21;4m");
    expect(mouseEvents).toBe(3);

    // Invariant: the screen is still up: ending the session has to restore the terminal anyway.
    await shell.dispose();
    expect(terminal.writes.some(write => write.includes("[?1003l"))).toBe(true);
    expect(terminal.writes.some(write => write.includes("[?1006l"))).toBe(true);
  });

  it("composes the public Pi editor, transcript, tool/status surfaces, and runtime", async () => {
    const { engine, adapter, terminal, shell } = await fixture();
    shell.root.editor.setText("Inspect with Pi editor");
    terminal.input("\r");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(engine.session.calls).toContain("prompt:Inspect with Pi editor");

    engine.session.emit({ type: "agent_start" });
    engine.session.emit({ type: "message_start", message: { role: "assistant", content: [{ type: "text", text: "Streaming answer" }], timestamp: 1 } });
    await adapter.flushEvents();
    const streamingId = shell.view().transcript.find(block => block.kind === "assistant")?.id;
    expect(streamingId).toBeDefined();
    const persistentComponent = shell.root.transcriptComponent(streamingId!);
    engine.session.emit({ type: "message_update", assistantMessageEvent: { type: "text_delta", delta: " complete" } });
    await adapter.flushEvents();
    expect(shell.root.transcriptComponent(streamingId!)).toBe(persistentComponent);
    shell.runtime.renderNow();
    const rows = shell.root.render(60).join("\n");
    expect(rows).toContain("Streaming answer");
    expect(rows).toContain("gpt-5 • medium");
    expect(rows).toContain("v0.84.2");
    expect(rows).toContain("commands");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(engine.session.calls).toContain("bindExtensions");
    expect(adapter.visualExtensionSupport()).toMatchObject({ available: true, binding: "bound" });

    const handle = shell.showSelector("Choose", [{ id: "one", label: "One" }], () => {});
    shell.runtime.renderNow();
    expect(handle.isFocused()).toBe(true);
    terminal.resize(50, 16);
    shell.runtime.renderNow();
    expect(shell.runtime.viewport()).toEqual({ columns: 50, rows: 16 });

    shell.root.editor.setText("clear me");
    await shell.clearOrExit(1_000);
    expect(shell.root.editor.getText()).toBe("");
    expect(shell.view().lifecycle).not.toBe("stopped");
    await shell.clearOrExit(1_200);
    await shell.dispose();
    expect(engine.calls).toContain("dispose");
  });

  it.each([
    { route: "/quit", exit: (shell: OwnedUiSessionShell) => shell.submit("/quit") },
    { route: "double Ctrl+C", exit: async (shell: OwnedUiSessionShell) => {
      await shell.clearOrExit(1_000);
      return shell.clearOrExit(1_200);
    } },
  ])("fully disposes the owned presentation after $route", async ({ exit }) => {
    const { engine, shell, terminal } = await fixture([], [], true);
    const appendWorkflowResult = vi.spyOn(shell.root, "appendWorkflowResult");
    try {
      await expect(exit(shell)).resolves.toEqual({ outcome: "completed", diagnostic: null });
      await expect(shell.waitUntilStopped()).resolves.toBeUndefined();
      expect(engine.calls).toContain("dispose");
      expect(shell.runtime.active).toBe(false);
      expect(terminal.active).toBe(false);
      expect(appendWorkflowResult).not.toHaveBeenCalledWith(expect.objectContaining({ command: "quit" }));
      expect(terminal.writes.join("")).toContain("\u001b[?1049l");
    } finally { await shell.dispose(); }
  });

  it("coalesces overlapping quit requests through one complete shutdown", async () => {
    const { engine, adapter, shell, terminal } = await fixture([], [], true);
    let finishDispose!: () => void;
    vi.spyOn(engine, "dispose").mockImplementation(() => new Promise<void>(resolve => { finishDispose = resolve; }));
    const executeWorkflow = vi.spyOn(adapter, "executeWorkflow");
    const first = shell.shutdown();
    const second = shell.shutdown();
    try {
      await vi.waitFor(() => expect(finishDispose).toBeTypeOf("function"));
      expect(executeWorkflow).toHaveBeenCalledTimes(1);
      finishDispose();
      await expect(Promise.all([first, second])).resolves.toEqual([
        { outcome: "completed", diagnostic: null },
        { outcome: "completed", diagnostic: null },
      ]);
      expect(shell.runtime.active).toBe(false);
      expect(terminal.active).toBe(false);
    } finally {
      finishDispose?.();
      await Promise.allSettled([first, second]);
      await shell.dispose();
    }
  });

  it("retains package identity in compact extension labels and uniquely identifies local entries", async () => {
    const { shell } = await fixture([], [
      {
        path: "C:\\Users\\test\\.a1\\agent\\npm\\node_modules\\@narumitw\\pi-statusline\\dist\\index.ts",
        resolvedPath: "C:\\Users\\test\\.a1\\agent\\npm\\node_modules\\@narumitw\\pi-statusline\\dist\\index.ts",
        sourceInfo: {
          path: "C:\\Users\\test\\.a1\\agent\\npm\\node_modules\\@narumitw\\pi-statusline\\dist\\index.ts",
          source: "npm:@narumitw/pi-statusline",
          scope: "user",
          origin: "package",
          baseDir: "C:\\Users\\test\\.a1\\agent\\npm\\node_modules\\@narumitw\\pi-statusline",
        },
      },
      {
        path: "/home/test/.a1/agent/npm/node_modules/pi-mcp-adapter/index.js",
        resolvedPath: "/home/test/.a1/agent/npm/node_modules/pi-mcp-adapter/index.js",
        sourceInfo: {
          path: "/home/test/.a1/agent/npm/node_modules/pi-mcp-adapter/index.js",
          source: "npm:pi-mcp-adapter",
          scope: "user",
          origin: "package",
          baseDir: "/home/test/.a1/agent/npm/node_modules/pi-mcp-adapter",
        },
      },
      {
        path: "D:/work/one/shared/index.ts",
        resolvedPath: "D:/work/one/shared/index.ts",
        sourceInfo: { path: "D:/work/one/shared/index.ts", source: "local", scope: "project", origin: "top-level", baseDir: "D:/work" },
      },
      {
        path: "D:/work/two/shared/index.ts",
        resolvedPath: "D:/work/two/shared/index.ts",
        sourceInfo: { path: "D:/work/two/shared/index.ts", source: "local", scope: "project", origin: "top-level", baseDir: "D:/work" },
      },
      {
        path: "D:/work/hidden/shared/index.ts",
        resolvedPath: "D:/work/hidden/shared/index.ts",
        hidden: true,
        sourceInfo: { path: "D:/work/hidden/shared/index.ts", source: "local", scope: "project", origin: "top-level", baseDir: "D:/work" },
      },
    ]);

    const frame = stripTerminalSequences(shell.root.render(120).join("\n"));
    expect(frame).toContain("@narumitw/pi-statusline:dist");
    expect(frame).toContain("pi-mcp-adapter");
    expect(frame).toContain("one/shared");
    expect(frame).toContain("two/shared");
    expect(frame).not.toContain("hidden/shared");
    expect(frame).not.toContain("  dist,");
    await shell.dispose();
  });

  it("opens the configured fork selector on double escape with an empty editor", async () => {
    const { engine, terminal, shell } = await fixture([], [], true);
    engine.doubleEscapeAction = "fork";

    terminal.input("\x1b");
    expect(shell.root.usesDefaultInputSurface()).toBe(true);
    terminal.input("\x1b");
    expect(shell.root.usesDefaultInputSurface()).toBe(false);
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("Fork point");

    terminal.input("\x1b");
    engine.doubleEscapeAction = "none";
    terminal.input("\x1b");
    terminal.input("\x1b");
    expect(shell.root.usesDefaultInputSurface()).toBe(true);
    await shell.dispose();
  });

  it("keeps startup neutral while composition selects the owned session shell", async () => {
    const [source, composition] = await Promise.all([
      readFile("src/features/owned-ui/run.ts", "utf8"),
      readFile("src/composition/owned-ui.ts", "utf8"),
    ]);
    expect(source).toContain("OwnedUiApplicationPort");
    expect(source).not.toMatch(/Pi|Adapter|OwnedUiSessionShell|OwnedTerminalRuntime|OwnedPromptEditor|OwnedSessionRootComponent|createProcessTerminalHost/);
    expect(composition).toContain("OwnedUiSessionShell");
  });
});

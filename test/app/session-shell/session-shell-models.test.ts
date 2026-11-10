import { describe, expect, it, vi } from "vitest";
import { stripTerminalSequences } from "@earendil-works/pi-tui";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AgentSessionRuntime } from "@earendil-works/pi-coding-agent";
import { fixture as sessionFixture, Runtime } from "./session-shell-fixture.js";
import { OwnedUiSessionShell } from "../../../src/app/session-shell/index.js";
import type { TerminalComponentPort } from "../../../src/contracts/presentation/index.js";
import { TestPresentationTerminal } from "../../features/owned-ui/neutral-port-doubles.js";
import { createPiEngineAdapter } from "../../../src/integrations/pi/engine/index.js";
import { createPiSessionPresenters } from "../../../src/integrations/pi/session-presenters/index.js";
import { createPiShellEditor, OWNED_BUILTIN_SLASH_COMMANDS, PINNED_PI_BUILTIN_SLASH_COMMANDS } from "../../../src/integrations/pi/components/index.js";
import { OWNED_WORKFLOW_COMMAND_NAMES, PINNED_PI_DECLINED_COMMAND_NAMES, PINNED_PI_WORKFLOW_COMMAND_NAMES, workflowCommandNames } from "../../../src/integrations/pi/engine/index.js";

const ENTER = "\r", ESCAPE = "\u001b", DOWN = "\u001b[B", CTRL_S = "\u0013";
const active = new WeakMap<OwnedUiSessionShell, () => TerminalComponentPort | undefined>();
function observe(shell: OwnedUiSessionShell): void {
  let component: TerminalComponentPort | undefined;
  const show = shell.runtime.showOverlay.bind(shell.runtime);
  vi.spyOn(shell.runtime, "showOverlay").mockImplementation((next, options) => {
    const handle = show(next, options);
    if (options?.modal) component = next;
    return {
      hide: () => { handle.hide(); if (component === next) component = undefined; },
      setHidden: hidden => handle.setHidden(hidden), isHidden: () => handle.isHidden(),
      focus: () => handle.focus(), unfocus: options => handle.unfocus(options),
      isFocused: () => handle.isFocused(), getBounds: () => handle.getBounds(),
    };
  });
  active.set(shell, () => component);
}
async function fixture(...args: Parameters<typeof sessionFixture>) {
  const result = await sessionFixture(...args);
  observe(result.shell);
  return result;
}
const nextImmediate = () => new Promise(resolve => setImmediate(resolve));
function frame(shell: OwnedUiSessionShell, width = 100): string {
  return stripTerminalSequences([...shell.root.render(width), ...active.get(shell)?.()?.render(width) ?? []].join("\n"));
}
function input(shell: OwnedUiSessionShell, data: string): void {
  const component = active.get(shell)?.();
  if (component !== undefined) component.handleInput?.(data);
  else shell.root.handleInput(data);
}
const defaultSurface = (shell: OwnedUiSessionShell) => !shell.runtime.hasOverlay() && shell.root.usesDefaultInputSurface();

describe("bare-A1 unified Models dialog", () => {
  it("separates apps from Agent commands and retains the complete pinned command manifest", async () => {
    const ownedBuiltIns = OWNED_BUILTIN_SLASH_COMMANDS.map(command => command.name);
    expect(ownedBuiltIns).toEqual(OWNED_WORKFLOW_COMMAND_NAMES);
    expect(ownedBuiltIns.slice(0, 3)).toEqual(["models", "thinking", "tree"]);
    for (const removed of ["model", "scoped-models", "settings", "changelog"]) expect(ownedBuiltIns).not.toContain(removed);
    expect(ownedBuiltIns).toHaveLength(PINNED_PI_BUILTIN_SLASH_COMMANDS.length - 3);
    expect(OWNED_WORKFLOW_COMMAND_NAMES).toHaveLength(PINNED_PI_WORKFLOW_COMMAND_NAMES.length - 3);
    expect(workflowCommandNames("comparison")).toBe(PINNED_PI_WORKFLOW_COMMAND_NAMES);
    for (const retained of ["model", "scoped-models", "settings", "changelog"]) expect(PINNED_PI_WORKFLOW_COMMAND_NAMES).toContain(retained);
    for (const name of ["thinking", "login"]) {
      expect(OWNED_BUILTIN_SLASH_COMMANDS.find(command => command.name === name)).not.toHaveProperty("argumentHint");
      expect(PINNED_PI_BUILTIN_SLASH_COMMANDS.find(command => command.name === name)).toHaveProperty("argumentHint");
    }
    const commandMap = JSON.parse(await readFile("node_modules/@earendil-works/pi-coding-agent/dist/core/slash-commands.js.map", "utf8")) as { sourcesContent: string[] };
    const manifest = commandMap.sourcesContent[0]!.slice(commandMap.sourcesContent[0]!.indexOf("BUILTIN_SLASH_COMMANDS"));
    const advertised = [...manifest.slice(0, manifest.indexOf("];")).matchAll(/name:\s*"([^"]+)"/g)].map(match => match[1]!);
    const declined: readonly string[] = PINNED_PI_DECLINED_COMMAND_NAMES;
    expect(PINNED_PI_BUILTIN_SLASH_COMMANDS.map(command => command.name)).toEqual(advertised.filter(name => !declined.includes(name)));
    const editor = createPiShellEditor({
      getColumns: () => 80, getRows: () => 24, requestRender() {}, onSubmit() {}, cwd: "D:/work", keybindingProfile: "a1",
      autocompleteCommands: [
        { name: "models", source: "builtin", argumentOptions: [{ id: "openai/gpt-5", label: "GPT-5" }] },
        { name: "model", source: "extension", description: "Extension command named model" },
      ],
    });
    for (const character of "/mod") editor.handleInput?.(character);
    await nextImmediate();
    const rows = editor.render(80).join("\n");
    expect(rows).toContain("Switch models and manage scoped model cycling");
    expect(rows).toContain("Extension command named model");
    expect(rows).not.toContain("scoped-models");
    expect(rows).not.toContain("Select model (opens selector UI)");
  });

  it("opens /models as a floating dialog with argument seeding and preserves removed-command routing", async () => {
    const { engine, shell, adapter } = await fixture([], [], true);
    try {
      expect(adapter.workflows.workflowAutocompleteCommands().find(command => command.source === "builtin" && command.name.startsWith("model"))?.name).toBe("models");
      await shell.submit("/model"); await shell.submit("/scoped-models openai/gpt-5");
      expect(engine.session.calls).toContain("prompt:/model");
      expect(engine.session.calls).toContain("prompt:/scoped-models openai/gpt-5");
      await shell.submit("/models claude");
      expect(defaultSurface(shell)).toBe(false);
      expect(shell.root.usesDefaultInputSurface()).toBe(true);
      expect(frame(shell)).toContain("Filter: all | scoped");
      expect(frame(shell)).toContain("→ ○ claude [anthropic]");
      expect(frame(shell)).not.toContain("gpt-5 [openai]");
      expect(engine.session.calls).not.toContain("setModel");
      input(shell, ESCAPE);
      expect(defaultSurface(shell)).toBe(true);
      await shell.submit("/models");
      expect(frame(shell)).toContain("→ ○ gpt-5 [openai] ✓");
      expect(frame(shell)).toContain("  ○ claude [anthropic]");
      expect(frame(shell)).toContain("Space scope  Ctrl+S save  Esc close");
      input(shell, ESCAPE);
      const open = vi.spyOn(shell.selectors, "showModelsDialog"), pinned = vi.spyOn(shell.selectors, "showModelSelector");
      shell.root.editor.reloadKeybindings();
      await shell.runWorkflow({ command: "models", argument: "" });
      expect(open).toHaveBeenCalledWith(undefined);
      expect(pinned).not.toHaveBeenCalled();
      input(shell, ESCAPE);
    } finally { await shell.dispose(); }
  });

  it("opens the floating dialog from an explicitly configured model-selection binding", async () => {
    const agentDir = await mkdtemp(join(tmpdir(), "a1-models-bindings-"));
    await writeFile(join(agentDir, "keybindings.json"), JSON.stringify({ "app.model.select": "ctrl+m" }));
    const engine = new Runtime();
    const adapter = await createPiEngineAdapter({ cwd: "D:/work", agentDir, sessionId: "owned-shell", createRuntime: async () => engine as unknown as AgentSessionRuntime });
    const terminal = new TestPresentationTerminal();
    const shell = new OwnedUiSessionShell({ presenters: createPiSessionPresenters(adapter),
      engine: { backend: adapter, cwd: "D:/work", sessionLayout: "custom-viewport" }, presentation: { terminal, reload: { minVisibleMs: 0 } } });
    observe(shell); shell.start(); shell.runtime.renderNow();
    try {
      shell.root.editor.setText("retained draft");
      const open = vi.spyOn(shell.selectors, "showModelsDialog"), pinned = vi.spyOn(shell.selectors, "showModelSelector");
      expect(shell.root.editor.keybindingConfig()["app.model.select"]).toEqual("ctrl+m");
      terminal.input("\u001b[109;5u");
      await vi.waitFor(() => expect(open).toHaveBeenCalledOnce());
      await vi.dynamicImportSettled();
      expect(pinned).not.toHaveBeenCalled();
      expect(defaultSurface(shell)).toBe(false);
      expect(frame(shell)).toContain("→ ○ gpt-5 [openai] ✓");
      terminal.input(ESCAPE);
      expect(shell.root.editor.getText()).toBe("retained draft");
    } finally { await shell.dispose(); await rm(agentDir, { recursive: true, force: true }); }
  });

  it("switches only the current model on Enter and confirms solely through footer state", async () => {
    const { engine, shell, adapter } = await fixture([], [], true);
    try {
      await shell.submit("/models"); input(shell, DOWN);
      expect(frame(shell)).toContain("→ ○ claude [anthropic]");
      input(shell, ENTER);
      await vi.waitFor(() => expect(defaultSurface(shell)).toBe(true));
      expect(engine.session.calls).toContain("setModel");
      expect(engine.session.lastSetModelOptions).toEqual({ persist: false });
      expect(engine.session.model).toEqual({ provider: "anthropic", id: "claude", name: "Claude" });
      expect(adapter.session.view().activeModel?.modelId).toBe("claude");
      expect(frame(shell)).toContain("claude");
      expect(frame(shell)).not.toContain("Model: claude");
      expect(frame(shell)).not.toContain("Switched to");
      expect(engine.enabledModels).toBeUndefined();
      expect(engine.session.calls.filter(call => call.startsWith("scoped:"))).toEqual([]);
    } finally { await shell.dispose(); }
  });

  it("keeps direct and cycling model changes quiet while publishing model and thinking state", async () => {
    const { engine, shell, adapter } = await fixture([], [], true);
    try {
      await shell.runWorkflow({ command: "model", argument: "", selection: "anthropic/claude" });
      expect(adapter.session.view().activeModel?.modelId).toBe("claude");
      expect(frame(shell)).not.toContain("Model: claude");
      Object.assign(engine.session, { cycleModel: async () => {
        engine.session.model = { provider: "openai", id: "gpt-5", name: "GPT-5", reasoning: true };
        engine.session.thinkingLevel = "high";
        return { model: engine.session.model, thinkingLevel: "high" };
      } });
      await shell.cycleModel("forward");
      expect(adapter.session.view().activeModel?.modelId).toBe("gpt-5");
      expect(adapter.session.view().thinkingLevel).toBe("high");
      expect(frame(shell)).not.toContain("Switched to");
      await vi.waitFor(() => expect(frame(shell)).toContain("high"));
    } finally { await shell.dispose(); }
  });

  it("keeps a failed switch visible in the still-open floating dialog", async () => {
    const { engine, shell } = await fixture([], [], true);
    try {
      engine.session.setModel = async () => { throw new Error("No API key for anthropic/claude"); };
      await shell.submit("/models"); input(shell, DOWN); input(shell, ENTER);
      await nextImmediate(); await nextImmediate();
      expect(defaultSurface(shell)).toBe(false);
      expect(frame(shell)).toContain("No API key for anthropic/claude");
      expect(frame(shell)).toContain("Models");
      input(shell, ESCAPE);
    } finally { await shell.dispose(); }
  });

  it("retains unsaved session scope through save errors, cancel, and reopening", async () => {
    const { engine, shell } = await fixture([], [], true);
    try {
      await shell.submit("/models");
      expect(frame(shell)).not.toContain("(unsaved)");
      input(shell, " ");
      expect(frame(shell)).toContain("Models (unsaved)");
      expect(frame(shell)).toContain("→ ● gpt-5 [openai] ✓");
      expect(engine.session.calls).toContain("scoped:1");
      expect(engine.session.scopedModels).toEqual([{ model: { provider: "openai", id: "gpt-5", name: "GPT-5" } }]);
      expect(engine.enabledModels).toBeUndefined();
      input(shell, CTRL_S); await nextImmediate();
      expect(engine.enabledModels).toEqual(["openai/gpt-5"]);
      expect(frame(shell)).toContain("Model selection saved to settings");
      expect(frame(shell)).not.toContain("(unsaved)");
      engine.services.settingsManager.setEnabledModels = () => { throw new Error("settings are read-only"); };
      input(shell, DOWN); input(shell, " "); input(shell, CTRL_S); await nextImmediate();
      expect(frame(shell)).toContain("Models (unsaved)");
      expect(frame(shell)).toContain("settings are read-only");
      expect(defaultSurface(shell)).toBe(false);
      expect(engine.enabledModels).toEqual(["openai/gpt-5"]);
      input(shell, ESCAPE);
      expect(defaultSurface(shell)).toBe(true);
      expect(frame(shell)).not.toContain("cancelled");
      expect(frame(shell)).not.toContain("Models (unsaved)");
      expect(engine.session.scopedModels).toHaveLength(2);
      expect(engine.enabledModels).toEqual(["openai/gpt-5"]);
      await shell.submit("/models");
      expect(frame(shell)).toContain("Models (unsaved)");
      expect(frame(shell)).toContain("● claude [anthropic]");
      input(shell, ESCAPE);
    } finally { await shell.dispose(); }
  });

  it("starts from persisted scope and clears its setting when the scope empties", async () => {
    const { engine, shell } = await fixture([], [], true, undefined, undefined, undefined, undefined, undefined, undefined, runtime => {
      runtime.enabledModels = ["anthropic/*", "missing/model"];
    });
    try {
      await shell.submit("/models");
      expect(frame(shell)).not.toContain("(unsaved)");
      expect(frame(shell)).toContain("  ● claude [anthropic]");
      expect(frame(shell)).toContain("→ ○ gpt-5 [openai] ✓");
      input(shell, "\t");
      expect(frame(shell)).toContain("→ ● claude [anthropic]");
      expect(frame(shell)).not.toContain("gpt-5 [openai]");
      input(shell, " ");
      expect(engine.session.calls).toContain("scoped:0");
      expect(frame(shell)).toContain("→ ○ claude [anthropic]");
      expect(frame(shell)).toContain("Models (unsaved)");
      input(shell, CTRL_S); await nextImmediate();
      expect(engine.enabledModels).toBeUndefined();
      expect(frame(shell)).not.toContain("(unsaved)");
      input(shell, ESCAPE);
    } finally { await shell.dispose(); }
  });

  it("refreshes quietly without discarding edits and retains failures, timeout, and stale-result guards", async () => {
    vi.useFakeTimers();
    try {
      const { engine, shell, adapter } = await fixture([], [], true);
      try {
        type RefreshResult = Awaited<ReturnType<typeof engine.services.modelRuntime.refresh>>;
        let finishRefresh!: (value: RefreshResult) => void;
        const refresh = vi.fn(() => new Promise<RefreshResult>(resolve => { finishRefresh = resolve; }));
        engine.services.modelRuntime.refresh = refresh;
        await shell.submit("/models");
        expect(refresh).toHaveBeenCalledOnce();
        expect(frame(shell)).not.toContain("Refreshing model catalogs…");
        for (const character of "gpt") input(shell, character);
        input(shell, " ");
        engine.availableModels.push({ provider: "google", id: "gemini", name: "Gemini" });
        engine.providerAuthStatus.set("google", { configured: true, source: "stored" });
        finishRefresh({ aborted: false, errors: new Map() });
        await vi.advanceTimersByTimeAsync(0);
        expect(frame(shell)).toContain("Models (unsaved)");
        expect(frame(shell)).toContain("→ ● gpt-5 [openai] ✓");
        expect(frame(shell)).not.toContain("gemini");
        expect(frame(shell)).not.toContain("(refreshing)");
        expect(frame(shell)).not.toContain("Model catalogs refreshed.");
        for (let index = 0; index < 3; index++) input(shell, "\u007f");
        expect(frame(shell)).toContain("  ○ gemini [google]");
        input(shell, ESCAPE);
        for (const [refreshing, expected] of [
          [async () => ({ aborted: false, errors: new Map([["openai", new Error("offline")]]) }), "Could not refresh openai; showing cached models."],
          [async () => { throw new Error("network down"); }, "Could not refresh model catalogs: network down"],
        ] as const) {
          engine.services.modelRuntime.refresh = refreshing;
          await shell.submit("/models"); await vi.advanceTimersByTimeAsync(0);
          expect(frame(shell)).toContain(expected);
          expect(frame(shell)).not.toContain("(refreshing)");
          input(shell, ESCAPE);
        }
        (engine.services.modelRuntime as { refresh: (options: { signal: AbortSignal }) => Promise<RefreshResult> }).refresh = ({ signal }) => new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(new Error("aborted")));
        });
        await shell.submit("/models"); await vi.advanceTimersByTimeAsync(15_000);
        expect(frame(shell)).toContain("Model refresh timed out; showing cached models.");
        expect(defaultSurface(shell)).toBe(false);
        input(shell, ESCAPE);
        let lateRefresh!: (value: RefreshResult) => void;
        engine.services.modelRuntime.refresh = () => new Promise(resolve => { lateRefresh = resolve; });
        await shell.submit("/models"); input(shell, ESCAPE);
        lateRefresh({ aborted: false, errors: new Map() }); await vi.advanceTimersByTimeAsync(0);
        expect(defaultSurface(shell)).toBe(true);
        expect(adapter.view().lifecycle).not.toBe("stopped");
      } finally { await shell.dispose(); }
    } finally { vi.useRealTimers(); }
  });

  it("keeps comparison on pinned model, scoped-model, Settings, and Changelog commands", async () => {
    const { engine, shell } = await fixture();
    try {
      await shell.submit("/models");
      expect(engine.session.calls).toContain("prompt:/models");
      expect(defaultSurface(shell)).toBe(true);
      await shell.submit("/model");
      expect(frame(shell)).toContain("Only showing models from configured providers");
      input(shell, ESCAPE);
      await shell.submit("/scoped-models");
      expect(frame(shell)).toContain("Model Configuration");
      input(shell, ESCAPE);
    } finally { await shell.dispose(); }
  });
});

import { describe, expect, it, vi } from "vitest";
import { stripTerminalSequences } from "@earendil-works/pi-tui";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AgentSessionRuntime } from "@earendil-works/pi-coding-agent";
import { fixture, Runtime } from "./session-shell-fixture.js";
import { OwnedUiSessionShell } from "../../../src/app/session-shell/index.js";
import { TestPresentationTerminal } from "../../features/owned-ui/neutral-port-doubles.js";
import { createPiEngineAdapter } from "../../../src/integrations/pi/engine/index.js";
import { createPiShellEditor, OWNED_BUILTIN_SLASH_COMMANDS, PINNED_PI_BUILTIN_SLASH_COMMANDS } from "../../../src/integrations/pi/components/index.js";
import { OWNED_WORKFLOW_COMMAND_NAMES, PINNED_PI_DECLINED_COMMAND_NAMES, PINNED_PI_WORKFLOW_COMMAND_NAMES, workflowCommandNames } from "../../../src/integrations/pi/engine/index.js";

const SPACE = " ";
const ENTER = "\r";
const ESCAPE = "\u001b";
const CTRL_S = "\u0013";
const DOWN = "\u001b[B";

async function nextImmediate(): Promise<void> {
  await new Promise(resolve => setImmediate(resolve));
}

function frame(shell: Awaited<ReturnType<typeof fixture>>["shell"], width = 100): string {
  return stripTerminalSequences(shell.root.render(width).join("\n"));
}

describe("bare-A1 unified Models dialog", () => {
  it("advertises only /models in bare A1 and keeps the pinned pair for the comparison profile", async () => {
    expect(OWNED_WORKFLOW_COMMAND_NAMES).toContain("models");
    expect(OWNED_WORKFLOW_COMMAND_NAMES).not.toContain("model");
    expect(OWNED_WORKFLOW_COMMAND_NAMES).not.toContain("scoped-models");
    expect(OWNED_WORKFLOW_COMMAND_NAMES).toHaveLength(PINNED_PI_WORKFLOW_COMMAND_NAMES.length - 1);
    expect(workflowCommandNames("comparison")).toBe(PINNED_PI_WORKFLOW_COMMAND_NAMES);
    expect(PINNED_PI_WORKFLOW_COMMAND_NAMES).toContain("model");
    expect(PINNED_PI_WORKFLOW_COMMAND_NAMES).toContain("scoped-models");
    const ownedBuiltIns = OWNED_BUILTIN_SLASH_COMMANDS.map(command => command.name);
    expect(ownedBuiltIns).toContain("models");
    expect(ownedBuiltIns).not.toContain("model");
    expect(ownedBuiltIns).not.toContain("scoped-models");
    expect(ownedBuiltIns.slice(0, 4)).toEqual(["settings", "models", "thinking", "tree"]);
    expect(ownedBuiltIns).toEqual(OWNED_WORKFLOW_COMMAND_NAMES);
    expect(ownedBuiltIns.every(name => (OWNED_WORKFLOW_COMMAND_NAMES as readonly string[]).includes(name))).toBe(true);
    expect(ownedBuiltIns).toHaveLength(PINNED_PI_BUILTIN_SLASH_COMMANDS.length - 1);
    // Invariant: the editor catalog is the engine's advertised manifest in the engine's order, minus the
    // commands A1 declines. Comparing the owned list against A1's own pinned list cannot see a command
    // missing from both, which is how thinking stayed unlisted while its route worked.
    const commandMap = JSON.parse(await readFile("node_modules/@earendil-works/pi-coding-agent/dist/core/slash-commands.js.map", "utf8")) as { sourcesContent: string[] };
    const manifest = commandMap.sourcesContent[0]!.slice(commandMap.sourcesContent[0]!.indexOf("BUILTIN_SLASH_COMMANDS"));
    const advertised = [...manifest.slice(0, manifest.indexOf("];")).matchAll(/name:\s*"([^"]+)"/g)].map(match => match[1]!);
    const declined: readonly string[] = PINNED_PI_DECLINED_COMMAND_NAMES;
    expect(PINNED_PI_BUILTIN_SLASH_COMMANDS.map(command => command.name))
      .toEqual(advertised.filter(name => !declined.includes(name)));

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
    expect(rows).toContain("models");
    expect(rows).toContain("Switch models and manage scoped model cycling");
    expect(rows).not.toContain("scoped-models");
    expect(rows).not.toContain("Select model (opens selector UI)");
    expect(rows).toContain("Extension command named model");
  });

  it("routes /models, argument seeding, and the explicit shortcut to the dialog while the removed names become prompt input", async () => {
    const { engine, shell, adapter } = await fixture([], [], true);
    try {
      expect(adapter.workflowAutocompleteCommands().find(command => command.source === "builtin" && command.name.startsWith("model"))?.name).toBe("models");
      await shell.submit("/model");
      await shell.submit("/scoped-models openai/gpt-5");
      expect(engine.session.calls).toContain("prompt:/model");
      expect(engine.session.calls).toContain("prompt:/scoped-models openai/gpt-5");
      expect(shell.root.usesDefaultInputSurface()).toBe(true);

      await shell.submit("/models claude");
      expect(shell.root.usesDefaultInputSurface()).toBe(false);
      let text = frame(shell);
      expect(text).toContain("Models");
      expect(text).toContain("Filter: all | scoped");
      expect(text).toContain("→ ○ claude [anthropic]");
      expect(text).not.toContain("gpt-5 [openai]");
      expect(engine.session.calls).not.toContain("setModel");
      shell.root.handleInput(ESCAPE);
      expect(shell.root.usesDefaultInputSurface()).toBe(true);

      await shell.submit("/models");
      text = frame(shell);
      expect(text).toContain("→ ○ gpt-5 [openai] ✓");
      expect(text).toContain("  ○ claude [anthropic]");
      expect(text).toContain("space scope  ctrl+s save  esc close");
      shell.root.handleInput(ESCAPE);

      const open = vi.spyOn(shell, "showModelsDialog");
      const pinned = vi.spyOn(shell, "showModelSelector");
      shell.root.editor.reloadKeybindings();
      await shell.runWorkflow({ command: "models", argument: "" });
      expect(open).toHaveBeenCalledWith(undefined);
      expect(pinned).not.toHaveBeenCalled();
      shell.root.handleInput(ESCAPE);
    } finally { await shell.dispose(); }
  });

  it("opens the dialog from an explicitly configured model-selection binding", async () => {
    const agentDir = await mkdtemp(join(tmpdir(), "a1-models-bindings-"));
    await writeFile(join(agentDir, "keybindings.json"), JSON.stringify({ "app.model.select": "ctrl+m" }));
    const engine = new Runtime();
    const adapter = await createPiEngineAdapter({ cwd: "D:/work", agentDir, sessionId: "owned-shell", createRuntime: async () => engine as unknown as AgentSessionRuntime });
    const terminal = new TestPresentationTerminal();
    const shell = new OwnedUiSessionShell({
      engine: { backend: adapter, cwd: "D:/work", sessionLayout: "custom-viewport" },
      presentation: { terminal, reload: { minVisibleMs: 0 } },
    });
    shell.start();
    shell.runtime.renderNow();
    try {
      const open = vi.spyOn(shell, "showModelsDialog");
      const pinned = vi.spyOn(shell, "showModelSelector");
      expect(shell.root.editor.keybindingConfig()["app.model.select"]).toEqual("ctrl+m");
      terminal.input("\u001b[109;5u");
      await vi.waitFor(() => expect(open).toHaveBeenCalledOnce());
      expect(pinned).not.toHaveBeenCalled();
      expect(shell.root.usesDefaultInputSurface()).toBe(false);
      expect(frame(shell)).toContain("→ ○ gpt-5 [openai] ✓");
      shell.root.handleInput(ESCAPE);
    } finally {
      await shell.dispose();
      await rm(agentDir, { recursive: true, force: true });
    }
  });

  it("switches and persists the model on Enter, closes the dialog, and shows the confirmation as a dock notice", async () => {
    const { engine, shell } = await fixture([], [], true);
    try {
      await shell.submit("/models");
      shell.root.handleInput(DOWN);
      expect(frame(shell)).toContain("→ ○ claude [anthropic]");
      shell.root.handleInput(ENTER);
      await vi.waitFor(() => expect(shell.root.usesDefaultInputSurface()).toBe(true));
      expect(engine.session.calls).toContain("setModel");
      expect(engine.session.model).toEqual({ provider: "anthropic", id: "claude", name: "Claude" });
      const rows = shell.root.render(100).map(stripTerminalSequences);
      const notice = rows.findIndex(row => row.includes("Default model: anthropic/claude"));
      expect(notice).toBeGreaterThan(0);
      expect(rows[notice - 1]).toBe("");
      expect(engine.enabledModels).toBeUndefined();
      expect(engine.session.calls.filter(call => call.startsWith("scoped:"))).toEqual([]);
    } finally { await shell.dispose(); }
  });

  it("keeps a failed switch inside the open dialog with the error in the transcript", async () => {
    const { engine, shell } = await fixture([], [], true);
    try {
      engine.session.setModel = async () => { throw new Error("No API key for anthropic/claude"); };
      await shell.submit("/models");
      shell.root.handleInput(DOWN);
      shell.root.handleInput(ENTER);
      await nextImmediate();
      await nextImmediate();
      expect(shell.root.usesDefaultInputSurface()).toBe(false);
      expect(frame(shell)).toContain("No API key for anthropic/claude");
      expect(frame(shell)).toContain("Models");
      shell.root.handleInput(ESCAPE);
    } finally { await shell.dispose(); }
  });

  it("keeps scope edits session-only until Ctrl+S, clears (unsaved) only after a successful save, and cancels silently", async () => {
    const { engine, shell } = await fixture([], [], true);
    try {
      await shell.submit("/models");
      expect(frame(shell)).not.toContain("(unsaved)");
      shell.root.handleInput(SPACE);
      let text = frame(shell);
      expect(text).toContain("Models (unsaved)");
      expect(text).toContain("→ ● gpt-5 [openai] ✓");
      expect(engine.session.calls).toContain("scoped:1");
      expect(engine.session.scopedModels).toEqual([{ model: { provider: "openai", id: "gpt-5", name: "GPT-5" } }]);
      expect(engine.enabledModels).toBeUndefined();

      shell.root.handleInput(CTRL_S);
      await nextImmediate();
      text = frame(shell);
      expect(engine.enabledModels).toEqual(["openai/gpt-5"]);
      expect(text).toContain("Model selection saved to settings");
      expect(text).not.toContain("(unsaved)");
      expect(shell.root.usesDefaultInputSurface()).toBe(false);

      engine.services.settingsManager.setEnabledModels = () => { throw new Error("settings are read-only"); };
      shell.root.handleInput(DOWN);
      shell.root.handleInput(SPACE);
      shell.root.handleInput(CTRL_S);
      await nextImmediate();
      text = frame(shell);
      expect(text).toContain("Models (unsaved)");
      expect(text).toContain("settings are read-only");
      expect(shell.root.usesDefaultInputSurface()).toBe(false);
      expect(engine.enabledModels).toEqual(["openai/gpt-5"]);

      shell.root.handleInput(ESCAPE);
      text = frame(shell);
      expect(shell.root.usesDefaultInputSurface()).toBe(true);
      expect(text).not.toContain("Models (unsaved)");
      expect(text).not.toContain("cancelled");
      expect(engine.session.scopedModels).toHaveLength(2);
      expect(engine.enabledModels).toEqual(["openai/gpt-5"]);

      // Invariant: reopening starts from the explicit session scope, so the unsaved edit is still visible and dirty.
      await shell.submit("/models");
      text = frame(shell);
      expect(text).toContain("Models (unsaved)");
      expect(text).toContain("● claude [anthropic]");
      shell.root.handleInput(ESCAPE);
    } finally { await shell.dispose(); }
  });

  it("starts from the persisted scope when the session has none and clears the setting when the scope empties", async () => {
    const { engine, shell } = await fixture([], [], true, undefined, undefined, undefined, undefined, undefined, undefined, runtime => {
      runtime.enabledModels = ["anthropic/*", "missing/model"];
    });
    try {
      await shell.submit("/models");
      let text = frame(shell);
      expect(text).not.toContain("(unsaved)");
      expect(text).toContain("  ● claude [anthropic]");
      expect(text).toContain("→ ○ gpt-5 [openai] ✓");
      shell.root.handleInput("\t");
      text = frame(shell);
      expect(text).toContain("→ ● claude [anthropic]");
      expect(text).not.toContain("gpt-5 [openai]");
      shell.root.handleInput(SPACE);
      expect(engine.session.calls).toContain("scoped:0");
      // Rationale: the saved member stays listed in the scoped filter so it can be restored before saving.
      expect(frame(shell)).toContain("→ ○ claude [anthropic]");
      expect(frame(shell)).toContain("Models (unsaved)");
      shell.root.handleInput(CTRL_S);
      await nextImmediate();
      expect(engine.enabledModels).toBeUndefined();
      expect(frame(shell)).not.toContain("(unsaved)");
      shell.root.handleInput(ESCAPE);
    } finally { await shell.dispose(); }
  });

  it("refreshes catalogs without discarding pending edits and reports success, failure, error, and timeout", async () => {
    vi.useFakeTimers();
    try {
      const { engine, shell, adapter } = await fixture([], [], true);
      try {
        type RefreshResult = Awaited<ReturnType<typeof engine.services.modelRuntime.refresh>>;
        let finishRefresh!: (value: RefreshResult) => void;
        engine.services.modelRuntime.refresh = () => new Promise<RefreshResult>(resolve => { finishRefresh = resolve; });
        await shell.submit("/models");
        expect(frame(shell)).toContain("  Refreshing model catalogs…");
        for (const character of "gpt") shell.root.handleInput(character);
        shell.root.handleInput(SPACE);
        engine.availableModels.push({ provider: "google", id: "gemini", name: "Gemini" });
        engine.providerAuthStatus.set("google", { configured: true, source: "stored" });
        finishRefresh({ aborted: false, errors: new Map() });
        await vi.advanceTimersByTimeAsync(0);
        let text = frame(shell);
        expect(text).toContain("  Model catalogs refreshed.");
        expect(text).toContain("Models (unsaved)");
        expect(text).toContain("→ ● gpt-5 [openai] ✓");
        expect(text).not.toContain("gemini");
        for (let index = 0; index < 3; index += 1) shell.root.handleInput("\u007f");
        expect(frame(shell)).toContain("  ○ gemini [google]");
        shell.root.handleInput(ESCAPE);

        engine.services.modelRuntime.refresh = async () => ({ aborted: false, errors: new Map([["openai", new Error("offline")]]) });
        await shell.submit("/models");
        await vi.advanceTimersByTimeAsync(0);
        expect(frame(shell)).toContain("  Could not refresh openai; showing cached models.");
        shell.root.handleInput(ESCAPE);

        engine.services.modelRuntime.refresh = async () => { throw new Error("network down"); };
        await shell.submit("/models");
        await vi.advanceTimersByTimeAsync(0);
        expect(frame(shell)).toContain("  Could not refresh model catalogs: network down");
        shell.root.handleInput(ESCAPE);

        (engine.services.modelRuntime as { refresh: (options: { signal: AbortSignal }) => Promise<RefreshResult> }).refresh = ({ signal }) => new Promise<RefreshResult>((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(new Error("aborted")));
        });
        await shell.submit("/models");
        await vi.advanceTimersByTimeAsync(15_000);
        expect(frame(shell)).toContain("  Model refresh timed out; showing cached models.");
        expect(shell.root.usesDefaultInputSurface()).toBe(false);
        shell.root.handleInput(ESCAPE);

        // Invariant: a refresh that completes after the dialog closed touches nothing.
        let lateRefresh!: (value: RefreshResult) => void;
        engine.services.modelRuntime.refresh = () => new Promise<RefreshResult>(resolve => { lateRefresh = resolve; });
        await shell.submit("/models");
        shell.root.handleInput(ESCAPE);
        lateRefresh({ aborted: false, errors: new Map() });
        await vi.advanceTimersByTimeAsync(0);
        expect(shell.root.usesDefaultInputSurface()).toBe(true);
        expect(adapter.view().lifecycle).not.toBe("stopped");
      } finally { await shell.dispose(); }
    } finally { vi.useRealTimers(); }
  });

  it("keeps the comparison profile on the pinned model and scoped-model surfaces", async () => {
    const { engine, shell } = await fixture();
    try {
      await shell.submit("/models");
      expect(engine.session.calls).toContain("prompt:/models");
      expect(shell.root.usesDefaultInputSurface()).toBe(true);
      await shell.submit("/model");
      expect(frame(shell)).toContain("Only showing models from configured providers");
      shell.root.handleInput(ESCAPE);
      await shell.submit("/scoped-models");
      expect(frame(shell)).toContain("Model Configuration");
      shell.root.handleInput(ESCAPE);
    } finally { await shell.dispose(); }
  });
});

import childProcess from "node:child_process";
import { EventEmitter } from "node:events";
import { registerHooks, syncBuiltinESMExports } from "node:module";
import { promisify } from "node:util";
import { resolve, join, basename } from "node:path";
import { pathToFileURL } from "node:url";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createCommandOutcomeState } from "./command-outcome-state.mjs";

const [producer, home, mode, encodedCases] = process.argv.slice(2);
if (mode === "timeout-probe") {
  setInterval(() => {}, 1000);
  await new Promise(() => {});
}
if (!["pinned", "owned"].includes(producer) || !home || !["truecolor", "256color"].includes(mode) || !encodedCases) throw new Error("Invalid outcome producer arguments");
const repository = resolve(import.meta.dirname, "../../../..");
const agentDir = join(home, "agent");
await mkdir(join(home, "tmp"), { recursive: true });
Object.assign(process.env, { PI_CODING_AGENT_DIR: agentDir, TMPDIR: join(home, "tmp"), TMP: join(home, "tmp"), TEMP: join(home, "tmp") });
process.chdir(home);
const nativeSpawn = childProcess.spawn;
let active;
const nativeTimeout = globalThis.setTimeout;
// Rationale: deadline fixtures advance the existing 15-second policy without measuring
// real elapsed time or weakening production timeouts; native cancellation handles remain intact.
globalThis.setTimeout = (callback, delay, ...args) => nativeTimeout(callback, active?.entry.condition === "refresh-timeout" && delay === 15_000 ? 1 : delay, ...args);
globalThis[Symbol.for("a1-command-outcome-state")] = () => active;
registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith("/utils/clipboard.js") && url.includes("/pi-coding-agent/")) return {
      format: "module", shortCircuit: true,
      source: `export async function copyToClipboard(text) { return globalThis[Symbol.for("a1-command-outcome-state")]().host.copyText(text); }
        export async function readClipboardText() { throw new Error("Clipboard read forbidden in outcome fixture"); }`,
    };
    if (url.endsWith("/utils/changelog.js") && url.includes("/pi-coding-agent/")) return {
      format: "module", shortCircuit: true,
      source: `export const getChangelogPath = () => "synthetic-changelog";
        export const parseChangelog = () => [{ version: "fixture", content: "# Fixture release\\n\\nSynthetic changelog text." }];
        export const normalizeChangelogLinks = content => content;
        export const getNewEntries = () => [];`,
    };
    return nextLoad(url, context);
  },
});
// Security: gh and git are deterministic effect boundaries. Only tsx's installed esbuild
// transformer may launch a real child; no fixture can run a provider, git operation or upload.
childProcess.execFile = (command, args, options, callback) => {
  if (command !== "git" || args.join(" ") !== "branch --show-current") throw new Error(`External command forbidden: ${command}`);
  queueMicrotask(() => callback(null, "", ""));
};
childProcess.execFile[promisify.custom] = async (command, args) => {
  if (command !== "git" || args.join(" ") !== "branch --show-current") throw new Error(`External command forbidden: ${command}`);
  return { stdout: "", stderr: "" };
};
childProcess.spawnSync = (command, args) => {
  if (command !== "gh" || args.join(" ") !== "auth status" || !active) throw new Error(`External synchronous command forbidden: ${command}`);
  active.calls.push("auth");
  const condition = active.entry.condition;
  return {
    pid: 0, output: [], signal: null,
    status: ["missing", "permission"].includes(condition) ? null : condition === "unauthenticated" ? 1 : 0,
    stdout: condition === "auth-stderr" ? "" : "authenticated",
    stderr: condition === "auth-stderr" ? "authenticated on stderr" : "",
    ...(["missing", "permission"].includes(condition) ? { error: Object.assign(new Error("synthetic spawn failure"), { code: condition === "missing" ? "ENOENT" : "EACCES" }) } : {}),
  };
};
childProcess.spawn = (command, args, options) => {
  if (["esbuild", "esbuild.exe"].includes(basename(command)) && command.includes("node_modules") && args[0]?.startsWith("--service=")) return nativeSpawn(command, args, options);
  if (command !== "gh" || args[0] !== "gist" || !active) throw new Error(`External child forbidden: ${command}`);
  const state = active;
  state.calls.push("gist");
  if (state.entry.condition === "gist-spawn-failure") throw new Error("synthetic gist spawn failure");
  if (state.entry.condition === "gist-non-error") throw "synthetic thrown value";
  const child = new EventEmitter();
  child.stdout = new EventEmitter(); child.stderr = new EventEmitter(); child.kill = () => true;
  setImmediate(() => {
    if (state.entry.condition === "cancelled") state.onCancel();
    const failed = ["gist-failure", "gist-empty-failure", "gist-signal"].includes(state.entry.condition);
    child.stdout.emit("data", ["malformed", "malformed-stderr"].includes(state.entry.condition) || failed ? "" : "https://gist.github.com/fixture/synthetic-id\n");
    child.stderr.emit("data", failed && state.entry.condition !== "gist-empty-failure" ? "synthetic gist failure\n" : state.entry.condition === "malformed-stderr" ? "synthetic warning" : "");
    child.emit("close", state.entry.condition === "gist-signal" ? null : failed ? 1 : 0);
  });
  return child;
};
syncBuiltinESMExports();
globalThis.fetch = async () => { throw new Error("Network forbidden in command outcome fixture"); };

const api = await import("@earendil-works/pi-coding-agent");
const cwdErrors = await import(pathToFileURL(join(repository, "node_modules/@earendil-works/pi-coding-agent/dist/core/session-cwd.js")).href);
const tui = await import(pathToFileURL(join(repository, "bin/pi-tui.js")).href);
tui.setCapabilities({ ...tui.getCapabilities(), trueColor: mode === "truecolor", hyperlinks: false });
const themeModule = await import(pathToFileURL(join(repository, "node_modules/@earendil-works/pi-coding-agent/dist/modes/interactive/theme/theme.js")).href);
const owned = producer === "owned" ? await import(pathToFileURL(join(repository, "src/integrations/pi/session-ui/session-shell.ts")).href) : undefined;
const engine = producer === "owned" ? await import(pathToFileURL(join(repository, "src/integrations/pi/engine/adapter.ts")).href) : undefined;
const terminalModule = producer === "owned" ? await import(pathToFileURL(join(repository, "test/features/owned-ui/neutral-port-doubles.ts")).href) : undefined;
const ownedTheme = producer === "owned" ? await import(pathToFileURL(join(repository, "src/integrations/pi/components/theme.ts")).href) : undefined;
const pinnedKeys = producer === "pinned" ? await import(pathToFileURL(join(repository, "node_modules/@earendil-works/pi-coding-agent/dist/core/keybindings.js")).href) : undefined;
if (pinnedKeys) tui.setKeybindings(pinnedKeys.KeybindingsManager.create(agentDir));
const cases = JSON.parse(encodedCases);
// Rationale: hidden-command animation starts from equivalent deterministic entropy.
Math.random = () => 0;
const results = [];
for (const theme of ["dark", "light"]) {
  if (ownedTheme) ownedTheme.applyPiTheme(theme, false, mode); else api.initTheme(theme, false);
  for (const padding of [0, 1]) {
    for (const entry of cases) {
      await rm(join(agentDir, "trust.json"), { force: true });
      await rm(join(agentDir, "keybindings.json"), { force: true });
      if (entry.condition === "custom-bindings") {
        await mkdir(agentDir, { recursive: true });
        await writeFile(join(agentDir, "keybindings.json"), JSON.stringify({ "app.model.select": "ctrl+m", "tui.input.tab": "alt+k" }));
      }
      const state = createCommandOutcomeState(home, entry, { ...api, MissingSessionCwdError: cwdErrors.MissingSessionCwdError });
      state.entry = entry;
      active = state;
      state.settingsManager.setOutputPad(padding);
      state.settingsManager.setTheme(theme);
      let shell;
      let adapter;
      let chat;
      let fatalExit;
      let normalExit = false;
      let owner;
      let focused;
      let progressRows;
      const ownedDocument = width => {
        const layout = shell.root.layoutRoot();
        const transcript = layout.type === "stack" ? layout.children[0]?.node : undefined;
        if (transcript?.type !== "scroll" || transcript.id !== "transcript" || transcript.child.type !== "component") throw new Error("Missing semantic transcript region");
        return transcript.child.component.render(width);
      };
      state.onRefresh = () => {
        if (entry.command === "model" && progressRows === undefined) progressRows = [80, 28].map(width => chat ? chat.render(width) : ownedDocument(width));
      };
      const changeBindings = async () => {
        if (!["disk-change", "reload-bindings"].includes(entry.condition)) return;
        await mkdir(agentDir, { recursive: true });
        await writeFile(join(agentDir, "keybindings.json"), JSON.stringify({ "app.model.select": "ctrl+m", "tui.input.tab": "alt+k" }));
      };
      const originalExit = process.exit;
      try {
        if (producer === "pinned") {
          chat = new tui.Container();
          const editor = new tui.Text("preserved draft", 0, 0);
          owner = {
            session: state.session, sessionManager: state.manager, settingsManager: state.settingsManager,
            runtimeHost: state.runtime, chatContainer: chat, outputPad: padding,
            editor, defaultEditor: {}, editorContainer: new tui.Container(), footer: { invalidate() {} },
            ui: { mode: "regular", terminal: { columns: 80, rows: 24, drainInput: async () => {} }, requestRender() {}, setFocus(component) {
              if (focused && "focused" in focused) focused.focused = false;
              focused = component;
              if (component && "focused" in component) component.focused = true;
            }, render: () => [] },
            hideThinkingBlock: false, keybindings: pinnedKeys.KeybindingsManager.create(agentDir),
            themeController: { getThemeSelection: () => theme, getTerminalTheme: () => theme, applyFromSettings: async () => {}, disableAutoSync() {} },
            resetExtensionUI() {}, rebuildChatFromMessages: () => chat.clear(), renderInitialMessages() {}, flushCompactionQueue: async () => {},
            applyRuntimeSettings() {}, setupAutocompleteProvider() {}, setupExtensionShortcuts() {}, showLoadedResources() {},
            clearStatusIndicator() {}, updateEditorBorderColor() {}, checkDaxnutsEasterEgg() {},
            updateAvailableProviderCount: async () => {}, maybeWarnAboutAnthropicSubscriptionAuth: async () => {},
            getMarkdownThemeWithSettings: () => api.getMarkdownTheme(),
            showExtensionConfirm: async title => entry.condition !== "declined" && !(title === "Session cwd not found" && entry.condition === "missing-cwd-declined"),
            stop: () => { state.calls.push("stop"); },
          };
          for (const method of ["showStatus", "showError", "showWarning", "handleFatalRuntimeError", "getPathCommandArgument", "handleShareCommand", "handleExportCommand", "handleImportCommand", "handleClearCommand", "handleResumeSession", "handleCloneCommand", "handleCompactCommand", "handleNameCommand", "handleSessionCommand", "handleModelCommand", "findExactModelMatch", "completeProviderAuthentication", "handleCopyCommand", "showLoginDialog", "showApiKeyLoginDialog", "loginProvider", "notifyAuthDialog", "showAuthPrompt", "showAuthSelect", "disposeActiveSelector", "showSelector", "showOAuthSelector", "getLogoutProviderOptions", "showUserMessageSelector", "showTreeSelector", "showTrustSelector", "showSettingsSelector", "showModelsSelector", "showModelSelector", "handleReloadCommand", "maybeSaveImplicitProjectTrustAfterReload", "handleHotkeysCommand", "getAppKeyDisplay", "getEditorKeyDisplay", "handleDebugCommand", "handleChangelogCommand", "handleArminSaysHi", "handleDementedDelves", "shutdown", "handleLoginCommand", "findLoginProviderOptions", "getLoginProviderOptions", "showLoginAuthTypeSelector", "showLoginProviderSelector", "startProviderLogin", "showAmbientAuthDialog", "promptForMissingSessionCwd"]) {
            const implementation = api.InteractiveMode.prototype[method];
            if (typeof implementation !== "function") throw new Error(`Pinned method missing: ${method}`);
            owner[method] = implementation.bind(owner);
          }
          tui.setKeybindings(owner.keybindings);
          owner.editorContainer.addChild(editor);
          state.onCancel = () => owner.editorContainer.children[0]?.handleInput?.("\u001b");
          process.exit = code => { if (code === 0) normalExit = true; else fatalExit = code; throw new Error("fixture-observed-process-exit"); };
          await changeBindings();
          if (entry.condition === "reload-bindings") await owner.handleReloadCommand();
          if (entry.prefixStatus) owner.showStatus(entry.prefixStatus);
          if (entry.command === "share") await owner.handleShareCommand();
          else if (entry.command === "copy") await owner.handleCopyCommand();
          else if (entry.command === "login") {
            if (entry.selection === undefined) await owner.handleLoginCommand(entry.argument);
            else {
              const providerId = entry.selection.split(":")[1];
              const providerName = state.modelRuntime.getProvider(providerId).name;
              if (entry.selection.startsWith("api_key:")) await owner.showApiKeyLoginDialog(providerId, providerName);
              else await owner.showLoginDialog(providerId, providerName);
            }
          }
          else if (entry.command === "logout") await owner.showOAuthSelector("logout");
          else if (entry.command === "fork") owner.showUserMessageSelector();
          else if (entry.command === "tree") owner.showTreeSelector(entry.argument);
          else if (entry.command === "settings") owner.showSettingsSelector();
          else if (entry.command === "scoped-models") owner.showModelsSelector();
          else if (entry.command === "trust") owner.showTrustSelector();
          else if (entry.command === "reload") await owner.handleReloadCommand();
          else if (entry.command === "hotkeys") owner.handleHotkeysCommand();
          else if (entry.command === "arminsayshi") owner.handleArminSaysHi();
          else if (entry.command === "dementedelves") owner.handleDementedDelves();
          else if (entry.command === "quit") await owner.shutdown();
          else if (entry.command === "debug") owner.handleDebugCommand();
          else if (entry.command === "changelog") owner.handleChangelogCommand();
          else if (entry.command === "export") await owner.handleExportCommand(`/export${entry.argument ? ` ${entry.argument}` : ""}`);
          else if (entry.command === "import") await owner.handleImportCommand(`/import${entry.argument ? ` ${entry.argument}` : ""}`);
          else if (entry.command === "new") await owner.handleClearCommand();
          else if (entry.command === "resume") await owner.handleResumeSession(entry.argument);
          else if (entry.command === "clone") await owner.handleCloneCommand();
          else if (entry.command === "compact") await owner.handleCompactCommand(entry.argument);
          else if (entry.command === "name") owner.handleNameCommand(`/name ${entry.argument ?? ""}`);
          else if (entry.command === "session") owner.handleSessionCommand();
          else if (entry.command === "model") {
            await owner.handleModelCommand(entry.argument);
          } else throw new Error(`Unmapped pinned outcome command: ${entry.command}`);
        } else {
          adapter = await engine.createPiEngineAdapter({ cwd: home, agentDir, createRuntime: async () => state.runtime, workflowHost: state.host });
          shell = new owned.OwnedUiSessionShell({ backend: adapter, cwd: home, terminal: new terminalModule.TestPresentationTerminal(), startup: { quiet: true } });
          shell.root.editor.setText("preserved draft");
          state.onCancel = () => shell.root.handleInput("\u001b");
          state.onMissingCwd = () => setImmediate(() => shell.root.handleInput(entry.condition === "missing-cwd-declined" ? "\u001b" : "\r"));
          await changeBindings();
          if (entry.condition === "reload-bindings") await shell.runWorkflow({ command: "reload", argument: "" });
          if (entry.prefixStatus) shell.root.appendWorkflowStatus(entry.prefixStatus);
          if (entry.command === "tree") shell.showTreeSelector(entry.argument);
          else await shell.runWorkflow({ command: entry.command, argument: entry.argument ?? "", ...(entry.selection === undefined ? {} : { selection: entry.selection }), ...(entry.command === "import" && entry.argument ? { confirmed: entry.condition !== "declined" } : {}) });
        }
      } catch (error) {
        if (fatalExit === undefined && !normalExit) throw error;
      } finally { process.exit = originalExit; }
      try {
        if (entry.command === "login" && entry.selection !== undefined && !["failure", "non-error", "cancelled", "sync-failure"].includes(entry.condition) || entry.command === "scoped-models") await state.refreshed;
        if (state.pendingRefresh) await state.pendingRefresh;
        await new Promise(resolve => setImmediate(resolve));
        for (const input of entry.inputs ?? (entry.input ? [entry.input] : [])) {
          if (shell) shell.root.handleInput(input);
          else focused?.handleInput?.(input);
          await new Promise(resolve => setImmediate(resolve));
        }
        for (const width of [80, 28]) {
          let rows;
          if (chat) rows = chat.render(width);
          else {
            rows = ownedDocument(width);
          }
          const surfaceOpen = shell ? !shell.root.usesDefaultInputSurface() : owner.editorContainer.children[0] !== owner.editor;
          let surfaceRows = [];
          if (surfaceOpen) {
            if (owner) surfaceRows = owner.editorContainer.render(width);
            else {
              const layout = shell.root.layoutRoot();
              const dock = layout.type === "stack" ? layout.children[1]?.node : undefined;
              const input = dock?.type === "stack" ? dock.children[3]?.node : undefined;
              if (input?.type !== "component") throw new Error("Missing semantic input region");
              surfaceRows = input.component.render(width);
            }
          }
          let exceptionReferenceRows;
          if (producer === "pinned" && entry.id === "share/missing") {
            // Compatibility: preserve the actual pinned output above; separately render the
            // one spec-approved A1 diagnostic through Pi's unchanged error presenter.
            const previous = owner.chatContainer;
            owner.chatContainer = new tui.Container();
            owner.showError("GitHub CLI (gh) is not installed. Install it from https://cli.github.com/");
            exceptionReferenceRows = owner.chatContainer.render(width);
            owner.chatContainer = previous;
          }
          const bindings = entry.command === "hotkeys" ? shell ? shell.root.editor.keybindingConfig() : owner.keybindings.getEffectiveConfig() : undefined;
          const activeBindings = bindings ? Object.fromEntries(["app.model.select", "tui.input.tab"].map(key => [key, bindings[key]])) : null;
          results.push({ id: `${theme}/${padding}/${entry.id}/${width}`, activeBindings, rows, surfaceOpen, surfaceRows, progressRows: progressRows ?? [], calls: [...state.calls], remainingExports: state.exportedFiles.filter(path => existsSync(path)).length, fatalExit: fatalExit ?? null, active: adapter ? adapter.view().lifecycle !== "stopped" : fatalExit === undefined && !normalExit, ...(exceptionReferenceRows === undefined ? {} : { exceptionReferenceRows }) });
        }
      } finally {
        owner?.disposeActiveSelector?.();
        for (const child of chat?.children ?? []) child.dispose?.();
        await shell?.dispose();
      }
    }
  }
}
process.stdout.write(JSON.stringify(results));

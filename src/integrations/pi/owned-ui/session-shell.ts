import type {
  OwnedUiCommand,
  OwnedUiDialog,
  OwnedUiSessionViewModel,
  OwnedUiThinkingLevel,
} from "../../../contracts/owned-ui/index.js";
import type { UiRouteHost } from "./route-host.js";
import { MOUSE_TRACKING_OFF, MOUSE_TRACKING_ON, parseMouseInput } from "../../../ui/components/index.js";
import {
  PINNED_PI_HIDDEN_COMMAND_NAMES,
  PINNED_PI_WORKFLOW_COMMAND_NAMES,
  type AdapterCommandResult,
  type OwnedPiExtensionResourceSummary,
  type OwnedPiExtensionSourceSummary,
  type PiEngineAdapter,
  type PiWorkflowInteractionRequest,
  type PiWorkflowLoginNotification,
  type PiWorkflowLoginStart,
  type PiWorkflowRequest,
  type PiWorkflowResult,
  type PiWorkflowRoute,
} from "../engine/index.js";
import {
  createPiExtensionUiBridge,
  createPiQueuedInputStatus,
  createPiShellArmin,
  createPiShellAuthProviderSelector,
  createPiShellChangelog,
  createPiShellDaxnuts,
  createPiShellDialog,
  createPiShellEarendilAnnouncement,
  createPiShellEditor,
  createPiShellExtensionSelector,
  createPiShellFooter,
  createPiShellHeader,
  createPiShellHotkeys,
  createPiShellLoadedResources,
  createPiShellLoginDialog,
  createPiShellModelSelector,
  createPiShellOperationLoader,
  createPiShellReloadBox,
  createPiShellScopedModelsSelector,
  createPiShellSelector,
  createPiShellSessionInfo,
  createPiShellSessionSelector,
  createPiShellSettingsSelector,
  createPiShellStatus,
  createPiShellTranscriptComponent,
  createPiShellTreeSelector,
  createPiShellTrustSelector,
  createPiShellUserMessageSelector,
  onPiThemeChange,
  piTheme,
  renderPiShellPackageUpdateNotice,
  renderPiShellStartupDiagnostic,
  renderPiShellStatusText,
  renderPiShellTranscriptBlock,
  type PiExtensionUiBridge,
  type PiShellComponentPort,
  type PiShellEditorPort,
  type PiShellExtensionRendererResolver,
  type PiShellHeaderOptions,
  type PiShellHeaderPort,
  type PiShellLoadedResourcesPort,
  type PiShellLoginDialogPort,
  type PiShellQueuedInputPort,
  type PiShellResourceEntry,
  type PiShellScopedModelsSelectorPort,
  type PiShellSelectorOption,
  type PiShellStatusPort,
  type PiShellTranscriptComponentPort,
  type PiShellViewComponentPort,
} from "../components/index.js";
import {
  PiTuiRuntimeAdapter,
  type PiTuiComponentPort,
  type PiTuiLayoutNode,
  type PiTuiOverlayHandle,
  type PiTuiTerminalPort,
} from "../tui-runtime/index.js";


import { preloadSystemClipboard, readSystemClipboardText } from "./system-clipboard.js";
import {
  OwnedUiSessionShellRoot,
  shellResourceEntries,
  type OwnedUiBackendPort,
  type OwnedUiSessionShellOptions,
  type OwnedUiTerminalPort,
} from "./session-shell-root.js";
export { OwnedUiSessionShellRoot, type OwnedUiSessionShellOptions } from "./session-shell-root.js";

export class OwnedUiSessionShell {
  readonly backend: OwnedUiBackendPort;
  readonly root: OwnedUiSessionShellRoot;
  readonly runtime: PiTuiRuntimeAdapter;
  readonly #cwd: string;
  readonly #listeners = new Set<(view: OwnedUiSessionViewModel) => void>();
  readonly #unsubscribe: () => void;
  readonly #extensionBridge: PiExtensionUiBridge;
  readonly #stopped: Promise<void>;
  #resolveStopped: (() => void) | undefined;
  #dialogId: string | undefined;
  #dialogSource: "route" | "local" | "backend" | undefined;
  readonly #routeHost: UiRouteHost | null;
  #dialogHandle: PiTuiOverlayHandle | undefined;
  #sequence = 0;
  #started = false;
  #disposed = false;
  #pointerReporting = false;
  readonly #customViewport: boolean;
  readonly #removeViewportPreInput: () => void;
  readonly #unsubscribeSettings: () => void;
  #compactionQueue: Array<{ readonly text: string; readonly type: "steer" | "follow-up" }> = [];
  #lastClearTime = 0;
  #activeLoginDialog: PiShellLoginDialogPort | undefined;
  #sessionGeneration: number;

  constructor(options: OwnedUiSessionShellOptions) {
    this.backend = options.backend;
    this.#sessionGeneration = this.backend.sessionGeneration;
    this.#cwd = options.cwd;
    this.#routeHost = options.routeHost ?? null;
    this.#customViewport = options.sessionLayout === "custom-viewport";
    if (this.#customViewport && options.clipboard === undefined) preloadSystemClipboard();
    this.#stopped = new Promise(resolve => {
      this.#resolveStopped = resolve;
    });
    let runtime: PiTuiRuntimeAdapter | undefined;
    this.root = new OwnedUiSessionShellRoot(this.backend.view(), options.cwd, {
      getColumns: () => runtime?.viewport().columns ?? options.terminal?.columns ?? 80,
      getRows: () => runtime?.viewport().rows ?? options.terminal?.rows ?? 24,
      requestRender: () => runtime?.requestRender(),
      onSubmit: text => { void this.submit(text); },
      onInterrupt: () => { void this.interrupt(); },
      onClear: () => { void this.clearOrExit(); },
      onExit: () => { void this.shutdown(); },
      onModelSelect: () => this.showModelSelector(),
      onModelCycle: direction => { void this.cycleModel(direction); },
      onThinkingCycle: () => { void this.cycleThinkingLevel(); },
      onThinkingToggle: () => {
        this.root.toggleThinkingVisibility();
        this.runtime.requestRender();
      },
      onMessageCopy: () => { void this.runWorkflow({ command: "copy", argument: "" }); },
      onFollowUp: () => { void this.queueFollowUp(); },
      onDequeue: () => this.restoreQueuedInput(),
      onCopyText: text => runtime?.writeControl(`\u001b]52;c;${Buffer.from(text, "utf8").toString("base64")}\u0007`),
      readClipboardText: options.clipboard === undefined
        ? readSystemClipboardText
        : () => options.clipboard?.readText() ?? Promise.resolve(null),
    }, {
      ...options.startup,
      resources: options.startup?.resources ?? shellResourceEntries(this.backend),
    }, this.backend.agentDir, {
      getMessageRenderer: customType => this.backend.pinnedMessageRenderer(customType),
      getToolDefinition: toolName => this.backend.pinnedToolDefinition(toolName),
    }, options.sessionLayout);
    // Bare A1 owns a bounded viewport and therefore always runs on the alternate
    // fullscreen surface. The pinned comparison profiles still honor Pi's mode.
    const tuiMode = this.#customViewport
      ? "fullscreen"
      : this.backend.disposed ? "regular" : this.backend.pinnedSettingsSnapshot().tuiMode;
    const runtimeOptions = {
      root: this.root,
      mode: tuiMode,
      ...(this.#customViewport ? {} : { layoutRoot: this.root.layoutRoot() }),
      ...(options.terminal === undefined ? {} : { terminal: options.terminal }),
      hardwareCursor: this.backend.view().terminal.hardwareCursor,
    };
    runtime = new PiTuiRuntimeAdapter(runtimeOptions);
    this.runtime = runtime;
    this.#removeViewportPreInput = this.#customViewport
      ? this.runtime.addPreInputListener(data => {
          // An overlay or editor-replacement screen owns its entire pointer
          // surface. Letting the transcript pre-router inspect those reports
          // steals settings value menus and numeric +/- controls before the
          // settings app can receive them.
          if (this.runtime.hasOverlay() || !this.root.usesDefaultInputSurface()) return undefined;
          const routed = this.root.handleViewportPreInput(data, true);
          if (routed.copyText !== undefined) {
            this.runtime.writeControl(`\u001b]52;c;${Buffer.from(routed.copyText, "utf8").toString("base64")}\u0007`);
          }
          if (!routed.consumed) return routed.data === data ? undefined : { data: routed.data };
          return routed.data.length === 0 ? { consume: true } : { data: routed.data };
        })
      : () => {};
    const applyViewportSettings = () => {
      const snapshot = options.viewportSettings?.snapshot();
      this.root.setViewportConfig(snapshot ?? {
        scrollbarAppearance: "hover",
        scrollbarStyle: "thin",
        scrollbarSpeed: "normal",
      });
    };
    applyViewportSettings();
    this.#unsubscribeSettings = this.#customViewport && options.viewportSettings
      ? options.viewportSettings.onChange(settings => this.root.setViewportConfig(settings))
      : () => {};
    this.#extensionBridge = createPiExtensionUiBridge({
      runtime: {
        getColumns: () => this.runtime.viewport().columns,
        getRows: () => this.runtime.viewport().rows,
        requestRender: () => this.runtime.requestRender(),
      },
      agentDir: this.backend.agentDir,
      setInputSurface: component => this.root.setInputSurface(component),
      showOverlay: (component, overlayOptions) => this.runtime.showOverlay(component, overlayOptions),
      listenInput: handler => this.runtime.addInputListener(handler),
      replaceWidget: (key, component, placement) => this.root.setExtensionWidget(key, component, placement),
      replaceHeader: component => this.root.setExtensionHeader(component),
      replaceFooter: component => this.root.setExtensionFooter(component),
      setStatus: (key, text) => this.root.setExtensionStatus(key, text),
      setWorking: (message, visible) => this.root.setExtensionWorking(message, visible),
      notify: (message, type) => this.root.addExtensionNotification(message, type),
      setTitle: title => this.runtime.setTitle(title),
      getEditorText: () => this.root.editor.getText(),
      setEditorText: text => this.root.editor.setText(text),
      pasteToEditor: text => this.root.editor.insertText(text),
      addAutocompleteProvider: factory => this.root.editor.addAutocompleteProvider(factory),
      setCustomEditor: component => this.root.setInputSurface(component),
      getFooterData: () => this.root.extensionFooterData(),
      getToolsExpanded: () => this.root.toolsExpanded,
      setToolsExpanded: expanded => this.root.setToolsExpanded(expanded),
    });
    this.backend.setWorkflowInteractionHost({
      startLogin: request => this.#startWorkflowLogin(request),
      prompt: request => this.#requestWorkflowInput(request),
      notify: event => this.#notifyWorkflowLogin(event),
      finishLogin: () => this.#finishWorkflowLogin(),
    });
    this.root.editor.setAutocompleteCommands(this.backend.workflowAutocompleteCommands());
    this.#unsubscribe = this.backend.onEvent(event => {
      // A streamed chunk names one block, and touching only that block is what keeps the
      // cost of a chunk the same in a long session as in a new one. Everything else
      // resynchronizes the view, which is cheap next to re-reading the transcript.
      if (event.type === "agent-run-started") this.root.resumeViewportFollowing();
      if (event.type === "assistant-message-completed") this.root.noteCompletedAssistantMessage();
      const semanticOnly = event.type === "agent-run-started" || event.type === "assistant-message-completed";
      const view = event.type === "transcript-block" && this.#sessionGeneration === this.backend.sessionGeneration
        ? this.#syncBlock(event.block)
        : semanticOnly ? this.view() : this.#syncView();
      if (view.lifecycle === "ready" && this.#compactionQueue.length > 0) void this.#flushCompactionQueue();
      if (event.type === "session-lifecycle" && event.lifecycle === "stopped") this.#resolveStopped?.();
    });
    if (this.backend.view().lifecycle === "stopped") this.#resolveStopped?.();
  }

  view(): OwnedUiSessionViewModel {
    return this.backend.view();
  }

  start(): void {
    if (this.#started) return;
    this.#started = true;
    this.runtime.start();
    if (this.#customViewport) this.#setPointerReporting(true);
    void this.backend.bindExtensionUi(this.#extensionBridge.context, () => { void this.shutdown(); });
    this.#syncView();
  }

  onView(listener: (view: OwnedUiSessionViewModel) => void): () => void {
    this.#listeners.add(listener);
    listener(this.view());
    return () => this.#listeners.delete(listener);
  }

  waitUntilStopped(): Promise<void> {
    return this.#stopped;
  }

  async submit(text: string): Promise<AdapterCommandResult> {
    const input = text.trim();
    if (!input) return { outcome: "completed", diagnostic: null };
    if (input.startsWith("/")) return this.#slashCommand(input);
    if (input.startsWith("!")) {
      const excludeFromContext = input.startsWith("!!");
      const command = input.slice(excludeFromContext ? 2 : 1).trim();
      if (command) {
        this.root.editor.addToHistory(input);
        try {
          const result = await this.backend.executeBashWorkflow(command, excludeFromContext);
          const workflow: PiWorkflowResult = {
            command: "debug",
            outcome: result.cancelled ? "cancelled" : result.exitCode === 0 || result.exitCode === undefined ? "completed" : "failed",
            message: result.cancelled ? "Bash command cancelled" : `Bash exited ${result.exitCode ?? 0}: ${command}`,
            ...(result.output ? { detail: result.output } : {}),
          };
          this.root.appendWorkflowResult(workflow);
          this.runtime.requestRender();
          return workflow.outcome === "failed" ? rejected(workflow.message) : { outcome: "completed", diagnostic: null };
        } catch (error) {
          const message = `Bash command failed: ${error instanceof Error ? error.message : String(error)}`;
          this.root.appendWorkflowResult({ command: "debug", outcome: "failed", message });
          this.runtime.requestRender();
          return rejected(message);
        }
      }
    }
    if (this.view().status.workingMessage?.startsWith("Compacting") === true) {
      this.root.editor.addToHistory(input);
      this.#compactionQueue.push({ text: input, type: "steer" });
      this.root.appendWorkflowResult({ command: "compact", outcome: "completed", message: `Queued during compaction: ${input}` });
      this.runtime.requestRender();
      return { outcome: "completed", diagnostic: null };
    }
    const type = this.view().lifecycle === "busy" ? "steer" as const : "prompt" as const;
    this.root.editor.addToHistory(input);
    this.root.resumeViewportFollowing();
    return this.#execute({
      type,
      correlationId: this.#correlation(type),
      sessionId: this.backend.sessionId,
      text: input,
    });
  }

  async clearOrExit(now = Date.now()): Promise<AdapterCommandResult> {
    if (now - this.#lastClearTime < 500) return this.shutdown();
    this.root.editor.setText("");
    this.#lastClearTime = now;
    this.runtime.requestRender();
    return { outcome: "completed", diagnostic: null };
  }

  async interrupt(): Promise<AdapterCommandResult> {
    if (this.view().lifecycle === "busy") return this.abort();
    if (this.root.editor.getText().length > 0) {
      this.root.editor.setText("");
      return { outcome: "completed", diagnostic: null };
    }
    return { outcome: "rejected", diagnostic: "nothing to interrupt" };
  }

  async abort(): Promise<AdapterCommandResult> {
    return this.#execute(this.#simple("abort"));
  }

  async retry(): Promise<AdapterCommandResult> {
    return this.#execute(this.#simple("retry"));
  }

  async compact(): Promise<AdapterCommandResult> {
    return this.#execute(this.#simple("compact"));
  }

  async newSession(): Promise<AdapterCommandResult> {
    return this.#execute(this.#simple("new-session"));
  }

  async resumeSession(sessionPath: string): Promise<AdapterCommandResult> {
    return this.#execute({
      type: "resume-session",
      correlationId: this.#correlation("resume"),
      sessionId: this.backend.sessionId,
      sessionPath,
    });
  }

  async setModel(providerId: string, modelId: string): Promise<AdapterCommandResult> {
    return this.#execute({
      type: "set-model",
      correlationId: this.#correlation("model"),
      sessionId: this.backend.sessionId,
      model: { providerId, modelId, displayName: modelId },
    });
  }

  async setThinkingLevel(thinkingLevel: OwnedUiThinkingLevel): Promise<AdapterCommandResult> {
    return this.#execute({
      type: "set-thinking-level",
      correlationId: this.#correlation("thinking"),
      sessionId: this.backend.sessionId,
      thinkingLevel,
    });
  }

  async cycleThinkingLevel(): Promise<AdapterCommandResult> {
    const levels: readonly OwnedUiThinkingLevel[] = ["off", "minimal", "low", "medium", "high", "xhigh"];
    const current = Math.max(0, levels.indexOf(this.view().thinkingLevel));
    return this.setThinkingLevel(levels[(current + 1) % levels.length] ?? "off");
  }

  async cycleModel(direction: "forward" | "backward"): Promise<AdapterCommandResult> {
    const result = await this.backend.cycleModelWorkflow(direction);
    this.root.appendWorkflowResult(result);
    if (result.outcome === "completed") this.#showDaxnutsForActiveModel();
    this.runtime.requestRender();
    return workflowAdapterResult(result);
  }

  async queueFollowUp(): Promise<AdapterCommandResult> {
    const text = this.root.editor.getText().trim();
    if (!text) return rejected("nothing to queue");
    this.root.editor.addToHistory(text);
    this.root.editor.setText("");
    this.root.resumeViewportFollowing();
    if (this.view().status.workingMessage?.startsWith("Compacting") === true) {
      this.#compactionQueue.push({ text, type: "follow-up" });
      return { outcome: "completed", diagnostic: null };
    }
    return this.#execute({
      type: "follow-up",
      correlationId: this.#correlation("follow-up"),
      sessionId: this.backend.sessionId,
      text,
    });
  }

  restoreQueuedInput(): void {
    const queued = [...this.backend.clearQueuedWorkflows(), ...this.#compactionQueue.map(item => item.text)];
    this.#compactionQueue = [];
    if (queued.length === 0) return;
    this.root.editor.setText(queued.join("\n"));
    this.runtime.requestRender();
  }

  showSelector(
    title: string,
    options: readonly PiShellSelectorOption[],
    onSelect: (id: string) => void,
    onCancel?: () => void,
  ): PiTuiOverlayHandle {
    this.#dialogHandle?.hide();
    this.#dialogSource = "local";
    this.#dialogId = undefined;
    const component = createPiShellSelector({
      title,
      options,
      onSelect: id => {
        onSelect(id);
        this.#dialogHandle?.hide();
        this.#dialogHandle = undefined;
        this.#dialogSource = undefined;
      },
      onCancel: () => {
        this.#dialogHandle?.hide();
        this.#dialogHandle = undefined;
        this.#dialogSource = undefined;
        onCancel?.();
      },
    });
    const handle = this.runtime.showOverlay(component, { width: "70%", maxHeight: "80%", anchor: "center" });
    this.#dialogHandle = handle;
    return handle;
  }

  showModelSelector(): void {
    const context = this.backend.pinnedModelSelectorContext();
    const close = () => {
      this.root.setInputSurface(null);
      this.runtime.requestRender();
    };
    const component = createPiShellModelSelector({
      ...context,
      runtime: {
        getColumns: () => this.runtime.viewport().columns,
        getRows: () => this.runtime.viewport().rows,
        requestRender: () => this.runtime.requestRender(),
      },
      onSelect: model => {
        close();
        void this.runWorkflow({ command: "model", argument: "", selection: modelReference(model) });
      },
      onCancel: close,
    });
    this.root.setInputSurface(component);
    this.runtime.requestRender();
  }

  showForkSelector(): void {
    const options = this.backend.pinnedForkOptions();
    if (options.length === 0) {
      this.root.appendWorkflowResult({ command: "fork", outcome: "failed", message: "No user messages available to fork from" });
      this.runtime.requestRender();
      return;
    }
    const close = () => {
      this.root.setInputSurface(null);
      this.runtime.requestRender();
    };
    const component = createPiShellUserMessageSelector(options, selection => {
      close();
      void this.runWorkflow({ command: "fork", argument: "", selection });
    }, close);
    this.root.setInputSurface(component);
    this.runtime.requestRender();
  }

  async showLogoutSelector(): Promise<void> {
    const options = await this.backend.pinnedLogoutOptions();
    if (options.length === 0) {
      this.root.appendWorkflowStatus("No authenticated providers available.");
      this.runtime.requestRender();
      return;
    }
    const close = () => {
      this.root.setInputSurface(null);
      this.runtime.requestRender();
    };
    const component = createPiShellAuthProviderSelector("logout", options, selection => {
      close();
      void this.runWorkflow({ command: "logout", argument: "", selection });
    }, close);
    this.root.setInputSurface(component);
    this.runtime.requestRender();
  }

  showLoginMethodSelector(providerReference: string): void {
    const method = this.backend.pinnedLoginMethodOptions(providerReference);
    if (method.options.length === 0) {
      this.root.appendWorkflowResult({ command: "login", outcome: "failed", message: `No authentication methods available for ${providerReference}` });
      this.runtime.requestRender();
      return;
    }
    if (method.options.length === 1) {
      const selection = method.options[0]?.id;
      if (selection) void this.runWorkflow({ command: "login", argument: "", selection });
      return;
    }
    const close = () => {
      this.root.setInputSurface(null);
      this.runtime.requestRender();
    };
    const labels = method.options.map(option => option.label);
    const component = createPiShellExtensionSelector(method.title, labels, label => {
      const selection = method.options.find(option => option.label === label)?.id;
      if (!selection) return;
      close();
      void this.runWorkflow({ command: "login", argument: "", selection });
    }, close);
    this.root.setInputSurface(component);
    this.runtime.requestRender();
  }

  showTreeSelector(initialSelectedId?: string): void {
    const context = this.backend.pinnedTreeSelectorContext();
    if (context.tree.length === 0) {
      this.root.appendWorkflowStatus("No entries in session");
      this.runtime.requestRender();
      return;
    }
    const close = () => {
      this.root.setInputSurface(null);
      this.runtime.requestRender();
    };
    const component = createPiShellTreeSelector({
      tree: context.tree,
      currentLeafId: context.currentLeafId,
      terminalHeight: this.runtime.viewport().rows,
      initialFilterMode: context.filterMode,
      ...(initialSelectedId === undefined ? {} : { initialSelectedId }),
      onLabelChange: context.appendLabelChange,
      onCancel: close,
      onSelect: entryId => {
        close();
        if (entryId === context.currentLeafId) {
          this.root.appendWorkflowStatus("Already at this point");
          this.runtime.requestRender();
          return;
        }
        void this.#completeTreeSelection(entryId, context.skipSummaryPrompt);
      },
    });
    this.root.setInputSurface(component);
    this.runtime.requestRender();
  }

  showLoginAuthTypeSelector(): void {
    const close = () => {
      this.root.setInputSurface(null);
      this.runtime.requestRender();
    };
    const labels = ["Sign in with an account", "Sign in with an API key"];
    const component = createPiShellExtensionSelector(
      "Select authentication method:",
      labels,
      label => {
        close();
        this.showLoginProviderSelector(label === labels[0] ? "oauth" : "api_key");
      },
      close,
    );
    this.root.setInputSurface(component);
    this.runtime.requestRender();
  }

  showLoginProviderSelector(authType: "oauth" | "api_key"): void {
    const options = this.backend.pinnedLoginOptions(authType);
    if (options.length === 0) {
      this.root.appendWorkflowStatus(authType === "oauth" ? "No subscription providers available." : "No API key providers available.");
      this.runtime.requestRender();
      return;
    }
    const close = () => {
      this.root.setInputSurface(null);
      this.runtime.requestRender();
    };
    const component = createPiShellAuthProviderSelector("login", options, id => {
      close();
      void this.runWorkflow({ command: "login", argument: "", selection: id });
    }, () => {
      close();
      this.showLoginAuthTypeSelector();
    });
    this.root.setInputSurface(component);
    this.runtime.requestRender();
  }

  showSessionSelector(): void {
    const context = this.backend.pinnedSessionSelectorContext();
    const close = () => {
      this.root.setInputSurface(null);
      this.runtime.requestRender();
    };
    const component = createPiShellSessionSelector({
      currentSessionsLoader: context.loadCurrentSessions,
      allSessionsLoader: context.loadAllSessions,
      currentSessionFilePath: context.currentSessionFilePath,
      renameSession: context.renameSession,
      requestRender: () => this.runtime.requestRender(),
      onSelect: sessionPath => {
        close();
        void this.runWorkflow({ command: "resume", argument: sessionPath });
      },
      onCancel: close,
      onExit: () => {
        close();
        void this.shutdown();
      },
    });
    this.root.setInputSurface(component);
    this.runtime.requestRender();
  }

  showSettingsSelector(): void {
    const snapshot = this.backend.pinnedSettingsSnapshot();
    const close = () => {
      this.root.setInputSurface(null);
      this.runtime.requestRender();
    };
    const component = createPiShellSettingsSelector({
      config: {
        ...snapshot,
        availableThinkingLevels: [...snapshot.availableThinkingLevels],
        availableThemes: [...snapshot.availableThemes],
        warnings: { ...snapshot.warnings },
      },
      onChange: (callback, value) => {
        if (callback === "onCancel") {
          close();
          return;
        }
        if (callback === "onTuiModeChange") {
          // The custom bare-A1 surface is permanently fullscreen; this callback
          // remains available only to pinned comparison profiles.
          if (this.#customViewport) return;
          if (value !== "regular" && value !== "fullscreen") return;
          if (!this.runtime.switchMode(value)) {
            this.root.appendWorkflowStatus("Close active overlays before changing TUI mode");
            this.runtime.requestRender();
            return;
          }
          if (this.#customViewport) {
            this.#pointerReporting = false;
            this.#setPointerReporting(true);
          }
        }
        const result = this.backend.applyPinnedSettingValue(callback, value);
        if (result.outcome === "failed") this.root.appendWorkflowResult(result);
        else if (callback === "onTuiModeChange") this.root.appendWorkflowStatus(`TUI mode: ${value}`);
        this.runtime.requestRender();
      },
      onCancel: close,
    });
    this.root.setInputSurface(component);
    this.runtime.requestRender();
  }

  async shutdown(): Promise<AdapterCommandResult> {
    return this.runWorkflow({ command: "quit", argument: "" });
  }

  async runWorkflow(request: PiWorkflowRequest): Promise<AdapterCommandResult> {
    if (request.command === "scoped-models" && request.selection === undefined && request.confirmed === undefined) {
      this.showScopedModelsSelector();
      return { outcome: "completed", diagnostic: null };
    }
    if (request.command === "model" && request.selection === undefined && request.confirmed === undefined && request.argument.trim().length === 0) {
      this.showModelSelector();
      return { outcome: "completed", diagnostic: null };
    }
    if (request.command === "fork" && request.selection === undefined && request.confirmed === undefined) {
      this.showForkSelector();
      return { outcome: "completed", diagnostic: null };
    }
    if (request.command === "trust" && request.selection === undefined && request.confirmed === undefined) {
      this.showTrustSelector();
      return { outcome: "completed", diagnostic: null };
    }
    if (request.command === "settings" && request.selection === undefined && request.confirmed === undefined) {
      this.showSettingsSelector();
      return { outcome: "completed", diagnostic: null };
    }
    if (request.command === "resume" && request.selection === undefined && request.confirmed === undefined && request.argument.trim().length === 0) {
      this.showSessionSelector();
      return { outcome: "completed", diagnostic: null };
    }
    if (request.command === "login" && request.selection === undefined && request.confirmed === undefined) {
      if (request.argument.trim().length === 0) this.showLoginAuthTypeSelector();
      else this.showLoginMethodSelector(request.argument);
      return { outcome: "completed", diagnostic: null };
    }
    if (request.command === "logout" && request.selection === undefined && request.confirmed === undefined) {
      await this.showLogoutSelector();
      return { outcome: "completed", diagnostic: null };
    }
    if (request.command === "import" && request.confirmed === undefined && request.argument.trim().length > 0) {
      const confirmed = await this.#extensionBridge.context.confirm("Import session", `Replace current session with ${request.argument.trim()}?`);
      return this.runWorkflow({ ...request, confirmed: confirmed === true });
    }
    if (request.command === "tree" && request.selection === undefined && request.confirmed === undefined && request.argument.trim().length === 0) {
      this.showTreeSelector();
      return { outcome: "completed", diagnostic: null };
    }
    if (request.command === "reload") {
      this.root.resetExtensionUi();
      this.root.resetWorkflowPresentation();
    }
    const operationSurface = request.command === "share"
      ? createPiShellOperationLoader({
          getColumns: () => this.runtime.viewport().columns,
          getRows: () => this.runtime.viewport().rows,
          requestRender: () => this.runtime.requestRender(),
        }, "Creating gist...")
      : request.command === "reload"
        ? createPiShellReloadBox()
        : undefined;
    if (operationSurface) {
      this.root.setInputSurface(operationSurface);
      this.runtime.requestRender();
    }
    let result: PiWorkflowResult;
    try {
      result = await this.backend.executeWorkflow(request);
    } finally {
      if (operationSurface) {
        this.root.setInputSurface(null);
        this.runtime.requestRender();
      }
    }
    if (result.outcome === "requires-confirmation" && request.command === "resume") {
      const confirmed = await this.#extensionBridge.context.confirm("Session cwd not found", result.message);
      return this.runWorkflow({ ...request, confirmed: confirmed === true });
    }
    if (result.outcome === "requires-selection" || result.outcome === "requires-confirmation") {
      this.root.appendWorkflowResult({ command: request.command, outcome: "failed", message: `Owned controller missing for ${request.command}` });
      this.runtime.requestRender();
      return { outcome: "failed", diagnostic: `Owned controller missing for ${request.command}` };
    }
    if (request.command === "reload" && result.outcome === "completed") {
      this.root.editor.setAutocompleteCommands(this.backend.workflowAutocompleteCommands());
    }
    this.root.appendWorkflowResult(result);
    if (request.command === "model" && result.outcome === "completed") this.#showDaxnutsForActiveModel();
    this.runtime.requestRender();
    return workflowAdapterResult(result);
  }

  showTrustSelector(): void {
    const context = this.backend.pinnedProjectTrustContext();
    const close = () => {
      this.root.setInputSurface(null);
      this.runtime.requestRender();
    };
    const component = createPiShellTrustSelector({
      ...context,
      onSelect: selection => {
        try {
          this.backend.persistProjectTrust(selection.updates);
          close();
          this.root.appendWorkflowStatus(`Saved trust decision: ${selection.trusted ? "trusted" : "untrusted"}. Restart pi for this to take effect.`);
        } catch (error) {
          close();
          this.root.appendWorkflowResult({ command: "trust", outcome: "failed", message: error instanceof Error ? error.message : String(error) });
        }
        this.runtime.requestRender();
      },
      onCancel: close,
    });
    this.root.setInputSurface(component);
    this.runtime.requestRender();
  }

  showScopedModelsSelector(): void {
    const initial = this.backend.pinnedScopedModelsContext();
    let currentEnabledIds = initial.enabledModelIds === null ? null : [...initial.enabledModelIds];
    let selectionChanged = false;
    let disposed = false;
    let timedOut = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 15_000);
    const close = () => {
      disposed = true;
      clearTimeout(timeout);
      controller.abort();
      this.root.setInputSurface(null);
      this.runtime.requestRender();
    };
    const selector = createPiShellScopedModelsSelector({
      models: initial.models,
      enabledModelIds: currentEnabledIds,
      refreshStatus: "Refreshing model catalogs…",
      onChange: enabledIds => {
        selectionChanged = true;
        currentEnabledIds = enabledIds === null ? null : [...enabledIds];
        this.backend.updateScopedModels(currentEnabledIds);
        this.runtime.requestRender();
      },
      onPersist: enabledIds => {
        currentEnabledIds = enabledIds === null ? null : [...enabledIds];
        this.backend.persistScopedModels(currentEnabledIds);
        this.root.appendWorkflowStatus("Model selection saved to settings");
        this.runtime.requestRender();
      },
      onCancel: close,
    });
    const component: PiShellScopedModelsSelectorPort = {
      ...selector,
      dispose: () => {
        disposed = true;
        clearTimeout(timeout);
        controller.abort();
        selector.dispose?.();
      },
    };
    this.root.setInputSurface(component);
    this.runtime.requestRender();
    void this.backend.refreshScopedModels(controller.signal).then(refreshed => {
      if (disposed) return;
      if (!selectionChanged) {
        currentEnabledIds = refreshed.enabledModelIds === null ? null : [...refreshed.enabledModelIds];
        component.updateModels(refreshed.models, currentEnabledIds);
      } else {
        component.updateModels(refreshed.models);
        this.backend.updateScopedModels(currentEnabledIds);
      }
      component.setRefreshStatus(
        timedOut ? "Model refresh timed out; showing cached models." : refreshed.status,
        timedOut ? "warning" : refreshed.statusKind,
      );
      this.runtime.requestRender();
    }).catch(error => {
      if (disposed) return;
      component.setRefreshStatus(
        timedOut
          ? "Model refresh timed out; showing cached models."
          : `Could not refresh model catalogs: ${error instanceof Error ? error.message : String(error)}`,
        "warning",
      );
      this.runtime.requestRender();
    }).finally(() => clearTimeout(timeout));
  }

  #showDaxnutsForActiveModel(): void {
    const model = this.view().activeModel;
    if (model?.providerId === "opencode" && model.modelId.toLowerCase().includes("kimi-k2.5")) {
      this.root.appendDaxnuts();
    }
  }

  /**
   * Turns terminal pointer reporting on for a screen that reads the pointer, and off for
   * every path that ends it. While it is on the terminal hands A1 the wheel and the
   * button instead of scrolling and selecting itself, so leaving it on outlives the
   * screen that wanted it and takes the terminal's own scrolling and selection with it.
   */
  #setPointerReporting(enabled: boolean, forceOff = false): void {
    const effective = forceOff ? false : this.#customViewport || enabled;
    if (this.#pointerReporting === effective) return;
    this.#pointerReporting = effective;
    if (!this.runtime.active) return;
    this.runtime.writeControl(effective ? MOUSE_TRACKING_ON : MOUSE_TRACKING_OFF);
  }

  async dispose(): Promise<void> {
    if (this.#disposed) return;
    this.#disposed = true;
    this.root.clearViewportPointerState();
    this.#setPointerReporting(false, true);
    this.#removeViewportPreInput();
    this.#unsubscribeSettings();
    this.#unsubscribe();
    this.#dialogHandle?.hide();
    await this.backend.unbindExtensionUi();
    this.#extensionBridge.dispose();
    await this.runtime.dispose();
  }

  /**
   * Applies one transcript block without re-reading the session. The listeners still hear
   * the view they would have heard, so nothing downstream can tell the difference.
   */
  #syncBlock(block: OwnedUiSessionViewModel["transcript"][number]): OwnedUiSessionViewModel {
    this.root.applyTranscriptBlock(block);
    this.runtime.requestRender();
    const view = this.view();
    for (const listener of this.#listeners) listener(view);
    return view;
  }

  #syncView(): OwnedUiSessionViewModel {
    const view = this.view();
    if (this.backend.sessionGeneration !== this.#sessionGeneration) {
      this.#sessionGeneration = this.backend.sessionGeneration;
      this.#activeLoginDialog = undefined;
      this.#extensionBridge.reset();
      // A replaced session takes its transient viewport and owned-route state with it.
      this.root.resetViewport();
      this.#dialogHandle?.hide();
      this.#dialogHandle = undefined;
      this.#dialogId = undefined;
      this.#dialogSource = undefined;
      this.#setPointerReporting(false);
      this.root.setInputSurface(null);
      this.root.resetExtensionUi();
      this.root.resetWorkflowPresentation();
    }
    this.root.update(view);
    this.#syncDialog(view.dialog);
    this.runtime.requestRender();
    for (const listener of this.#listeners) listener(view);
    return view;
  }

  #openOwnedRoute(route: string): AdapterCommandResult {
    const surface = this.#routeHost?.open(route) ?? null;
    if (surface === null) return { outcome: "failed", diagnostic: `route is unavailable: ${route}` };
    if (!this.runtime.active) return { outcome: "failed", diagnostic: "runtime is not active" };

    this.#dialogHandle?.hide();
    this.#dialogSource = "route";
    // Any-event reporting: hover and drag are what the screen is driven by, and
    // it also stops the terminal treating a drag as a text selection.
    this.#setPointerReporting(true);
    // The interrupt chord is global, so it is watched on raw input rather than
    // through the overlay: the pinned shell handles that key before an overlay
    // ever sees it, which is why an owned screen must not rely on being asked.
    let armedAt = 0;
    const removeInterruptWatch = this.runtime.addInputListener(data => {
      if (!data.includes(INTERRUPT)) return undefined;
      const now = Date.now();
      if (armedAt !== 0 && now - armedAt <= INTERRUPT_CHORD_MS) {
        armedAt = 0;
        closeSurface();
        void this.shutdown();
        return { consume: true };
      }
      armedAt = now;
      this.runtime.requestRender();
      // The presented screen owns the chord, so the pinned shell never sees a
      // stray interrupt while it is up.
      return { consume: true };
    });
    let removeSurfacePreInput = () => {};
    const closeSurface = () => {
      removeSurfacePreInput();
      removeInterruptWatch();
      this.#setPointerReporting(false);
      this.#dialogHandle?.hide();
      this.#dialogHandle = undefined;
      this.#dialogId = undefined;
      this.#dialogSource = undefined;
    };
    // Fullscreen Pi owns a fallback text-selection layer before focused overlay
    // components see pointer input. Route every mouse report to the owned screen
    // at the pre-input boundary so dropdowns, value hover, and numeric +/- work,
    // and consume even unhandled reports so settings content is never selected.
    removeSurfacePreInput = this.runtime.addPreInputListener(data => {
      const { events, rest } = parseMouseInput(data);
      if (events.length === 0) return undefined;
      for (const event of events) surface.handleMouse(event);
      if (surface.isClosed()) closeSurface();
      else this.runtime.requestRender();
      return rest.length === 0 ? { consume: true } : { data: rest };
    });
    const rows = () => Math.max(1, this.runtime.viewport().rows);
    const component: PiShellComponentPort = {
      render: (width: number) => [...surface.render(Math.max(1, width), rows())],
      handleInput: (data: string) => {
        const { events, rest } = parseMouseInput(data);
        for (const event of events) surface.handleMouse(event);
        if (rest.length > 0) surface.handleInput(rest);
        if (surface.isClosed()) {
          closeSurface();
          return;
        }
        this.runtime.requestRender();
      },
      invalidate: () => this.runtime.requestRender(),
    };
    surface.onRenderRequested(() => this.runtime.requestRender());
    surface.onExitRequested(() => {
      closeSurface();
      void this.shutdown();
    });
    this.#dialogHandle = this.runtime.showOverlay(component, { width: "100%", maxHeight: "100%", anchor: "top-left" });
    this.#dialogId = surface.id;
    return { outcome: "completed", diagnostic: null };
  }

  #syncDialog(dialog: OwnedUiDialog | null): void {
    if (!this.runtime.active) return;
    if (dialog === null) {
      // Locally owned routes (notably /settings) are independent of backend
      // lifecycle/status events and remain open while an agent is working.
      if (this.#dialogSource !== "backend") return;
      this.#dialogHandle?.hide();
      this.#dialogHandle = undefined;
      this.#dialogId = undefined;
      this.#dialogSource = undefined;
      return;
    }
    if (this.#dialogSource === "backend" && this.#dialogId === dialog.id) return;
    this.#dialogHandle?.hide();
    this.#dialogSource = "backend";
    const component = createPiShellDialog(dialog, {
      onSelect: () => {
        this.#dialogHandle?.hide();
        this.#dialogHandle = undefined;
        this.#dialogId = undefined;
        this.#dialogSource = undefined;
      },
      onCancel: () => {
        this.#dialogHandle?.hide();
        this.#dialogHandle = undefined;
        this.#dialogId = undefined;
        this.#dialogSource = undefined;
      },
    });
    this.#dialogHandle = this.runtime.showOverlay(component, { width: "70%", maxHeight: "80%", anchor: "center" });
    this.#dialogId = dialog.id;
  }

  async #slashCommand(text: string): Promise<AdapterCommandResult> {
    const body = text.slice(1).trim();
    const separator = body.search(/\s/);
    const name = separator < 0 ? body : body.slice(0, separator);
    const argument = separator < 0 ? "" : body.slice(separator + 1).trimStart();
    if (this.#routeHost?.claims(name)) return this.#openOwnedRoute(name);
    if (isWorkflowRoute(name)) return this.runWorkflow({ command: name, argument });
    // Unknown slash input, prompt templates, skills, and extension commands remain Pi prompt input.
    this.root.editor.addToHistory(text);
    this.root.resumeViewportFollowing();
    return this.#execute({
      type: this.view().lifecycle === "busy" ? "steer" : "prompt",
      correlationId: this.#correlation("prompt-command"),
      sessionId: this.backend.sessionId,
      text,
    });
  }

  async #completeTreeSelection(entryId: string, skipSummaryPrompt: boolean): Promise<void> {
    let summarize = false;
    let customInstructions: string | undefined;
    if (!skipSummaryPrompt) {
      while (true) {
        const choice = await this.#extensionBridge.context.select("Summarize branch?", [
          "No summary",
          "Summarize",
          "Summarize with custom prompt",
        ]);
        if (choice === undefined) {
          this.showTreeSelector(entryId);
          return;
        }
        summarize = choice !== "No summary";
        if (choice === "Summarize with custom prompt") {
          customInstructions = await this.#extensionBridge.context.editor("Custom summarization instructions", "");
          if (customInstructions === undefined) continue;
        }
        break;
      }
    }
    const result = await this.runWorkflow({
      command: "tree",
      argument: "",
      selection: entryId,
      treeSummary: {
        summarize,
        ...(customInstructions === undefined ? {} : { customInstructions }),
      },
    });
    if (result.diagnostic === "Branch summarization cancelled") this.showTreeSelector(entryId);
  }

  #startWorkflowLogin(request: PiWorkflowLoginStart): void {
    this.#finishWorkflowLogin();
    const dialog = createPiShellLoginDialog({
      getColumns: () => this.runtime.viewport().columns,
      getRows: () => this.runtime.viewport().rows,
      requestRender: () => this.runtime.requestRender(),
    }, request.providerId, success => {
      if (!success) this.#finishWorkflowLogin();
    }, request.providerName);
    this.#activeLoginDialog = dialog;
    this.root.setInputSurface(dialog);
    this.runtime.requestRender();
  }

  #requestWorkflowInput(request: PiWorkflowInteractionRequest): Promise<string | null> {
    const dialog = this.#activeLoginDialog;
    if (!dialog) return Promise.resolve(null);
    if (request.type === "select") {
      return new Promise(resolve => {
        const options = request.options ?? [];
        const labels = options.map(option => option.label);
        const restoreDialog = () => {
          if (this.#activeLoginDialog === dialog) this.root.setInputSurface(dialog);
          this.runtime.requestRender();
        };
        const selector = createPiShellExtensionSelector(request.message, labels, label => {
          const id = options.find(option => option.label === label)?.id;
          restoreDialog();
          resolve(id ?? null);
        }, () => {
          restoreDialog();
          resolve(null);
        });
        this.root.setInputSurface(selector, false);
        this.runtime.requestRender();
      });
    }
    const response = request.type === "manual-code"
      ? dialog.showManualInput(request.message)
      : dialog.showPrompt(request.message, request.placeholder);
    this.runtime.requestRender();
    return response.then(value => value, () => null);
  }

  #notifyWorkflowLogin(event: PiWorkflowLoginNotification): void {
    const dialog = this.#activeLoginDialog;
    if (!dialog) return;
    if (event.type === "auth_url") dialog.showAuth(event.url, event.instructions);
    else if (event.type === "device_code") {
      dialog.showDeviceCode(event);
      dialog.showWaiting("Waiting for authentication...");
    } else if (event.type === "info") dialog.showInfo(event.message, event.links);
    else if (event.type === "waiting") dialog.showWaiting(event.message);
    else dialog.showProgress(event.message);
    this.runtime.requestRender();
  }

  #finishWorkflowLogin(): void {
    if (!this.#activeLoginDialog) return;
    this.#activeLoginDialog = undefined;
    this.root.setInputSurface(null);
    this.runtime.requestRender();
  }

  async #flushCompactionQueue(): Promise<void> {
    const queued = this.#compactionQueue;
    this.#compactionQueue = [];
    for (const item of queued) {
      await this.#execute({
        type: item.type,
        correlationId: this.#correlation(`compaction-${item.type}`),
        sessionId: this.backend.sessionId,
        text: item.text,
      });
    }
  }

  async #execute(command: OwnedUiCommand): Promise<AdapterCommandResult> {
    return this.backend.execute(command);
  }

  #simple(type: "abort" | "retry" | "compact" | "shutdown" | "new-session"): OwnedUiCommand {
    return { type, correlationId: this.#correlation(type), sessionId: this.backend.sessionId };
  }

  #correlation(prefix: string): string {
    this.#sequence += 1;
    return `pi-shell-${prefix}-${this.#sequence}`;
  }
}

function modelReference(model: unknown): string {
  if (typeof model !== "object" || model === null) return "";
  const value = model as { provider?: unknown; id?: unknown; modelId?: unknown };
  const provider = typeof value.provider === "string" ? value.provider : "";
  const id = typeof value.id === "string" ? value.id : typeof value.modelId === "string" ? value.modelId : "";
  return provider && id ? `${provider}/${id}` : "";
}

function rejected(diagnostic: string): AdapterCommandResult {
  return { outcome: "rejected", diagnostic };
}

function workflowAdapterResult(result: PiWorkflowResult): AdapterCommandResult {
  if (result.outcome === "completed") return { outcome: "completed", diagnostic: null };
  if (result.outcome === "failed") return { outcome: "failed", diagnostic: result.message };
  return { outcome: "rejected", diagnostic: result.message };
}

const INTERRUPT = "\u0003";
const INTERRUPT_CHORD_MS = 1_500;

function isWorkflowRoute(value: string): value is PiWorkflowRoute {
  return (PINNED_PI_WORKFLOW_COMMAND_NAMES as readonly string[]).includes(value)
    || (PINNED_PI_HIDDEN_COMMAND_NAMES as readonly string[]).includes(value);
}

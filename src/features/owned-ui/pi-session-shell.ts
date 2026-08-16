import type {
  OwnedUiCommand,
  OwnedUiDialog,
  OwnedUiSessionViewModel,
  OwnedUiThinkingLevel,
} from "../../foundation/owned-ui-contracts/index.js";
import {
  PINNED_PI_HIDDEN_COMMAND_NAMES,
  PINNED_PI_WORKFLOW_COMMAND_NAMES,
  type AdapterCommandResult,
  type PiEngineAdapter,
  type PiWorkflowRequest,
  type PiWorkflowResult,
  type PiWorkflowRoute,
} from "../../foundation/pi-engine-adapter/index.js";
import {
  createPiQueuedInputStatus,
  createPiShellDialog,
  createPiShellEditor,
  createPiShellFooter,
  createPiShellHeader,
  createPiShellLoadedResources,
  createPiShellSelector,
  createPiShellStatus,
  createPiShellTranscriptComponent,
  renderPiShellTranscriptBlock,
  type PiShellComponentPort,
  type PiShellEditorPort,
  type PiShellHeaderOptions,
  type PiShellHeaderPort,
  type PiShellLoadedResourcesPort,
  type PiShellQueuedInputPort,
  type PiShellResourceEntry,
  type PiShellSelectorOption,
  type PiShellTranscriptComponentPort,
  type PiShellViewComponentPort,
} from "../../foundation/pi-component-adapter/index.js";
import {
  PiTuiRuntimeAdapter,
  type PiTuiComponentPort,
  type PiTuiLayoutNode,
  type PiTuiOverlayHandle,
  type PiTuiTerminalPort,
} from "../../foundation/pi-tui-runtime-adapter/index.js";

export interface PiSessionShellOptions {
  readonly adapter: PiEngineAdapter;
  readonly cwd: string;
  readonly terminal?: PiTuiTerminalPort;
  readonly startup?: PiShellHeaderOptions;
}

export class PiSessionShellRoot implements PiTuiComponentPort {
  readonly editor: PiShellEditorPort;
  readonly header: PiShellHeaderPort;
  readonly resources: PiShellLoadedResourcesPort;
  readonly #cwd: string;
  readonly #transcript = new Map<string, PiShellTranscriptComponentPort>();
  #transcriptOrder: string[] = [];
  #view: OwnedUiSessionViewModel;
  readonly #status: PiShellViewComponentPort;
  readonly #footer: PiShellViewComponentPort;
  readonly #queued: PiShellQueuedInputPort;
  #toolsExpanded = false;
  #thinkingVisible = true;
  #workflowRows: string[] = [];

  constructor(
    view: OwnedUiSessionViewModel,
    cwd: string,
    handlers: {
      readonly getColumns: () => number;
      readonly getRows: () => number;
      readonly requestRender: () => void;
      readonly onSubmit: (text: string) => void;
      readonly onInterrupt: () => void;
      readonly onClear?: () => void;
      readonly onExit: () => void;
      readonly onModelSelect: () => void;
      readonly onModelCycle?: (direction: "forward" | "backward") => void;
      readonly onThinkingCycle: () => void;
      readonly onThinkingToggle?: () => void;
      readonly onMessageCopy?: () => void;
      readonly onFollowUp?: () => void;
      readonly onDequeue?: () => void;
    },
    startup: PiShellHeaderOptions = {},
    agentDir?: string,
  ) {
    this.#view = view;
    this.#cwd = cwd;
    this.header = createPiShellHeader(startup);
    this.resources = createPiShellLoadedResources(startup.resources ?? [], startup.expanded ?? false);
    this.#status = createPiShellStatus(view, handlers);
    this.#footer = createPiShellFooter(view, cwd);
    this.#queued = createPiQueuedInputStatus(view.editor.queuedSubmissions);
    this.editor = createPiShellEditor({
      ...handlers,
      cwd,
      ...(agentDir === undefined ? {} : { agentDir }),
      onToolsExpand: () => this.#setToolsExpanded(!this.#toolsExpanded),
    });
    this.editor.setThinkingLevel(view.thinkingLevel);
    this.#syncTranscript(view.transcript);
  }

  update(view: OwnedUiSessionViewModel): void {
    this.#view = view;
    this.#status.update(view);
    this.#footer.update(view);
    this.#queued.update(view.editor.queuedSubmissions);
    this.#syncTranscript(view.transcript);
    this.editor.setSubmitEnabled(view.lifecycle !== "stopping" && view.lifecycle !== "stopped" && view.lifecycle !== "failed");
    this.editor.setThinkingLevel(view.thinkingLevel);
    this.invalidate();
  }

  render(width: number): readonly string[] {
    const queued = this.#view.editor.queuedSubmissions.length === 0 ? [] : this.#queued.render(width);
    return [
      ...this.#renderDocument(width),
      ...queued,
      ...this.#status.render(width),
      ...this.editor.render(width),
      ...this.#footer.render(width),
    ];
  }

  layoutRoot(): PiTuiLayoutNode {
    const document = layoutPort(width => this.#renderDocument(width), () => this.invalidate());
    const queued = layoutPort(width => this.#view.editor.queuedSubmissions.length === 0 ? [] : this.#queued.render(width), () => this.#queued.invalidate());
    const status = layoutPort(width => this.#status.render(width), () => this.#status.invalidate());
    const editor = layoutPort(width => this.editor.render(width), () => this.editor.invalidate(), data => this.editor.handleInput?.(data));
    const footer = layoutPort(width => this.#footer.render(width), () => this.#footer.invalidate());
    return {
      type: "stack",
      direction: "vertical",
      children: [
        {
          basis: 0,
          grow: 1,
          shrink: 1,
          minSize: 1,
          node: {
            type: "scroll",
            id: "transcript",
            follow: "end",
            primary: true,
            overscroll: "chain",
            scrollbar: "auto",
            child: { type: "component", component: document },
          },
        },
        {
          basis: "auto",
          grow: 0,
          shrink: 1,
          minSize: 1,
          node: {
            type: "stack",
            direction: "vertical",
            children: [
              { shrink: 1, minSize: 0, node: { type: "component", component: queued } },
              { shrink: 1, minSize: 0, node: { type: "component", component: status } },
              { shrink: 1, minSize: 3, node: { type: "component", component: editor } },
              { shrink: 1, minSize: 1, node: { type: "component", component: footer } },
            ],
          },
        },
      ],
    };
  }

  #renderDocument(width: number): readonly string[] {
    const transcript = this.#transcriptOrder.flatMap(id => {
      if (!this.#thinkingVisible && this.#view.transcript.find(block => block.id === id)?.kind === "thinking") return [];
      return this.#transcript.get(id)?.render(width) ?? [];
    });
    const diagnosticRows = this.#view.diagnostics.slice(-3).flatMap(diagnostic =>
      renderPiShellTranscriptBlock({
        id: `diagnostic-${diagnostic.sequence}`,
        kind: diagnostic.severity === "error" ? "error" : "system",
        status: "finalized",
        revision: diagnostic.sequence,
        title: diagnostic.code,
        text: diagnostic.message,
        payload: {},
      }, width, this.#cwd));
    return [
      ...this.header.render(width),
      ...this.resources.render(width),
      ...transcript,
      ...diagnosticRows,
      ...this.#workflowRows,
    ];
  }

  transcriptComponent(id: string): PiShellTranscriptComponentPort | undefined {
    return this.#transcript.get(id);
  }

  appendWorkflowResult(result: PiWorkflowResult): void {
    const prefix = result.outcome === "failed" ? "Error: " : result.outcome === "cancelled" ? "" : "✓ ";
    const detail = result.detail?.split(/\r?\n/).slice(0, 32) ?? [];
    this.#workflowRows = [...this.#workflowRows, `${prefix}${result.message}`, ...detail].slice(-40);
    this.invalidate();
  }

  toggleThinkingVisibility(): void {
    this.#thinkingVisible = !this.#thinkingVisible;
    this.invalidate();
  }

  handleInput(data: string): void {
    this.editor.handleInput?.(data);
  }

  invalidate(): void {
    this.header.invalidate();
    this.resources.invalidate();
    for (const component of this.#transcript.values()) component.invalidate();
    this.editor.invalidate();
    this.#status.invalidate();
    this.#footer.invalidate();
    this.#queued.invalidate();
  }

  setFocused(focused: boolean): void {
    this.editor.setFocused?.(focused);
  }

  dispose(): void {
    this.header.dispose?.();
    this.resources.dispose?.();
    for (const component of this.#transcript.values()) component.dispose?.();
    this.#transcript.clear();
    this.editor.dispose?.();
    this.#status.dispose?.();
    this.#footer.dispose?.();
    this.#queued.dispose?.();
  }

  #syncTranscript(blocks: OwnedUiSessionViewModel["transcript"]): void {
    const nextIds = new Set(blocks.map(block => block.id));
    for (const [id, component] of this.#transcript) {
      if (nextIds.has(id)) continue;
      component.dispose?.();
      this.#transcript.delete(id);
    }
    for (const block of blocks) {
      const component = this.#transcript.get(block.id);
      if (component === undefined) {
        const created = createPiShellTranscriptComponent(block, this.#cwd);
        created.setExpanded(this.#toolsExpanded);
        this.#transcript.set(block.id, created);
      } else if (component.revision !== block.revision) {
        component.update(block);
      }
    }
    this.#transcriptOrder = blocks.map(block => block.id);
  }

  #setToolsExpanded(expanded: boolean): void {
    this.#toolsExpanded = expanded;
    this.header.setExpanded(expanded);
    this.resources.setExpanded(expanded);
    for (const component of this.#transcript.values()) component.setExpanded(expanded);
    this.invalidate();
  }
}

function layoutPort(
  render: (width: number) => readonly string[],
  invalidate: () => void,
  handleInput?: (data: string) => void,
): PiTuiComponentPort {
  return {
    render,
    invalidate,
    ...(handleInput === undefined ? {} : { handleInput }),
  };
}

function shellResourceEntries(adapter: PiEngineAdapter): readonly PiShellResourceEntry[] {
  const resources: PiShellResourceEntry[] = adapter.nonVisualResources().map(resource => ({
    section: resource.kind === "skill"
      ? "Skills"
      : resource.kind === "prompt-template"
        ? "Prompts"
        : resource.kind === "theme"
          ? "Themes"
          : "Context",
    label: resource.kind === "prompt-template"
      ? `/${resource.label}`
      : resource.kind === "agent-context" || resource.kind === "system-prompt"
        ? compactResourceLabel(resource.sourcePath ?? resource.label)
        : resource.label,
    sourcePath: resource.sourcePath,
    diagnostic: resource.diagnostic,
  }));
  for (const extension of adapter.extensionResources()) {
    if (extension.hidden) continue;
    resources.push({
      section: "Extensions",
      label: compactResourceLabel(extension.sourcePath ?? extension.resolvedPath ?? "extension"),
      sourcePath: extension.sourcePath ?? extension.resolvedPath,
      diagnostic: extension.diagnostic,
    });
  }
  return resources;
}

function compactResourceLabel(path: string): string {
  const segments = path.replaceAll("\\", "/").split("/").filter(Boolean);
  const leaf = segments.at(-1) ?? path;
  if ((leaf === "index.ts" || leaf === "index.js") && segments.length > 1) return segments.at(-2) ?? leaf;
  return leaf;
}

export class PiSessionShell {
  readonly adapter: PiEngineAdapter;
  readonly root: PiSessionShellRoot;
  readonly runtime: PiTuiRuntimeAdapter;
  readonly #cwd: string;
  readonly #listeners = new Set<(view: OwnedUiSessionViewModel) => void>();
  readonly #unsubscribe: () => void;
  readonly #stopped: Promise<void>;
  #resolveStopped: (() => void) | undefined;
  #dialogId: string | undefined;
  #dialogHandle: PiTuiOverlayHandle | undefined;
  #sequence = 0;
  #started = false;
  #disposed = false;
  #compactionQueue: Array<{ readonly text: string; readonly type: "steer" | "follow-up" }> = [];
  #lastClearTime = 0;

  constructor(options: PiSessionShellOptions) {
    this.adapter = options.adapter;
    this.#cwd = options.cwd;
    this.#stopped = new Promise(resolve => {
      this.#resolveStopped = resolve;
    });
    let runtime: PiTuiRuntimeAdapter | undefined;
    this.root = new PiSessionShellRoot(this.adapter.view(), options.cwd, {
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
    }, {
      ...options.startup,
      resources: options.startup?.resources ?? shellResourceEntries(this.adapter),
    }, this.adapter.agentDir);
    const runtimeOptions = options.terminal === undefined
      ? { root: this.root, layoutRoot: this.root.layoutRoot(), hardwareCursor: this.adapter.view().terminal.hardwareCursor }
      : { root: this.root, layoutRoot: this.root.layoutRoot(), terminal: options.terminal, hardwareCursor: this.adapter.view().terminal.hardwareCursor };
    runtime = new PiTuiRuntimeAdapter(runtimeOptions);
    this.runtime = runtime;
    this.adapter.setWorkflowInteractionHost({
      prompt: request => this.#requestWorkflowInput(request.message),
      notify: message => {
        this.root.appendWorkflowResult({ command: "login", outcome: "completed", message });
        this.runtime.requestRender();
      },
    });
    this.root.editor.setAutocompleteCommands(this.adapter.workflowAutocompleteCommands());
    this.#unsubscribe = this.adapter.onEvent(event => {
      this.#syncView();
      if (this.view().lifecycle === "ready" && this.#compactionQueue.length > 0) void this.#flushCompactionQueue();
      if (event.type === "session-lifecycle" && event.lifecycle === "stopped") this.#resolveStopped?.();
    });
    if (this.adapter.view().lifecycle === "stopped") this.#resolveStopped?.();
  }

  view(): OwnedUiSessionViewModel {
    return this.adapter.view();
  }

  start(): void {
    if (this.#started) return;
    this.#started = true;
    this.runtime.start();
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
        try {
          const result = await this.adapter.executeBashWorkflow(command, excludeFromContext);
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
      this.#compactionQueue.push({ text: input, type: "steer" });
      this.root.appendWorkflowResult({ command: "compact", outcome: "completed", message: `Queued during compaction: ${input}` });
      this.runtime.requestRender();
      return { outcome: "completed", diagnostic: null };
    }
    const type = this.view().lifecycle === "busy" ? "steer" as const : "prompt" as const;
    return this.#execute({
      type,
      correlationId: this.#correlation(type),
      sessionId: this.adapter.sessionId,
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
      sessionId: this.adapter.sessionId,
      sessionPath,
    });
  }

  async setModel(providerId: string, modelId: string): Promise<AdapterCommandResult> {
    return this.#execute({
      type: "set-model",
      correlationId: this.#correlation("model"),
      sessionId: this.adapter.sessionId,
      model: { providerId, modelId, displayName: modelId },
    });
  }

  async setThinkingLevel(thinkingLevel: OwnedUiThinkingLevel): Promise<AdapterCommandResult> {
    return this.#execute({
      type: "set-thinking-level",
      correlationId: this.#correlation("thinking"),
      sessionId: this.adapter.sessionId,
      thinkingLevel,
    });
  }

  async cycleThinkingLevel(): Promise<AdapterCommandResult> {
    const levels: readonly OwnedUiThinkingLevel[] = ["off", "minimal", "low", "medium", "high", "xhigh"];
    const current = Math.max(0, levels.indexOf(this.view().thinkingLevel));
    return this.setThinkingLevel(levels[(current + 1) % levels.length] ?? "off");
  }

  async cycleModel(direction: "forward" | "backward"): Promise<AdapterCommandResult> {
    const result = await this.adapter.cycleModelWorkflow(direction);
    this.root.appendWorkflowResult(result);
    this.runtime.requestRender();
    return workflowAdapterResult(result);
  }

  async queueFollowUp(): Promise<AdapterCommandResult> {
    const text = this.root.editor.getText().trim();
    if (!text) return rejected("nothing to queue");
    this.root.editor.setText("");
    if (this.view().status.workingMessage?.startsWith("Compacting") === true) {
      this.#compactionQueue.push({ text, type: "follow-up" });
      return { outcome: "completed", diagnostic: null };
    }
    return this.#execute({
      type: "follow-up",
      correlationId: this.#correlation("follow-up"),
      sessionId: this.adapter.sessionId,
      text,
    });
  }

  restoreQueuedInput(): void {
    const queued = [...this.adapter.clearQueuedWorkflows(), ...this.#compactionQueue.map(item => item.text)];
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
    const component = createPiShellSelector({
      title,
      options,
      onSelect: id => {
        onSelect(id);
        this.#dialogHandle?.hide();
        this.#dialogHandle = undefined;
      },
      onCancel: () => {
        this.#dialogHandle?.hide();
        this.#dialogHandle = undefined;
        onCancel?.();
      },
    });
    const handle = this.runtime.showOverlay(component, { width: "70%", maxHeight: "80%", anchor: "center" });
    this.#dialogHandle = handle;
    return handle;
  }

  showModelSelector(): void {
    void this.runWorkflow({ command: "model", argument: "" });
  }

  async shutdown(): Promise<AdapterCommandResult> {
    return this.runWorkflow({ command: "quit", argument: "" });
  }

  async runWorkflow(request: PiWorkflowRequest): Promise<AdapterCommandResult> {
    const result = await this.adapter.executeWorkflow(request);
    if (result.outcome === "requires-selection" || result.outcome === "requires-confirmation") {
      const options = result.options ?? [];
      this.showSelector(result.selectorTitle ?? result.message, options, id => {
        const next: PiWorkflowRequest = result.outcome === "requires-confirmation"
          ? { ...request, confirmed: id === "yes" }
          : { ...request, selection: id };
        void this.runWorkflow(next);
      }, () => {
        const cancelled: PiWorkflowResult = { command: request.command, outcome: "cancelled", message: `${result.message} cancelled` };
        this.root.appendWorkflowResult(cancelled);
        this.runtime.requestRender();
      });
      return { outcome: "completed", diagnostic: null };
    }
    this.root.appendWorkflowResult(result);
    if (request.command === "reload" && result.outcome === "completed") {
      this.root.editor.setAutocompleteCommands(this.adapter.workflowAutocompleteCommands());
    }
    this.runtime.requestRender();
    return workflowAdapterResult(result);
  }

  async dispose(): Promise<void> {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#unsubscribe();
    this.#dialogHandle?.hide();
    await this.runtime.dispose();
  }

  #syncView(): void {
    const view = this.view();
    this.root.update(view);
    this.#syncDialog(view.dialog);
    this.runtime.requestRender();
    for (const listener of this.#listeners) listener(view);
  }

  #syncDialog(dialog: OwnedUiDialog | null): void {
    if (!this.runtime.active) return;
    if (dialog === null) {
      this.#dialogHandle?.hide();
      this.#dialogHandle = undefined;
      this.#dialogId = undefined;
      return;
    }
    if (this.#dialogId === dialog.id) return;
    this.#dialogHandle?.hide();
    const component = createPiShellDialog(dialog, {
      onSelect: () => {
        this.#dialogHandle?.hide();
        this.#dialogHandle = undefined;
      },
      onCancel: () => {
        this.#dialogHandle?.hide();
        this.#dialogHandle = undefined;
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
    if (isWorkflowRoute(name)) return this.runWorkflow({ command: name, argument });
    // Unknown slash input, prompt templates, skills, and extension commands remain Pi prompt input.
    return this.#execute({
      type: this.view().lifecycle === "busy" ? "steer" : "prompt",
      correlationId: this.#correlation("prompt-command"),
      sessionId: this.adapter.sessionId,
      text,
    });
  }

  #requestWorkflowInput(message: string): Promise<string | null> {
    this.root.appendWorkflowResult({ command: "login", outcome: "completed", message });
    this.root.editor.setText("");
    this.runtime.requestRender();
    return new Promise(resolve => {
      const finish = (value: string | null) => {
        this.root.editor.setText("");
        this.root.editor.setSubmitHandler(text => { void this.submit(text); });
        this.root.editor.setInterruptHandler(() => { void this.interrupt(); });
        resolve(value);
      };
      this.root.editor.setSubmitHandler(text => finish(text.trim() || null));
      this.root.editor.setInterruptHandler(() => finish(null));
    });
  }

  async #flushCompactionQueue(): Promise<void> {
    const queued = this.#compactionQueue;
    this.#compactionQueue = [];
    for (const item of queued) {
      await this.#execute({
        type: item.type,
        correlationId: this.#correlation(`compaction-${item.type}`),
        sessionId: this.adapter.sessionId,
        text: item.text,
      });
    }
  }

  async #execute(command: OwnedUiCommand): Promise<AdapterCommandResult> {
    return this.adapter.execute(command);
  }

  #simple(type: "abort" | "retry" | "compact" | "shutdown" | "new-session"): OwnedUiCommand {
    return { type, correlationId: this.#correlation(type), sessionId: this.adapter.sessionId };
  }

  #correlation(prefix: string): string {
    this.#sequence += 1;
    return `pi-shell-${prefix}-${this.#sequence}`;
  }
}

function rejected(diagnostic: string): AdapterCommandResult {
  return { outcome: "rejected", diagnostic };
}

function workflowAdapterResult(result: PiWorkflowResult): AdapterCommandResult {
  if (result.outcome === "completed") return { outcome: "completed", diagnostic: null };
  if (result.outcome === "failed") return { outcome: "failed", diagnostic: result.message };
  return { outcome: "rejected", diagnostic: result.message };
}

function isWorkflowRoute(value: string): value is PiWorkflowRoute {
  return (PINNED_PI_WORKFLOW_COMMAND_NAMES as readonly string[]).includes(value)
    || (PINNED_PI_HIDDEN_COMMAND_NAMES as readonly string[]).includes(value);
}

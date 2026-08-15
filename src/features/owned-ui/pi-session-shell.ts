import type {
  OwnedUiCommand,
  OwnedUiDialog,
  OwnedUiSessionViewModel,
  OwnedUiThinkingLevel,
} from "../../foundation/owned-ui-contracts/index.js";
import type { AdapterCommandResult, PiEngineAdapter } from "../../foundation/pi-engine-adapter/index.js";
import {
  createPiQueuedInputStatus,
  createPiShellDialog,
  createPiShellEditor,
  createPiShellFooter,
  createPiShellHeader,
  createPiShellSelector,
  createPiShellStatus,
  createPiShellTranscriptComponent,
  renderPiShellTranscriptBlock,
  type PiShellComponentPort,
  type PiShellEditorPort,
  type PiShellHeaderOptions,
  type PiShellHeaderPort,
  type PiShellQueuedInputPort,
  type PiShellSelectorOption,
  type PiShellTranscriptComponentPort,
  type PiShellViewComponentPort,
} from "../../foundation/pi-component-adapter/index.js";
import {
  PiTuiRuntimeAdapter,
  type PiTuiComponentPort,
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
  readonly #cwd: string;
  readonly #transcript = new Map<string, PiShellTranscriptComponentPort>();
  #transcriptOrder: string[] = [];
  #view: OwnedUiSessionViewModel;
  readonly #status: PiShellViewComponentPort;
  readonly #footer: PiShellViewComponentPort;
  readonly #queued: PiShellQueuedInputPort;
  #toolsExpanded = false;

  constructor(
    view: OwnedUiSessionViewModel,
    cwd: string,
    handlers: {
      readonly getColumns: () => number;
      readonly getRows: () => number;
      readonly requestRender: () => void;
      readonly onSubmit: (text: string) => void;
      readonly onInterrupt: () => void;
      readonly onExit: () => void;
      readonly onModelSelect: () => void;
      readonly onThinkingCycle: () => void;
    },
    startup: PiShellHeaderOptions = {},
  ) {
    this.#view = view;
    this.#cwd = cwd;
    this.header = createPiShellHeader(startup);
    this.#status = createPiShellStatus(view);
    this.#footer = createPiShellFooter(view, cwd);
    this.#queued = createPiQueuedInputStatus(view.editor.queuedSubmissions);
    this.editor = createPiShellEditor({
      ...handlers,
      cwd,
      onToolsExpand: () => this.#setToolsExpanded(!this.#toolsExpanded),
    });
    this.#syncTranscript(view.transcript);
  }

  update(view: OwnedUiSessionViewModel): void {
    this.#view = view;
    this.#status.update(view);
    this.#footer.update(view);
    this.#queued.update(view.editor.queuedSubmissions);
    this.#syncTranscript(view.transcript);
    this.editor.setSubmitEnabled(view.lifecycle !== "stopping" && view.lifecycle !== "stopped" && view.lifecycle !== "failed");
    this.invalidate();
  }

  render(width: number): readonly string[] {
    const transcript = this.#transcriptOrder.flatMap(id => this.#transcript.get(id)?.render(width) ?? []);
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
    const queued = this.#view.editor.queuedSubmissions.length === 0 ? [] : this.#queued.render(width);
    return [
      ...this.header.render(width),
      ...transcript,
      ...diagnosticRows,
      ...queued,
      ...this.#status.render(width),
      ...this.editor.render(width),
      ...this.#footer.render(width),
    ];
  }

  transcriptComponent(id: string): PiShellTranscriptComponentPort | undefined {
    return this.#transcript.get(id);
  }

  handleInput(data: string): void {
    this.editor.handleInput?.(data);
  }

  invalidate(): void {
    this.header.invalidate();
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
    for (const component of this.#transcript.values()) component.setExpanded(expanded);
    this.invalidate();
  }
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
      onExit: () => { void this.shutdown(); },
      onModelSelect: () => this.showModelSelector(),
      onThinkingCycle: () => { void this.cycleThinkingLevel(); },
    }, options.startup);
    const runtimeOptions = options.terminal === undefined
      ? { root: this.root }
      : { root: this.root, terminal: options.terminal };
    runtime = new PiTuiRuntimeAdapter(runtimeOptions);
    this.runtime = runtime;
    this.#unsubscribe = this.adapter.onEvent(event => {
      this.#syncView();
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
    if (text.startsWith("/")) return this.#slashCommand(text);
    return this.#execute({
      type: "prompt",
      correlationId: this.#correlation("prompt"),
      sessionId: this.adapter.sessionId,
      text,
    });
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

  showSelector(title: string, options: readonly PiShellSelectorOption[], onSelect: (id: string) => void): PiTuiOverlayHandle {
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
      },
    });
    const handle = this.runtime.showOverlay(component, { width: "70%", maxHeight: "80%", anchor: "center" });
    this.#dialogHandle = handle;
    return handle;
  }

  showModelSelector(): void {
    const active = this.view().activeModel;
    const options = active === null
      ? [{ id: "cancel", label: "No active model", description: "Use /model provider/model" }]
      : [{ id: `${active.providerId}/${active.modelId}`, label: active.displayName, description: `${active.providerId}/${active.modelId}` }];
    this.showSelector("Model", options, id => {
      const [providerId, modelId] = id.split("/");
      if (providerId && modelId) void this.setModel(providerId, modelId);
    });
  }

  async shutdown(): Promise<AdapterCommandResult> {
    return this.#execute(this.#simple("shutdown"));
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
    const [name = "", ...args] = text.slice(1).trim().split(/\s+/).filter(Boolean);
    switch (name) {
      case "abort": return this.abort();
      case "retry": return this.retry();
      case "compact": return this.compact();
      case "new": return this.newSession();
      case "resume": return args.length === 0 ? rejected("/resume requires a session path") : this.resumeSession(args.join(" "));
      case "think": {
        const level = args[0];
        return isThinkingLevel(level) ? this.setThinkingLevel(level) : rejected("/think requires off, minimal, low, medium, high, or xhigh");
      }
      case "model": {
        const [providerId, modelId] = args.join(" ").split("/");
        return providerId && modelId ? this.setModel(providerId, modelId) : rejected("/model requires provider/model");
      }
      case "exit":
      case "quit": return this.shutdown();
      default: return rejected(`unknown owned UI command: /${name}`);
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

function isThinkingLevel(value: string | undefined): value is OwnedUiThinkingLevel {
  return value === "off" || value === "minimal" || value === "low" || value === "medium" || value === "high" || value === "xhigh";
}

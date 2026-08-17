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
  createPiExtensionUiBridge,
  createPiQueuedInputStatus,
  createPiShellAuthProviderSelector,
  createPiShellChangelog,
  createPiShellDialog,
  createPiShellEditor,
  createPiShellExtensionSelector,
  createPiShellFooter,
  createPiShellHeader,
  createPiShellHotkeys,
  createPiShellLoadedResources,
  createPiShellLoginDialog,
  createPiShellModelSelector,
  createPiShellScopedModelsSelector,
  createPiShellSelector,
  createPiShellSessionSelector,
  createPiShellSettingsSelector,
  createPiShellStatus,
  createPiShellTranscriptComponent,
  createPiShellTreeSelector,
  createPiShellTrustSelector,
  createPiShellUserMessageSelector,
  piTheme,
  renderPiShellTranscriptBlock,
  type PiExtensionUiBridge,
  type PiShellComponentPort,
  type PiShellEditorPort,
  type PiShellExtensionRendererResolver,
  type PiShellHeaderOptions,
  type PiShellHeaderPort,
  type PiShellLoadedResourcesPort,
  type PiShellQueuedInputPort,
  type PiShellResourceEntry,
  type PiShellScopedModelsSelectorPort,
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
  readonly #extensionRenderers: PiShellExtensionRendererResolver;
  #toolsExpanded = false;
  #thinkingVisible = true;
  #workflowRows: string[] = [];
  #workflowComponents: PiShellComponentPort[] = [];
  #workflowTranscriptSequence = 0;
  readonly #workflowStatusAnchors = new Map<string, number>();
  readonly #workflowStatusMessages = new Map<string, string>();
  #lastWorkflowStatusId: string | undefined;
  #inputSurface: PiShellComponentPort;
  #extensionHeader: PiShellComponentPort | null = null;
  #extensionFooter: PiShellComponentPort | null = null;
  readonly #extensionWidgets = new Map<string, { readonly component: PiShellComponentPort; readonly placement: "aboveEditor" | "belowEditor" }>();
  readonly #extensionStatuses = new Map<string, string>();
  #extensionWorkingMessage: string | undefined;
  #extensionWorkingVisible = true;
  #extensionNotifications: string[] = [];

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
    extensionRenderers: PiShellExtensionRendererResolver = {
      getMessageRenderer: () => undefined,
      getToolDefinition: () => undefined,
    },
  ) {
    this.#view = view;
    this.#cwd = cwd;
    this.#extensionRenderers = extensionRenderers;
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
    this.#inputSurface = this.editor;
    for (const block of view.transcript) {
      if (block.kind === "user") this.editor.addToHistory(block.text);
    }
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
      ...this.#renderWidgets("aboveEditor", width),
      ...this.#renderStatus(width),
      ...this.#inputSurface.render(width),
      ...this.#renderWidgets("belowEditor", width),
      ...this.#renderFooter(width),
    ];
  }

  layoutRoot(): PiTuiLayoutNode {
    const document = layoutPort(width => this.#renderDocument(width), () => this.invalidate());
    const queued = layoutPort(width => this.#view.editor.queuedSubmissions.length === 0 ? [] : this.#queued.render(width), () => this.#queued.invalidate());
    const aboveWidgets = layoutPort(width => this.#renderWidgets("aboveEditor", width), () => this.#invalidateExtensions());
    const status = layoutPort(width => this.#renderStatus(width), () => this.#status.invalidate());
    const editor = layoutPort(width => this.#inputSurface.render(width), () => this.#inputSurface.invalidate(), data => this.#inputSurface.handleInput?.(data));
    const belowWidgets = layoutPort(width => this.#renderWidgets("belowEditor", width), () => this.#invalidateExtensions());
    const footer = layoutPort(width => this.#renderFooter(width), () => (this.#extensionFooter ?? this.#footer).invalidate());
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
            scrollbarStyle: text => piTheme().bg("scrollbarThumb", text),
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
              { shrink: 1, minSize: 0, node: { type: "component", component: aboveWidgets } },
              { shrink: 1, minSize: 0, node: { type: "component", component: status } },
              { shrink: 1, minSize: 3, node: { type: "component", component: editor } },
              { shrink: 1, minSize: 0, node: { type: "component", component: belowWidgets } },
              { shrink: 1, minSize: 1, node: { type: "component", component: footer } },
            ],
          },
        },
      ],
    };
  }

  #renderDocument(width: number): readonly string[] {
    const transcript = this.#transcriptOrder.flatMap((id, index) => {
      const block = this.#view.transcript.find(item => item.id === id);
      if (!this.#thinkingVisible && block?.kind === "thinking") return [];
      const rows = this.#transcript.get(id)?.render(width) ?? [];
      if (index > 0 && block?.kind === "user") return ["", ...rows];
      return rows;
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
    const resourceRows = [...this.resources.render(width)];
    if (transcript.length > 0 && resourceRows.at(-1) === "") resourceRows.pop();
    return [
      ...(this.#extensionHeader ?? this.header).render(width),
      ...resourceRows,
      ...transcript,
      ...(transcript.length === 0 ? [] : [""]),
      ...diagnosticRows,
      ...this.#workflowRows,
      ...this.#workflowComponents.flatMap(component => component.render(width)),
    ];
  }

  transcriptComponent(id: string): PiShellTranscriptComponentPort | undefined {
    return this.#transcript.get(id);
  }

  appendWorkflowStatus(message: string): void {
    const previousId = this.#lastWorkflowStatusId;
    if (previousId !== undefined
      && this.#transcriptOrder.at(-1) === previousId
      && this.#workflowStatusAnchors.get(previousId) === this.#view.transcript.length) {
      this.#workflowStatusMessages.set(previousId, message);
      this.invalidate();
      return;
    }
    const id = this.#appendAnchoredWorkflowComponent(() => ["", ` ${piTheme().fg("dim", this.#workflowStatusMessages.get(id) ?? message)}`]);
    this.#workflowStatusMessages.set(id, message);
    this.#lastWorkflowStatusId = id;
  }

  appendWorkflowResult(result: PiWorkflowResult): void {
    if (result.command === "reload" && result.outcome === "completed") {
      this.appendWorkflowStatus(result.message);
      return;
    }
    this.#lastWorkflowStatusId = undefined;
    if (result.command === "hotkeys" && result.outcome === "completed") {
      const hotkeys = createPiShellHotkeys();
      this.#appendAnchoredWorkflowComponent(width => hotkeys.render(width), () => hotkeys.dispose?.());
      return;
    }
    if (result.command === "changelog" && result.outcome === "completed") {
      const changelog = createPiShellChangelog(result.detail ?? "No changelog entries found.");
      this.#appendAnchoredWorkflowComponent(width => changelog.render(width), () => changelog.dispose?.());
      return;
    }
    if (result.outcome === "failed") {
      this.#appendAnchoredWorkflowComponent(() => ["", ` ${piTheme().fg("error", `Error: ${result.message}`)}`]);
      return;
    }
    const prefix = result.outcome === "cancelled" ? "" : "✓ ";
    const detail = result.detail?.split(/\r?\n/).slice(0, 32) ?? [];
    this.#workflowRows = [...this.#workflowRows, `${prefix}${result.message}`, ...detail].slice(-40);
    this.invalidate();
  }

  toggleThinkingVisibility(): void {
    this.#thinkingVisible = !this.#thinkingVisible;
    this.invalidate();
  }

  get toolsExpanded(): boolean {
    return this.#toolsExpanded;
  }

  setToolsExpanded(expanded: boolean): void {
    this.#setToolsExpanded(expanded);
  }

  setExtensionWidget(key: string, component: PiShellComponentPort | null, placement: "aboveEditor" | "belowEditor"): void {
    const previous = this.#extensionWidgets.get(key)?.component;
    if (component === null) this.#extensionWidgets.delete(key);
    else this.#extensionWidgets.set(key, { component, placement });
    if (previous !== undefined && previous !== component) previous.dispose?.();
    this.invalidate();
  }

  setExtensionHeader(component: PiShellComponentPort | null): void {
    if (this.#extensionHeader !== component) this.#extensionHeader?.dispose?.();
    this.#extensionHeader = component;
    this.invalidate();
  }

  setExtensionFooter(component: PiShellComponentPort | null): void {
    if (this.#extensionFooter !== component) this.#extensionFooter?.dispose?.();
    this.#extensionFooter = component;
    this.invalidate();
  }

  setExtensionStatus(key: string, text: string | undefined): void {
    if (text === undefined) this.#extensionStatuses.delete(key);
    else this.#extensionStatuses.set(key, text);
    this.invalidate();
  }

  setExtensionWorking(message: string | undefined, visible = this.#extensionWorkingVisible): void {
    this.#extensionWorkingMessage = message;
    this.#extensionWorkingVisible = visible;
    this.invalidate();
  }

  resetExtensionUi(): void {
    this.#extensionHeader?.dispose?.();
    this.#extensionFooter?.dispose?.();
    for (const { component } of this.#extensionWidgets.values()) component.dispose?.();
    this.#extensionHeader = null;
    this.#extensionFooter = null;
    this.#extensionWidgets.clear();
    this.#extensionStatuses.clear();
    this.#extensionWorkingMessage = undefined;
    this.invalidate();
  }

  addExtensionNotification(message: string, type: "info" | "warning" | "error"): void {
    const prefix = type === "info" ? "" : `${type === "warning" ? "Warning" : "Error"}: `;
    this.#extensionNotifications = [...this.#extensionNotifications, `${prefix}${message}`].slice(-4);
    this.invalidate();
  }

  extensionFooterData(): unknown {
    return {
      getGitBranch: () => this.#view.status.footer?.branch ?? null,
      getExtensionStatuses: () => new Map(this.#extensionStatuses),
      getAvailableProviderCount: () => this.#view.status.footer?.availableProviderCount ?? 1,
      onBranchChange: () => () => {},
    };
  }

  setInputSurface(component: PiShellComponentPort | null): void {
    const next = component ?? this.editor;
    if (next === this.#inputSurface) return;
    this.#inputSurface.setFocused?.(false);
    if (this.#inputSurface !== this.editor) this.#inputSurface.dispose?.();
    this.#inputSurface = next;
    this.#inputSurface.setFocused?.(true);
    this.invalidate();
  }

  handleInput(data: string): void {
    this.#inputSurface.handleInput?.(data);
  }

  invalidate(): void {
    this.header.invalidate();
    this.resources.invalidate();
    for (const component of this.#transcript.values()) component.invalidate();
    this.editor.invalidate();
    if (this.#inputSurface !== this.editor) this.#inputSurface.invalidate();
    for (const component of this.#workflowComponents) component.invalidate();
    this.#invalidateExtensions();
    this.#status.invalidate();
    this.#footer.invalidate();
    this.#queued.invalidate();
  }

  setFocused(focused: boolean): void {
    this.#inputSurface.setFocused?.(focused);
  }

  dispose(): void {
    this.header.dispose?.();
    this.resources.dispose?.();
    for (const component of this.#transcript.values()) component.dispose?.();
    this.#transcript.clear();
    if (this.#inputSurface !== this.editor) this.#inputSurface.dispose?.();
    for (const component of this.#workflowComponents) component.dispose?.();
    this.#extensionHeader?.dispose?.();
    this.#extensionFooter?.dispose?.();
    for (const { component } of this.#extensionWidgets.values()) component.dispose?.();
    this.#extensionWidgets.clear();
    this.editor.dispose?.();
    this.#status.dispose?.();
    this.#footer.dispose?.();
    this.#queued.dispose?.();
  }

  #syncTranscript(blocks: OwnedUiSessionViewModel["transcript"]): void {
    const nextIds = new Set(blocks.map(block => block.id));
    for (const [id, component] of this.#transcript) {
      if (id.startsWith("workflow-status-") || nextIds.has(id)) continue;
      component.dispose?.();
      this.#transcript.delete(id);
    }
    for (const block of blocks) {
      const component = this.#transcript.get(block.id);
      if (component === undefined) {
        const created = createPiShellTranscriptComponent(block, this.#cwd, this.#extensionRenderers);
        created.setExpanded(this.#toolsExpanded);
        this.#transcript.set(block.id, created);
      } else if (component.revision !== block.revision) {
        component.update(block);
      }
    }
    const statusIds = [...this.#workflowStatusAnchors.keys()];
    const order: string[] = [];
    for (let index = 0; index <= blocks.length; index += 1) {
      for (const statusId of statusIds) {
        if (this.#workflowStatusAnchors.get(statusId) === index) order.push(statusId);
      }
      const block = blocks[index];
      if (block !== undefined) order.push(block.id);
    }
    for (const statusId of statusIds) {
      if (!order.includes(statusId)) order.push(statusId);
    }
    this.#transcriptOrder = order;
  }

  #appendAnchoredWorkflowComponent(render: (width: number) => readonly string[], dispose?: () => void): string {
    this.#workflowTranscriptSequence += 1;
    const id = `workflow-status-${this.#workflowTranscriptSequence}`;
    const component: PiShellTranscriptComponentPort = {
      id,
      revision: 1,
      render,
      handleInput() {},
      invalidate() {},
      update() {},
      setExpanded() {},
      ...(dispose === undefined ? {} : { dispose }),
    };
    this.#transcript.set(id, component);
    this.#workflowStatusAnchors.set(id, this.#view.transcript.length);
    this.#transcriptOrder.push(id);
    this.invalidate();
    return id;
  }

  #renderWidgets(placement: "aboveEditor" | "belowEditor", width: number): readonly string[] {
    return [...this.#extensionWidgets.values()]
      .filter(widget => widget.placement === placement)
      .flatMap(widget => widget.component.render(width));
  }

  #renderStatus(width: number): readonly string[] {
    const rows = [...this.#extensionNotifications];
    if (this.#extensionWorkingVisible && this.#extensionWorkingMessage) rows.push(this.#extensionWorkingMessage);
    rows.push(...this.#extensionStatuses.values());
    return [...rows, ...this.#status.render(width)];
  }

  #renderFooter(width: number): readonly string[] {
    return (this.#extensionFooter ?? this.#footer).render(width);
  }

  #invalidateExtensions(): void {
    this.#extensionHeader?.invalidate();
    this.#extensionFooter?.invalidate();
    for (const { component } of this.#extensionWidgets.values()) component.invalidate();
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
  readonly #extensionBridge: PiExtensionUiBridge;
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
    }, this.adapter.agentDir, {
      getMessageRenderer: customType => this.adapter.pinnedMessageRenderer(customType),
      getToolDefinition: toolName => this.adapter.pinnedToolDefinition(toolName),
    });
    const runtimeOptions = options.terminal === undefined
      ? { root: this.root, layoutRoot: this.root.layoutRoot(), hardwareCursor: this.adapter.view().terminal.hardwareCursor }
      : { root: this.root, layoutRoot: this.root.layoutRoot(), terminal: options.terminal, hardwareCursor: this.adapter.view().terminal.hardwareCursor };
    runtime = new PiTuiRuntimeAdapter(runtimeOptions);
    this.runtime = runtime;
    this.#extensionBridge = createPiExtensionUiBridge({
      runtime: {
        getColumns: () => this.runtime.viewport().columns,
        getRows: () => this.runtime.viewport().rows,
        requestRender: () => this.runtime.requestRender(),
      },
      agentDir: this.adapter.agentDir,
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
    void this.adapter.bindExtensionUi(this.#extensionBridge.context, () => { void this.shutdown(); });
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
      this.root.editor.addToHistory(input);
      this.#compactionQueue.push({ text: input, type: "steer" });
      this.root.appendWorkflowResult({ command: "compact", outcome: "completed", message: `Queued during compaction: ${input}` });
      this.runtime.requestRender();
      return { outcome: "completed", diagnostic: null };
    }
    const type = this.view().lifecycle === "busy" ? "steer" as const : "prompt" as const;
    this.root.editor.addToHistory(input);
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
    this.root.editor.addToHistory(text);
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

  showSessionSelector(): void {
    const context = this.adapter.pinnedSessionSelectorContext();
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
    const snapshot = this.adapter.pinnedSettingsSnapshot();
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
        const result = this.adapter.applyPinnedSettingValue(callback, value);
        if (result.outcome === "failed") this.root.appendWorkflowResult(result);
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
    if (request.command === "trust" && request.selection === undefined && request.confirmed === undefined) {
      this.showTrustSelector();
      return { outcome: "completed", diagnostic: null };
    }
    if (request.command === "settings" && request.selection === undefined && request.confirmed === undefined) {
      const opened = this.adapter.executeWorkflow(request);
      this.showSettingsSelector();
      await opened;
      return { outcome: "completed", diagnostic: null };
    }
    if (request.command === "resume" && request.selection === undefined && request.confirmed === undefined && request.argument.trim().length === 0) {
      this.showSessionSelector();
      return { outcome: "completed", diagnostic: null };
    }
    const result = await this.adapter.executeWorkflow(request);
    if (result.outcome === "requires-selection" || result.outcome === "requires-confirmation") {
      this.#showWorkflowSelector(request, result);
      return { outcome: "completed", diagnostic: null };
    }
    if (request.command === "reload" && result.outcome === "completed") {
      this.root.resetExtensionUi();
      this.root.editor.setAutocompleteCommands(this.adapter.workflowAutocompleteCommands());
    }
    this.root.appendWorkflowResult(result);
    this.runtime.requestRender();
    return workflowAdapterResult(result);
  }

  showTrustSelector(): void {
    const context = this.adapter.pinnedProjectTrustContext();
    const close = () => {
      this.root.setInputSurface(null);
      this.runtime.requestRender();
    };
    const component = createPiShellTrustSelector({
      ...context,
      onSelect: selection => {
        try {
          this.adapter.persistProjectTrust(selection.updates);
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
    const initial = this.adapter.pinnedScopedModelsContext();
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
        this.adapter.updateScopedModels(currentEnabledIds);
        this.runtime.requestRender();
      },
      onPersist: enabledIds => {
        currentEnabledIds = enabledIds === null ? null : [...enabledIds];
        this.adapter.persistScopedModels(currentEnabledIds);
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
    void this.adapter.refreshScopedModels(controller.signal).then(refreshed => {
      if (disposed) return;
      if (!selectionChanged) {
        currentEnabledIds = refreshed.enabledModelIds === null ? null : [...refreshed.enabledModelIds];
        component.updateModels(refreshed.models, currentEnabledIds);
      } else {
        component.updateModels(refreshed.models);
        this.adapter.updateScopedModels(currentEnabledIds);
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

  #showWorkflowSelector(request: PiWorkflowRequest, result: PiWorkflowResult): void {
    const options = result.options ?? [];
    const close = () => {
      this.root.setInputSurface(null);
      this.runtime.requestRender();
    };
    const select = (id: string) => {
      close();
      const next: PiWorkflowRequest = result.outcome === "requires-confirmation"
        ? { ...request, confirmed: id === "yes" }
        : { ...request, selection: id };
      void this.runWorkflow(next);
    };
    const cancel = () => {
      close();
    };
    let component: PiShellComponentPort;
    if (result.outcome === "requires-confirmation") {
      component = createPiShellExtensionSelector(
        `${result.selectorTitle ?? "Confirm"}\n${result.message}`,
        options.map(option => option.label),
        label => {
          const selected = options.find(option => option.label === label);
          if (selected !== undefined) select(selected.id);
        },
        cancel,
      );
    } else if (request.command === "fork") {
      component = createPiShellUserMessageSelector(options, select, cancel);
    } else if (request.command === "login" || request.command === "logout") {
      component = createPiShellAuthProviderSelector(request.command, options, select, cancel);
    } else if (request.command === "model") {
      const context = this.adapter.pinnedModelSelectorContext();
      component = createPiShellModelSelector({
        ...context,
        runtime: {
          getColumns: () => this.runtime.viewport().columns,
          getRows: () => this.runtime.viewport().rows,
          requestRender: () => this.runtime.requestRender(),
        },
        onSelect: model => select(modelReference(model)),
        onCancel: cancel,
      });
    } else if (request.command === "tree") {
      const context = this.adapter.pinnedTreeSelectorContext();
      component = createPiShellTreeSelector(context.tree, context.currentLeafId, this.runtime.viewport().rows, select, cancel);
    } else {
      component = createPiShellSelector({ title: result.selectorTitle ?? result.message, options, onSelect: select, onCancel: cancel });
    }
    this.root.setInputSurface(component);
    this.runtime.requestRender();
  }

  async dispose(): Promise<void> {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#unsubscribe();
    this.#dialogHandle?.hide();
    await this.adapter.unbindExtensionUi();
    this.#extensionBridge.dispose();
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
    this.root.editor.addToHistory(text);
    return this.#execute({
      type: this.view().lifecycle === "busy" ? "steer" : "prompt",
      correlationId: this.#correlation("prompt-command"),
      sessionId: this.adapter.sessionId,
      text,
    });
  }

  #requestWorkflowInput(message: string): Promise<string | null> {
    return new Promise(resolve => {
      let settled = false;
      const finish = (value: string | null) => {
        if (settled) return;
        settled = true;
        this.root.setInputSurface(null);
        this.runtime.requestRender();
        resolve(value);
      };
      const dialog = createPiShellLoginDialog({
        getColumns: () => this.runtime.viewport().columns,
        getRows: () => this.runtime.viewport().rows,
        requestRender: () => this.runtime.requestRender(),
      }, "provider", success => {
        if (!success) finish(null);
      });
      this.root.setInputSurface(dialog);
      void dialog.showPrompt(message).then(value => finish(value.trim() || null), () => finish(null));
      this.runtime.requestRender();
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

function isWorkflowRoute(value: string): value is PiWorkflowRoute {
  return (PINNED_PI_WORKFLOW_COMMAND_NAMES as readonly string[]).includes(value)
    || (PINNED_PI_HIDDEN_COMMAND_NAMES as readonly string[]).includes(value);
}

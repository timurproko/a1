import type {
  OwnedUiCommand,
  OwnedUiDialog,
  OwnedUiSessionViewModel,
  OwnedUiThinkingLevel,
} from "../../../foundation/owned-ui-contracts/index.js";
import type { UiRouteHost } from "./route-host.js";
import { MOUSE_TRACKING_OFF, MOUSE_TRACKING_ON, parseMouseInput } from "../../../foundation/ui-components/index.js";
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

export type OwnedUiBackendPort = PiEngineAdapter;
export type OwnedUiTerminalPort = PiTuiTerminalPort;
type OwnedUiStartupOptions = PiShellHeaderOptions;

export interface OwnedUiSessionShellOptions {
  readonly backend: OwnedUiBackendPort;
  readonly cwd: string;
  readonly terminal?: OwnedUiTerminalPort;
  readonly startup?: OwnedUiStartupOptions;
  /**
   * Declared A1-owned routes. A route this host claims resolves to its app;
   * every other route continues to the pinned workflow table unchanged.
   */
  readonly routeHost?: UiRouteHost;
}

export class OwnedUiSessionShellRoot implements PiTuiComponentPort {
  readonly editor: PiShellEditorPort;
  readonly header: PiShellHeaderPort;
  readonly resources: PiShellLoadedResourcesPort;
  readonly #cwd: string;
  readonly #transcript = new Map<string, PiShellTranscriptComponentPort>();
  readonly #blocksById = new Map<string, OwnedUiSessionViewModel["transcript"][number]>();
  readonly #renderedRows = new Map<string, { readonly width: number; readonly revision: number; readonly rows: readonly string[] }>();
  readonly #themeUnsubscribe: () => void;
  #transcriptOrder: string[] = [];
  #view: OwnedUiSessionViewModel;
  readonly #status: PiShellStatusPort;
  readonly #footer: PiShellViewComponentPort;
  readonly #queued: PiShellQueuedInputPort;
  readonly #extensionRenderers: PiShellExtensionRendererResolver;
  readonly #componentRuntime: {
    readonly getColumns: () => number;
    readonly getRows: () => number;
    readonly requestRender: () => void;
  };
  #toolsExpanded = false;
  #thinkingVisible = true;
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
    this.#componentRuntime = handlers;
    this.header = createPiShellHeader(startup);
    this.resources = createPiShellLoadedResources(startup.resources ?? [], startup.expanded ?? false);
    this.#status = createPiShellStatus(view, handlers);
    this.#footer = createPiShellFooter(this.#viewWithExtensionStatuses(view), cwd);
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
    // Colours come from the active theme, so rendered rows outlive their revision only
    // until the theme under them changes.
    this.#themeUnsubscribe = onPiThemeChange(() => this.#renderedRows.clear());
  }

  update(view: OwnedUiSessionViewModel): void {
    this.#view = view;
    this.#status.update(view);
    this.#footer.update(this.#viewWithExtensionStatuses(view));
    this.#queued.update(view.editor.queuedSubmissions);
    this.#syncTranscript(view.transcript);
    this.editor.setSubmitEnabled(view.lifecycle !== "stopping" && view.lifecycle !== "stopped" && view.lifecycle !== "failed");
    this.editor.setThinkingLevel(view.thinkingLevel);
    this.invalidate();
  }

  /**
   * Applies one block: its component is created or updated in place and the order grows
   * only when the block is new. A streamed chunk costs one component update rather than a
   * walk of the whole transcript.
   */
  applyTranscriptBlock(block: OwnedUiSessionViewModel["transcript"][number]): void {
    this.#blocksById.set(block.id, block);
    const component = this.#transcript.get(block.id);
    if (component === undefined) {
      const created = createPiShellTranscriptComponent(block, this.#cwd, this.#extensionRenderers);
      created.setExpanded(this.#toolsExpanded);
      this.#transcript.set(block.id, created);
      this.#transcriptOrder.push(block.id);
    } else if (component.revision !== block.revision) {
      component.update(block);
    }
    this.invalidate();
  }

  render(width: number): readonly string[] {
    const queued = this.#view.editor.queuedSubmissions.length === 0 ? [] : this.#queued.render(width);
    return [
      ...this.#renderDocument(width),
      ...queued,
      ...this.#renderStatus(width),
      ...this.#renderWidgets("aboveEditor", width),
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
              { shrink: 1, minSize: 0, node: { type: "component", component: status } },
              { shrink: 1, minSize: 0, node: { type: "component", component: aboveWidgets } },
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
      const block = this.#blocksById.get(id);
      if (!this.#thinkingVisible && block?.kind === "thinking") return [];
      const rows = this.#blockRows(id, block, width);
      if (index > 0 && block?.kind === "user") return ["", ...rows];
      return rows;
    });
    const diagnostics = this.#view.diagnostics;
    const startupRows = diagnostics
      .filter(diagnostic => diagnostic.code === "engine-startup")
      .flatMap(diagnostic => renderPiShellStartupDiagnostic(diagnostic, width));
    const packageUpdateRows = diagnostics
      .filter(diagnostic => diagnostic.code === "package-updates")
      .flatMap(diagnostic => renderPiShellPackageUpdateNotice(
        diagnostic.message.split("\n").filter(line => line.startsWith("- ")).map(line => line.slice(2)),
        width,
      ));
    const diagnosticRows = diagnostics
      .filter(diagnostic => diagnostic.code !== "engine-startup" && diagnostic.code !== "package-updates")
      .slice(-3)
      .flatMap(diagnostic =>
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
    if (resourceRows.at(-1) === "") resourceRows.pop();
    return [
      ...startupRows,
      ...(this.#extensionHeader ?? this.header).render(width),
      ...resourceRows,
      ...transcript,
      ...packageUpdateRows,
      ...diagnosticRows,
    ];
  }

  /**
   * Rows for one transcript block. A finalized block renders once for a given revision
   * and width and is reused after that, so a frame costs what changed rather than what
   * the session has accumulated. A live block, and anything the shell drives itself, is
   * rendered every time because its content is still moving.
   */
  #blockRows(id: string, block: OwnedUiSessionViewModel["transcript"][number] | undefined, width: number): readonly string[] {
    const component = this.#transcript.get(id);
    if (component === undefined) return [];
    if (block === undefined || block.status !== "finalized") return component.render(width);

    const cached = this.#renderedRows.get(id);
    if (cached && cached.width === width && cached.revision === block.revision) return cached.rows;
    const rows = component.render(width);
    this.#renderedRows.set(id, { width, revision: block.revision, rows });
    return rows;
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
    const id = this.#appendAnchoredWorkflowComponent(width => [
      "",
      ...renderPiShellStatusText(this.#workflowStatusMessages.get(id) ?? message, width),
    ]);
    this.#workflowStatusMessages.set(id, message);
    this.#lastWorkflowStatusId = id;
  }

  appendWorkflowResult(result: PiWorkflowResult): void {
    if (result.command === "reload" && result.outcome === "completed") {
      this.appendWorkflowStatus(result.message);
      return;
    }
    if (result.command === "session" && result.outcome === "completed" && result.presentation?.kind === "session-info") {
      this.#lastWorkflowStatusId = undefined;
      const sessionInfo = createPiShellSessionInfo(result.presentation);
      this.#appendAnchoredWorkflowComponent(width => sessionInfo.render(width), () => sessionInfo.dispose?.());
      return;
    }
    if (result.command === "hotkeys" && result.outcome === "completed") {
      this.#lastWorkflowStatusId = undefined;
      const hotkeys = createPiShellHotkeys();
      this.#appendAnchoredWorkflowComponent(width => hotkeys.render(width), () => hotkeys.dispose?.());
      return;
    }
    if (result.command === "changelog" && result.outcome === "completed") {
      this.#lastWorkflowStatusId = undefined;
      const changelog = createPiShellChangelog(result.detail ?? "No changelog entries found.");
      this.#appendAnchoredWorkflowComponent(width => changelog.render(width), () => changelog.dispose?.());
      return;
    }
    if (result.outcome === "failed") {
      this.#lastWorkflowStatusId = undefined;
      const warning = (result.command === "name" && result.message.startsWith("Usage:"))
        || (result.command === "reload" && result.message.startsWith("Wait for "));
      const prefix = warning ? "Warning" : "Error";
      const color = warning ? "warning" : "error";
      this.#appendAnchoredWorkflowComponent(() => ["", ` ${piTheme().fg(color, `${prefix}: ${result.message}`)}`]);
      return;
    }
    if (result.outcome === "completed" && (result.command === "quit" || result.command === "compact")) return;
    if (result.command === "new" && result.outcome === "completed") {
      this.#lastWorkflowStatusId = undefined;
      this.#appendAnchoredWorkflowComponent(() => ["", ` ${piTheme().fg("accent", result.message)}`]);
      return;
    }
    if (result.command === "name" && result.outcome === "completed") {
      this.#lastWorkflowStatusId = undefined;
      this.#appendAnchoredWorkflowComponent(() => [
        ...(result.detail ? ["", ` ${piTheme().fg("warning", `Warning: ${result.detail}`)}`] : []),
        "",
        ` ${piTheme().fg("dim", result.message)}`,
      ]);
      return;
    }
    if (result.command === "debug" && result.outcome === "completed") {
      this.#lastWorkflowStatusId = undefined;
      this.#appendAnchoredWorkflowComponent(() => [
        "",
        ` ${piTheme().fg("accent", result.message)}`,
        ...(result.detail ? [` ${piTheme().fg("muted", result.detail)}`] : []),
      ]);
      return;
    }
    if (result.command === "arminsayshi" && result.outcome === "completed") {
      this.#lastWorkflowStatusId = undefined;
      const armin = createPiShellArmin(this.#componentRuntime);
      this.#appendAnchoredWorkflowComponent(width => ["", ...armin.render(width)], () => armin.dispose?.());
      return;
    }
    if (result.command === "dementedelves" && result.outcome === "completed") {
      this.#lastWorkflowStatusId = undefined;
      const announcement = createPiShellEarendilAnnouncement();
      this.#appendAnchoredWorkflowComponent(width => ["", ...announcement.render(width)], () => announcement.dispose?.());
      return;
    }
    const message = result.command === "share" && result.detail
      ? `${result.message}\nGist: ${result.detail}`
      : result.message;
    this.appendWorkflowStatus(message);
  }

  appendDaxnuts(): void {
    this.#lastWorkflowStatusId = undefined;
    const daxnuts = createPiShellDaxnuts(this.#componentRuntime);
    this.#appendAnchoredWorkflowComponent(width => ["", ...daxnuts.render(width)], () => daxnuts.dispose?.());
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
    this.#footer.update(this.#viewWithExtensionStatuses(this.#view));
    this.invalidate();
  }

  setExtensionWorking(message: string | undefined, visible = this.#extensionWorkingVisible): void {
    this.#extensionWorkingMessage = message;
    this.#extensionWorkingVisible = visible;
    this.#status.setWorkingOverride(visible ? message : undefined);
    this.invalidate();
  }

  resetWorkflowPresentation(): void {
    for (const id of this.#workflowStatusAnchors.keys()) {
      this.#transcript.get(id)?.dispose?.();
      this.#transcript.delete(id);
    }
    this.#workflowStatusAnchors.clear();
    this.#workflowStatusMessages.clear();
    this.#transcriptOrder = this.#transcriptOrder.filter(id => !id.startsWith("workflow-status-"));
    this.#lastWorkflowStatusId = undefined;
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
    this.#status.setWorkingOverride(undefined);
    this.#footer.update(this.#viewWithExtensionStatuses(this.#view));
    // An extension renderer may have drawn transcript blocks that are now unrendered by it.
    this.#renderedRows.clear();
    this.invalidate();
  }

  addExtensionNotification(message: string, type: "info" | "warning" | "error"): void {
    if (type === "info") {
      this.appendWorkflowStatus(message);
      return;
    }
    this.#lastWorkflowStatusId = undefined;
    const prefix = type === "warning" ? "Warning" : "Error";
    this.#appendAnchoredWorkflowComponent(() => ["", ` ${piTheme().fg(type, `${prefix}: ${message}`)}`]);
  }

  extensionFooterData(): unknown {
    return {
      getGitBranch: () => this.#view.status.footer?.branch ?? null,
      getExtensionStatuses: () => new Map(this.#extensionStatuses),
      getAvailableProviderCount: () => this.#view.status.footer?.availableProviderCount ?? 1,
      onBranchChange: () => () => {},
    };
  }

  setInputSurface(component: PiShellComponentPort | null, disposePrevious = true): void {
    const next = component ?? this.editor;
    if (next === this.#inputSurface) return;
    this.#inputSurface.setFocused?.(false);
    if (disposePrevious && this.#inputSurface !== this.editor) this.#inputSurface.dispose?.();
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
    this.#invalidateExtensions();
    this.#status.invalidate();
    this.#footer.invalidate();
    this.#queued.invalidate();
  }

  setFocused(focused: boolean): void {
    this.#inputSurface.setFocused?.(focused);
  }

  dispose(): void {
    this.#themeUnsubscribe();
    this.header.dispose?.();
    this.resources.dispose?.();
    for (const component of this.#transcript.values()) component.dispose?.();
    this.#transcript.clear();
    this.#renderedRows.clear();
    if (this.#inputSurface !== this.editor) this.#inputSurface.dispose?.();
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
    this.#blocksById.clear();
    for (const block of blocks) this.#blocksById.set(block.id, block);
    const nextIds = new Set(blocks.map(block => block.id));
    for (const [id, component] of this.#transcript) {
      if (id.startsWith("workflow-status-") || nextIds.has(id)) continue;
      component.dispose?.();
      this.#transcript.delete(id);
      this.#renderedRows.delete(id);
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
    const placed = new Set(order);
    for (const statusId of statusIds) {
      if (!placed.has(statusId)) order.push(statusId);
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
    const rows = [...this.#extensionWidgets.values()]
      .filter(widget => widget.placement === placement)
      .flatMap(widget => widget.component.render(width));
    return placement === "aboveEditor" ? ["", ...rows] : rows;
  }

  #renderStatus(width: number): readonly string[] {
    return this.#status.render(width);
  }

  #renderFooter(width: number): readonly string[] {
    return (this.#extensionFooter ?? this.#footer).render(width);
  }

  #viewWithExtensionStatuses(view: OwnedUiSessionViewModel): OwnedUiSessionViewModel {
    const footer = view.status.footer;
    const statuses = new Map(footer?.extensionStatuses ?? []);
    for (const [key, text] of this.#extensionStatuses) statuses.set(key, text);
    return {
      ...view,
      status: {
        ...view.status,
        footer: {
          branch: footer?.branch ?? null,
          sessionName: footer?.sessionName ?? null,
          availableProviderCount: footer?.availableProviderCount ?? 1,
          extensionStatuses: [...statuses],
        },
      },
    };
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
    // Expansion changes what a block draws without changing its revision.
    this.#renderedRows.clear();
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

export function shellResourceEntries(backend: OwnedUiBackendPort): readonly PiShellResourceEntry[] {
  const resources: PiShellResourceEntry[] = backend.nonVisualResources().map(resource => ({
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
  const extensions = backend.extensionResources().filter(extension => !extension.hidden);
  const loadedExtensions = extensions.filter(extension => extension.diagnostic === null);
  const extensionLabels = compactExtensionLabels(loadedExtensions);
  for (const extension of extensions) {
    const labelIndex = loadedExtensions.indexOf(extension);
    resources.push({
      section: "Extensions",
      label: extensionLabels[labelIndex] ?? compactResourceLabel(extension.sourcePath ?? extension.resolvedPath ?? "extension"),
      sourcePath: extension.sourcePath ?? extension.resolvedPath,
      diagnostic: extension.diagnostic,
    });
  }
  return resources;
}

function compactResourceLabel(path: string): string {
  const segments = compactPathSegments(path);
  const leaf = segments.at(-1) ?? path;
  if ((leaf === "index.ts" || leaf === "index.js") && segments.length > 1) return segments.at(-2) ?? leaf;
  return leaf;
}

/**
 * Pinned from InteractiveMode's compact extension-label helpers at Pi commit
 * 914cf1472e715297caa30db4b9535d534a9eb718. The source metadata crosses an
 * A1-owned boundary first; the owned shell never inspects Pi's private root.
 */
function compactExtensionLabels(extensions: readonly OwnedPiExtensionResourceSummary[]): readonly string[] {
  const localExtensions = extensions
    .filter(extension => !isPackageExtensionSource(extension.sourceInfo))
    .map(extension => {
      const path = extension.sourcePath ?? extension.resolvedPath ?? "extension";
      const segments = compactPathSegments(path);
      if (segments.length > 1 && (segments.at(-1) === "index.ts" || segments.at(-1) === "index.js")) segments.pop();
      return { extension, segments };
    });

  return extensions.map(extension => {
    const resourcePath = extension.sourcePath ?? extension.resolvedPath ?? "extension";
    if (isPackageExtensionSource(extension.sourceInfo)) {
      return compactPackageExtensionLabel(resourcePath, extension.sourceInfo);
    }
    const localIndex = localExtensions.findIndex(item => item.extension === extension);
    const segments = localExtensions[localIndex]?.segments;
    if (!segments || segments.length === 0) return compactResourceLabel(resourcePath);
    for (let count = 1; count <= segments.length; count += 1) {
      const candidate = segments.slice(-count).join("/");
      if (localExtensions.every((item, itemIndex) => itemIndex === localIndex || item.segments.slice(-count).join("/") !== candidate)) {
        return candidate;
      }
    }
    return segments.join("/");
  });
}

function compactPackageExtensionLabel(resourcePath: string, sourceInfo: OwnedPiExtensionSourceSummary): string {
  const sourceLabel = compactPackageSourceLabel(sourceInfo.source);
  if (!sourceLabel) return compactResourceLabel(resourcePath);
  const shortPath = shortPackagePath(resourcePath, sourceInfo).replaceAll("\\", "/");
  const packagePath = shortPath.startsWith("extensions/") ? shortPath.slice("extensions/".length) : shortPath;
  const slash = packagePath.lastIndexOf("/");
  const fileName = slash < 0 ? packagePath : packagePath.slice(slash + 1);
  const directory = slash < 0 ? "" : packagePath.slice(0, slash);
  const extension = fileName.lastIndexOf(".");
  const name = extension <= 0 ? fileName : fileName.slice(0, extension);
  if (name === "index") return !directory || directory === "." ? sourceLabel : `${sourceLabel}:${directory}`;
  return `${sourceLabel}:${packagePath}`;
}

function compactPackageSourceLabel(source: string): string {
  if (source.startsWith("npm:")) return source.slice("npm:".length) || source;
  if (!source.startsWith("git:")) return source;
  const gitSource = source.slice("git:".length).trim();
  let repositoryPath: string | undefined;
  const scpLike = gitSource.match(/^git@[^:]+:(.+)$/);
  if (scpLike?.[1]) {
    repositoryPath = scpLike[1];
  } else if (/^[a-z]+:\/\//i.test(gitSource)) {
    try {
      repositoryPath = new URL(gitSource).pathname.replace(/^\/+/, "");
    } catch {
      return source;
    }
  } else {
    const slash = gitSource.indexOf("/");
    if (slash >= 0) repositoryPath = gitSource.slice(slash + 1);
  }
  if (!repositoryPath) return source;
  const ref = repositoryPath.indexOf("@");
  const withoutRef = ref < 0 ? repositoryPath : repositoryPath.slice(0, ref);
  return withoutRef.replace(/\.git$/, "") || source;
}

function shortPackagePath(resourcePath: string, sourceInfo: OwnedPiExtensionSourceSummary): string {
  const fullPath = normalizeResourcePath(resourcePath);
  const baseDir = sourceInfo.baseDir === null ? undefined : normalizeResourcePath(sourceInfo.baseDir).replace(/\/$/, "");
  if (baseDir) {
    const npmRoot = baseDir.match(/^(.*\/node_modules)\/(@?[^/]+(?:\/[^/]+)?)$/);
    if (npmRoot?.[1] && fullPath.startsWith(`${npmRoot[1]}/`)) return relativeResourcePath(baseDir, fullPath);
    if (fullPath === baseDir) return ".";
    if (fullPath.startsWith(`${baseDir}/`)) return fullPath.slice(baseDir.length + 1);
  }
  const npmMatch = fullPath.match(/node_modules\/(@?[^/]+(?:\/[^/]+)?)\/(.*)/);
  if (npmMatch?.[2] && sourceInfo.source.startsWith("npm:")) return npmMatch[2];
  const gitMatch = fullPath.match(/git\/[^/]+\/[^/]+\/(.*)/);
  if (gitMatch?.[1] && sourceInfo.source.startsWith("git:")) return gitMatch[1];
  return resourcePath;
}

function relativeResourcePath(from: string, to: string): string {
  const fromSegments = from.split("/").filter(Boolean);
  const toSegments = to.split("/").filter(Boolean);
  let common = 0;
  while (common < fromSegments.length && common < toSegments.length
    && fromSegments[common]?.toLowerCase() === toSegments[common]?.toLowerCase()) common += 1;
  return [...fromSegments.slice(common).map(() => ".."), ...toSegments.slice(common)].join("/") || ".";
}

function compactPathSegments(path: string): string[] {
  return normalizeResourcePath(path).split("/").filter(segment => segment.length > 0 && segment !== "~");
}

function normalizeResourcePath(path: string): string {
  return path.replaceAll("\\", "/");
}

function isPackageExtensionSource(sourceInfo: OwnedPiExtensionSourceSummary | null): sourceInfo is OwnedPiExtensionSourceSummary {
  const source = sourceInfo?.source ?? "";
  return source.startsWith("npm:") || source.startsWith("git:");
}

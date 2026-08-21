import type {
  OwnedUiCommand,
  OwnedUiDialog,
  OwnedUiSessionViewModel,
  OwnedUiThinkingLevel,
} from "../owned-ui-contracts/index.js";
import type { UiRouteHost } from "./route-host.js";
import { MOUSE_TRACKING_OFF, MOUSE_TRACKING_ON, parseMouseInput } from "../ui-components/index.js";
import {
  PINNED_PI_HIDDEN_COMMAND_NAMES,
  PINNED_PI_WORKFLOW_COMMAND_NAMES,
  type AdapterCommandResult,
  type PiEngineAdapter,
  type PiWorkflowInteractionRequest,
  type PiWorkflowLoginNotification,
  type PiWorkflowLoginStart,
  type PiWorkflowRequest,
  type PiWorkflowResult,
  type PiWorkflowRoute,
} from "../pi-engine-adapter/index.js";
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
  piTheme,
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
} from "../pi-component-adapter/index.js";
import {
  PiTuiRuntimeAdapter,
  type PiTuiComponentPort,
  type PiTuiLayoutNode,
  type PiTuiOverlayHandle,
  type PiTuiTerminalPort,
} from "../pi-tui-runtime-adapter/index.js";

type OwnedUiBackendPort = PiEngineAdapter;
type OwnedUiTerminalPort = PiTuiTerminalPort;
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
    if (resourceRows.at(-1) === "") resourceRows.pop();
    return [
      ...(this.#extensionHeader ?? this.header).render(width),
      ...resourceRows,
      ...transcript,
      ...diagnosticRows,
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
    this.header.dispose?.();
    this.resources.dispose?.();
    for (const component of this.#transcript.values()) component.dispose?.();
    this.#transcript.clear();
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

function shellResourceEntries(backend: OwnedUiBackendPort): readonly PiShellResourceEntry[] {
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
  for (const extension of backend.extensionResources()) {
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
  readonly #routeHost: UiRouteHost | null;
  #dialogHandle: PiTuiOverlayHandle | undefined;
  #sequence = 0;
  #started = false;
  #disposed = false;
  #compactionQueue: Array<{ readonly text: string; readonly type: "steer" | "follow-up" }> = [];
  #lastClearTime = 0;
  #activeLoginDialog: PiShellLoginDialogPort | undefined;
  #sessionGeneration: number;

  constructor(options: OwnedUiSessionShellOptions) {
    this.backend = options.backend;
    this.#sessionGeneration = this.backend.sessionGeneration;
    this.#cwd = options.cwd;
    this.#routeHost = options.routeHost ?? null;
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
    }, {
      ...options.startup,
      resources: options.startup?.resources ?? shellResourceEntries(this.backend),
    }, this.backend.agentDir, {
      getMessageRenderer: customType => this.backend.pinnedMessageRenderer(customType),
      getToolDefinition: toolName => this.backend.pinnedToolDefinition(toolName),
    });
    const tuiMode = this.backend.disposed ? "regular" : this.backend.pinnedSettingsSnapshot().tuiMode;
    const runtimeOptions = options.terminal === undefined
      ? { root: this.root, mode: tuiMode, layoutRoot: this.root.layoutRoot(), hardwareCursor: this.backend.view().terminal.hardwareCursor }
      : { root: this.root, mode: tuiMode, layoutRoot: this.root.layoutRoot(), terminal: options.terminal, hardwareCursor: this.backend.view().terminal.hardwareCursor };
    runtime = new PiTuiRuntimeAdapter(runtimeOptions);
    this.runtime = runtime;
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
      this.#syncView();
      if (this.view().lifecycle === "ready" && this.#compactionQueue.length > 0) void this.#flushCompactionQueue();
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
          if (value !== "regular" && value !== "fullscreen") return;
          if (!this.runtime.switchMode(value)) {
            this.root.appendWorkflowStatus("Close active overlays before changing TUI mode");
            this.runtime.requestRender();
            return;
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

  async dispose(): Promise<void> {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#unsubscribe();
    this.#dialogHandle?.hide();
    await this.backend.unbindExtensionUi();
    this.#extensionBridge.dispose();
    await this.runtime.dispose();
  }

  #syncView(): void {
    const view = this.view();
    if (this.backend.sessionGeneration !== this.#sessionGeneration) {
      this.#sessionGeneration = this.backend.sessionGeneration;
      this.#activeLoginDialog = undefined;
      this.#extensionBridge.reset();
      this.root.setInputSurface(null);
      this.root.resetExtensionUi();
      this.root.resetWorkflowPresentation();
    }
    this.root.update(view);
    this.#syncDialog(view.dialog);
    this.runtime.requestRender();
    for (const listener of this.#listeners) listener(view);
  }

  #openOwnedRoute(route: string): AdapterCommandResult {
    const surface = this.#routeHost?.open(route) ?? null;
    if (surface === null) return { outcome: "failed", diagnostic: `route is unavailable: ${route}` };
    if (!this.runtime.active) return { outcome: "failed", diagnostic: "runtime is not active" };

    this.#dialogHandle?.hide();
    // Any-event reporting: hover and drag are what the screen is driven by, and
    // it also stops the terminal treating a drag as a text selection.
    this.runtime.writeControl(MOUSE_TRACKING_ON);
    const closeSurface = () => {
      this.runtime.writeControl(MOUSE_TRACKING_OFF);
      this.#dialogHandle?.hide();
      this.#dialogHandle = undefined;
      this.#dialogId = undefined;
    };
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
    if (this.#routeHost?.claims(name)) return this.#openOwnedRoute(name);
    if (isWorkflowRoute(name)) return this.runWorkflow({ command: name, argument });
    // Unknown slash input, prompt templates, skills, and extension commands remain Pi prompt input.
    this.root.editor.addToHistory(text);
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

function isWorkflowRoute(value: string): value is PiWorkflowRoute {
  return (PINNED_PI_WORKFLOW_COMMAND_NAMES as readonly string[]).includes(value)
    || (PINNED_PI_HIDDEN_COMMAND_NAMES as readonly string[]).includes(value);
}

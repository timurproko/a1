import {
  OWNED_UI_CONTRACT_VERSION,
  type OwnedUiLifecycle,
  type OwnedUiSessionViewModel,
  type OwnedUiTranscriptBlock,
} from "../foundation/owned-ui-contracts/index.js";
import { OwnedUiSessionShellRoot } from "../foundation/pi-owned-ui-integration/index.js";
import {
  createPiTerminalBridge,
  PiTuiRuntimeAdapter,
  type PiTuiComponentPort,
} from "../foundation/pi-tui-runtime-adapter/index.js";
import type {
  OwnedUiApplicationPort,
  PresentationTerminalPort,
} from "../foundation/presentation-contracts/index.js";
import {
  type StructuredAgentTabView,
  type StructuredWorkspaceTabs,
  type StructuredWorkspaceTabsView,
} from "../features/workspace/index.js";

export interface StructuredWorkspaceApplicationOptions {
  readonly workspace: StructuredWorkspaceTabs;
  readonly cwd: string;
  readonly terminal?: PresentationTerminalPort;
  readonly mode?: "regular" | "fullscreen";
}

export class StructuredWorkspaceApplication implements OwnedUiApplicationPort {
  readonly workspace: StructuredWorkspaceTabs;
  readonly root: OwnedUiSessionShellRoot;
  readonly runtime: PiTuiRuntimeAdapter;
  readonly component: StructuredWorkspaceRootComponent;
  #unsubscribe: () => void;
  #resolveStopped: (() => void) | undefined;
  readonly #stopped: Promise<void>;
  #notice: string | null = null;
  #disposed = false;
  #started = false;
  #agentSequence: number;

  constructor(options: StructuredWorkspaceApplicationOptions) {
    this.workspace = options.workspace;
    const initial = selectedPanel(options.workspace.view());
    if (!initial) throw new TypeError("structured workspace application requires an initial agent tab");
    this.#agentSequence = options.workspace.view().panels.length;
    this.#stopped = new Promise(resolve => { this.#resolveStopped = resolve; });
    this.root = new OwnedUiSessionShellRoot(toOwnedView(options.workspace.view(), initial, null, 80, 24), options.cwd, {
      getColumns: () => this.runtime?.viewport().columns ?? options.terminal?.columns ?? 80,
      getRows: () => this.runtime?.viewport().rows ?? options.terminal?.rows ?? 24,
      requestRender: () => this.runtime?.requestRender(),
      onSubmit: text => { void this.submit(text); },
      onInterrupt: () => { this.#notice = "Use /agent stop to stop the selected agent."; this.runtime?.requestRender(); },
      onClear: () => { this.root.editor.setText(""); this.runtime?.requestRender(); },
      onExit: () => { void this.dispose(); },
      onModelSelect: () => { this.#notice = "Model selection remains scoped to each structured agent session."; this.runtime?.requestRender(); },
      onThinkingCycle: () => { this.#notice = "Thinking settings remain scoped to each structured agent session."; this.runtime?.requestRender(); },
    });
    this.component = new StructuredWorkspaceRootComponent(
      this.workspace,
      this.root,
      direction => { void this.switchRelative(direction); },
      text => this.#saveEditor(text),
      () => this.#notice,
    );
    this.runtime = new PiTuiRuntimeAdapter({
      root: this.component,
      mode: options.mode ?? "regular",
      ...(options.terminal === undefined ? {} : { terminal: createPiTerminalBridge(options.terminal) }),
      hardwareCursor: true,
      mouse: false,
    });
    this.#unsubscribe = this.workspace.subscribe(view => this.#sync(view));
  }

  get disposed(): boolean { return this.#disposed; }

  start(): void {
    if (this.#started || this.#disposed) return;
    this.#started = true;
    this.runtime.start();
    this.#sync(this.workspace.view());
  }

  async flush(): Promise<void> {
    await this.workspace.flush();
    this.#sync(this.workspace.view());
  }

  waitUntilStopped(): Promise<void> { return this.#stopped; }

  async submit(raw: string): Promise<void> {
    const input = raw.trim();
    if (!input) return;
    if (input === "/agent" || input.startsWith("/agent ")) {
      await this.#agentCommand(input.slice("/agent".length).trim());
      return;
    }
    const selected = selectedPanel(this.workspace.view());
    if (!selected) return;
    this.workspace.setEditorText(selected.agentId, input);
    const result = await this.workspace.sendPrompt(selected.agentId, input);
    this.#notice = result.kind === "rejected" ? result.diagnostic : null;
    this.#sync(this.workspace.view());
  }

  async switchRelative(direction: -1 | 1): Promise<void> {
    const view = this.workspace.view();
    if (view.panels.length < 2) return;
    this.#saveEditor(this.root.editor.getText());
    const current = Math.max(0, view.panels.findIndex(panel => panel.selected));
    const next = (current + direction + view.panels.length) % view.panels.length;
    const target = view.panels[next];
    if (target) await this.workspace.selectAgent(target.agentId);
  }

  async dispose(): Promise<void> {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#unsubscribe();
    const failures: unknown[] = [];
    await this.runtime.stop().catch(error => failures.push(error));
    await this.workspace.dispose().catch(error => failures.push(error));
    this.#resolveStopped?.();
    if (failures.length > 0) throw new AggregateError(failures, "structured workspace application disposal failed");
  }

  async #agentCommand(argument: string): Promise<void> {
    const [command = "list", ...rest] = argument.split(/\s+/).filter(Boolean);
    const view = this.workspace.view();
    const selected = selectedPanel(view);
    if (command === "new") {
      this.#agentSequence += 1;
      const id = `agent-${this.#agentSequence}`;
      const displayName = rest.join(" ") || `Agent ${this.#agentSequence}`;
      const created = await this.workspace.createAgent({ id, displayName });
      if (created.kind === "applied") await this.workspace.selectAgent(id);
      this.#notice = created.kind === "rejected" ? created.diagnostic : `Created ${created.value.agentId}.`;
    } else if (command === "next" || command === "previous" || command === "prev") {
      await this.switchRelative(command === "next" ? 1 : -1);
      this.#notice = null;
    } else if (command === "select") {
      const target = rest[0];
      const selectedResult = target ? await this.workspace.selectAgent(target) : null;
      this.#notice = selectedResult === null ? "Usage: /agent select <id>" : selectedResult.kind === "rejected" ? selectedResult.diagnostic : null;
    } else if (command === "stop") {
      const result = selected ? await this.workspace.stopAgent(selected.agentId) : null;
      this.#notice = result === null ? "No agent selected." : result.kind === "rejected" ? result.diagnostic : `Stopped ${selected!.agentId}.`;
    } else if (command === "restart") {
      const result = selected ? await this.workspace.restartAgent(selected.agentId) : null;
      this.#notice = result === null ? "No agent selected." : result.kind === "rejected" ? result.diagnostic : `Restarted ${selected!.agentId}.`;
    } else if (command === "remove") {
      if (!selected) this.#notice = "No agent selected.";
      else {
        if (selected.lifecycle !== "stopped" && selected.lifecycle !== "failed") await this.workspace.stopAgent(selected.agentId);
        const result = await this.workspace.removeAgent(selected.agentId);
        this.#notice = result.kind === "rejected" ? result.diagnostic : `Removed ${selected.agentId}.`;
      }
    } else if (command === "list") {
      this.#notice = view.tabs.length === 0 ? "No managed agents." : view.tabs.map(tab => `${tab.selected ? "*" : " "}${tab.agentId}:${tab.label}`).join("  ");
    } else {
      this.#notice = "Usage: /agent [list|new [name]|next|prev|select <id>|stop|restart|remove]";
    }
    this.#sync(this.workspace.view());
  }

  #saveEditor(text: string): void {
    const selected = selectedPanel(this.workspace.view());
    if (selected) this.workspace.setEditorText(selected.agentId, text);
  }

  #sync(view: StructuredWorkspaceTabsView): void {
    const selected = selectedPanel(view);
    if (!selected) return;
    const viewport = this.runtime?.viewport() ?? { columns: 80, rows: 24 };
    this.root.update(toOwnedView(view, selected, this.#notice, viewport.columns, viewport.rows));
    if (this.root.editor.getText() !== selected.editorText) this.root.editor.setText(selected.editorText);
    this.component.invalidate();
    this.runtime?.requestRender();
  }
}

export class StructuredWorkspaceRootComponent implements PiTuiComponentPort {
  constructor(
    readonly workspace: StructuredWorkspaceTabs,
    readonly sessionRoot: OwnedUiSessionShellRoot,
    readonly onSwitch: (direction: -1 | 1) => void,
    readonly onEditorChange: (text: string) => void,
    readonly notice: () => string | null,
  ) {}

  render(width: number): readonly string[] {
    const view = this.workspace.view();
    const tabLine = truncate(view.tabs.map(tab => `${tab.selected ? "[" : " "}${tab.label}${tab.selected ? "]" : " "}`).join("  "), width);
    const notice = this.notice();
    return [tabLine, ...(notice ? [truncate(notice, width)] : []), ...this.sessionRoot.render(width)];
  }

  handleInput(data: string): void {
    if (data === "\x1b[6;5~" || data === "\x1b[1;3C") {
      this.onEditorChange(this.sessionRoot.editor.getText());
      this.onSwitch(1);
      return;
    }
    if (data === "\x1b[5;5~" || data === "\x1b[1;3D") {
      this.onEditorChange(this.sessionRoot.editor.getText());
      this.onSwitch(-1);
      return;
    }
    this.sessionRoot.editor.handleInput?.(data);
  }

  invalidate(): void { this.sessionRoot.invalidate(); }
  setFocused(focused: boolean): void { this.sessionRoot.editor.setFocused?.(focused); }
  dispose(): void { this.sessionRoot.dispose?.(); }
}

function selectedPanel(view: StructuredWorkspaceTabsView): StructuredAgentTabView | null {
  return view.selectedPanel ?? view.panels[0] ?? null;
}

function toOwnedView(
  workspace: StructuredWorkspaceTabsView,
  panel: StructuredAgentTabView,
  notice: string | null,
  columns: number,
  rows: number,
): OwnedUiSessionViewModel {
  const agent = workspace.workspace.agents.find(candidate => candidate.id === panel.agentId);
  return {
    contractVersion: OWNED_UI_CONTRACT_VERSION,
    sessionId: panel.sessionId,
    revision: workspace.workspace.revision + panel.lastSequence,
    lifecycle: ownedLifecycle(panel.lifecycle),
    transcript: panel.transcript.flatMap(messageBlocks),
    editor: {
      text: panel.editorText,
      queuedSubmissions: [],
      selection: null,
      cursorOffset: panel.editorText.length,
      historyRevision: panel.lastSequence,
      submitEnabled: panel.lifecycle !== "stopping" && panel.lifecycle !== "stopped" && panel.lifecycle !== "failed",
    },
    status: {
      title: agent?.displayName ?? panel.agentId,
      workingMessage: panel.lifecycle === "busy" ? "Working" : null,
      diagnostics: panel.failure ? [panel.failure] : notice ? [notice] : [],
      badges: [
        `${workspace.panels.length} agents`,
        ...(agent?.unreadActivity ? [`${agent.unreadActivity} unread`] : []),
        ...(agent?.attention ? ["attention"] : []),
      ],
      footer: { branch: null, sessionName: agent?.displayName ?? null, availableProviderCount: 0, extensionStatuses: [] },
    },
    terminal: { columns, rows, focusedRegion: "editor", hardwareCursor: true },
    activeModel: null,
    thinkingLevel: "medium",
    activeCommandIds: panel.activeCommandIds,
    dialog: null,
    overlay: null,
    customizations: [],
    diagnostics: panel.failure ? [{ sequence: panel.lastSequence, code: "structured-agent", severity: "error", message: panel.failure, recoverable: true }] : [],
  };
}

function messageBlocks(message: StructuredAgentTabView["transcript"][number]): readonly OwnedUiTranscriptBlock[] {
  return message.content.map((content, index): OwnedUiTranscriptBlock => {
    const base = { id: `${message.id}.${index}`, status: message.status === "streaming" ? "live" as const : "finalized" as const, revision: index + 1, title: null };
    if (content.kind === "thinking") return { ...base, kind: "thinking", text: content.text, payload: {} };
    if (content.kind === "tool-call") return { ...base, kind: "tool-call", title: content.toolName, text: JSON.stringify(content.input), payload: content };
    if (content.kind === "tool-result") return { ...base, kind: "tool-result", text: JSON.stringify(content.output), payload: content };
    if (content.kind === "image") return { ...base, kind: "custom", title: content.mediaType, text: "[image]", payload: content };
    if (content.kind === "unknown") return { ...base, kind: "custom", title: content.sourceType, text: JSON.stringify(content.payload), payload: content };
    return { ...base, kind: message.role === "user" ? "user" : message.role === "system" ? "system" : message.role === "tool" ? "tool-result" : "assistant", text: content.text, payload: {} };
  });
}

function ownedLifecycle(lifecycle: StructuredAgentTabView["lifecycle"]): OwnedUiLifecycle {
  return lifecycle;
}

function truncate(value: string, width: number): string {
  if (width <= 0) return "";
  return value.length <= width ? value : width === 1 ? "…" : `${value.slice(0, width - 1)}…`;
}

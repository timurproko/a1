import type {
  OwnedUiCommand,
  OwnedUiCorrelationId,
  OwnedUiDialog,
  OwnedUiSessionViewModel,
  OwnedUiStatusView,
} from "../../foundation/owned-ui-contracts/index.js";
import type { OwnedTerminalComponent, OwnedTerminalInput, OwnedTerminalViewport } from "./terminal-runtime.js";
import { sanitizeLines, truncateVisible } from "./terminal-runtime.js";

export class OwnedStatusComponent implements OwnedTerminalComponent {
  readonly id = "status";
  focused = false;
  #view: OwnedUiStatusView | null = null;
  #model: string | null = null;
  #thinkingLevel: string | null = null;

  update(view: OwnedUiSessionViewModel): void {
    this.#view = view.status;
    this.#model = view.activeModel === null ? null : `${view.activeModel.providerId}/${view.activeModel.modelId}`;
    this.#thinkingLevel = view.thinkingLevel;
  }

  render(viewport: OwnedTerminalViewport): readonly string[] {
    if (!this.#view) return [];
    const parts = [
      this.#view.title,
      ...this.#view.badges,
      ...(this.#model ? [this.#model] : []),
      ...(this.#thinkingLevel ? [`thinking:${this.#thinkingLevel}`] : []),
      ...(this.#view.workingMessage ? [this.#view.workingMessage] : []),
      ...this.#view.diagnostics.slice(-1),
    ];
    return sanitizeLines([parts.filter(part => part.length > 0).join("  ·  ")], viewport.columns);
  }
}

export interface OwnedSelectorOption {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
}

export interface OwnedSelectorHandlers {
  readonly onSelect?: (id: string) => void;
  readonly onCancel?: () => void;
  readonly onRequestRender?: () => void;
}

export class OwnedSelectorComponent implements OwnedTerminalComponent {
  readonly id: string;
  focused = false;
  #options: readonly OwnedSelectorOption[];
  #selected = 0;
  readonly #handlers: OwnedSelectorHandlers;

  constructor(id: string, options: readonly OwnedSelectorOption[], handlers: OwnedSelectorHandlers = {}) {
    this.id = id;
    this.#options = [...options];
    this.#handlers = handlers;
  }

  get selectedId(): string | undefined {
    return this.#options[this.#selected]?.id;
  }

  handleInput(input: OwnedTerminalInput): boolean {
    if (input.type !== "key") return input.type === "text" || input.type === "paste";
    switch (input.key) {
      case "up":
        this.#selected = Math.max(0, this.#selected - 1);
        this.#handlers.onRequestRender?.();
        return true;
      case "down":
        this.#selected = Math.min(Math.max(0, this.#options.length - 1), this.#selected + 1);
        this.#handlers.onRequestRender?.();
        return true;
      case "enter":
        if (this.selectedId) this.#handlers.onSelect?.(this.selectedId);
        return true;
      case "escape":
        this.#handlers.onCancel?.();
        return true;
      default:
        return false;
    }
  }

  render(viewport: OwnedTerminalViewport): readonly string[] {
    return sanitizeLines(this.#options.map((option, index) => {
      const marker = index === this.#selected ? ">" : " ";
      const suffix = option.description ? `  ${option.description}` : "";
      return `${marker} ${option.label}${suffix}`;
    }), viewport.columns);
  }
}

export class OwnedDialogComponent implements OwnedTerminalComponent {
  readonly id: string;
  focused = false;
  readonly #dialog: OwnedUiDialog;
  readonly #selector: OwnedSelectorComponent;

  constructor(dialog: OwnedUiDialog, handlers: OwnedSelectorHandlers = {}) {
    this.id = `dialog-${dialog.id}`;
    this.#dialog = dialog;
    this.#selector = new OwnedSelectorComponent(this.id, dialogOptions(dialog), handlers);
  }

  handleInput(input: OwnedTerminalInput): boolean {
    return this.#selector.handleInput(input);
  }

  render(viewport: OwnedTerminalViewport): readonly string[] {
    const width = Math.min(viewport.columns, 72);
    const title = truncateVisible(` ${this.#dialog.title} `, width);
    const border = `+${"-".repeat(Math.max(2, width - 2))}+`;
    return sanitizeLines([border, `|${title.padEnd(Math.max(0, width - 2))}|`, ...this.#selector.render(viewport).map(line => `| ${line}`)], viewport.columns);
  }
}

export class OwnedDiagnosticsComponent implements OwnedTerminalComponent {
  readonly id = "diagnostics";
  focused = false;
  #view: OwnedUiSessionViewModel | null = null;

  update(view: OwnedUiSessionViewModel): void {
    this.#view = view;
  }

  render(viewport: OwnedTerminalViewport): readonly string[] {
    if (!this.#view || this.#view.diagnostics.length === 0) return [];
    return sanitizeLines(this.#view.diagnostics.slice(-3).map(diagnostic => `${diagnostic.severity}: ${diagnostic.message}`), viewport.columns);
  }
}

export interface OwnedCommandHandlerContext {
  readonly sessionId: string;
  readonly correlationId: OwnedUiCorrelationId;
}

export type OwnedCommandHandler = (context: OwnedCommandHandlerContext) => OwnedUiCommand | Promise<OwnedUiCommand>;

export class OwnedCommandSurface {
  readonly #handlers = new Map<string, OwnedCommandHandler>();
  #sequence = 0;

  register(name: string, handler: OwnedCommandHandler): () => void {
    this.#handlers.set(name, handler);
    return () => this.#handlers.delete(name);
  }

  names(): readonly string[] {
    return [...this.#handlers.keys()].sort();
  }

  async dispatch(name: string, sessionId: string): Promise<OwnedUiCommand> {
    const handler = this.#handlers.get(name);
    if (!handler) throw new Error(`unknown owned UI command: ${name}`);
    this.#sequence += 1;
    return handler({ sessionId, correlationId: `ui-command-${this.#sequence}` });
  }
}

function dialogOptions(dialog: OwnedUiDialog): readonly OwnedSelectorOption[] {
  if (isRecord(dialog.payload) && Array.isArray(dialog.payload.options)) {
    const options = dialog.payload.options
      .filter(isRecord)
      .filter(option => typeof option.id === "string" && typeof option.label === "string")
      .map(option => ({
        id: option.id as string,
        label: option.label as string,
        ...(typeof option.description === "string" ? { description: option.description } : {}),
      }));
    if (options.length > 0) return options;
  }
  return [
    { id: "accept", label: "Accept" },
    { id: "cancel", label: "Cancel" },
  ];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

import {
  assertOwnedUiCommand,
  type OwnedUiCommand,
  type OwnedUiCommandOutcome,
  type OwnedUiSessionViewModel,
} from "../../foundation/owned-ui-contracts/index.js";
import type { AdapterCommandResult, PiEngineAdapter } from "../../foundation/pi-engine-adapter/index.js";
import { OwnedUiDiagnosticsRecorder } from "./diagnostics.js";
import { OwnedPromptEditor } from "./prompt-editor.js";
import { OwnedTranscriptComponent, type OwnedTranscriptRenderer } from "./transcript-history.js";
import { createOwnedTranscriptRenderer } from "./transcript-renderer.js";
import { OwnedDiagnosticsComponent, OwnedStatusComponent } from "./surfaces.js";
import { createVanillaUiCustomizationRegistry, type OwnedUiCustomizationRegistry } from "./customization.js";
import type { OwnedTerminalComponent, OwnedTerminalInput, OwnedTerminalViewport } from "./terminal-runtime.js";
import { displayWidth, truncateVisible } from "./terminal-runtime.js";

export class OwnedSessionRootComponent implements OwnedTerminalComponent {
  readonly id = "owned-session-root";
  focused = true;
  readonly transcript: OwnedTranscriptComponent;
  readonly status: OwnedStatusComponent;
  readonly diagnostics: OwnedDiagnosticsComponent;
  readonly editor: OwnedPromptEditor;

  constructor(
    width: number,
    renderBlock: OwnedTranscriptRenderer = createOwnedTranscriptRenderer(),
    editorHandlers: ConstructorParameters<typeof OwnedPromptEditor>[0] = {},
  ) {
    this.transcript = new OwnedTranscriptComponent(width, renderBlock);
    this.status = new OwnedStatusComponent();
    this.diagnostics = new OwnedDiagnosticsComponent();
    this.editor = new OwnedPromptEditor(editorHandlers);
  }

  update(view: OwnedUiSessionViewModel): void {
    this.transcript.setBlocks(view.transcript);
    this.status.update(view);
    this.diagnostics.update(view);
    this.editor.setBusy(view.lifecycle === "busy");
    this.editor.setQueuedSubmissions(view.editor.queuedSubmissions);
  }

  handleInput(input: OwnedTerminalInput): boolean | void {
    return this.editor.handleInput?.(input);
  }

  invalidate(): void {
    this.transcript.invalidate();
    this.editor.invalidate();
  }

  dispose(): void {
    this.editor.dispose();
  }

  render(viewport: OwnedTerminalViewport): readonly string[] {
    const statusText = this.status.render(viewport)[0] ?? "Pi";
    const diagnosticRows = this.diagnostics.render(viewport);
    const editorRows = this.editor.render(viewport);
    const editorCard = frameEditor(statusText, editorRows, viewport.columns);
    const transcriptRows = this.transcript.render({
      columns: viewport.columns,
      rows: Math.max(0, viewport.rows - diagnosticRows.length - editorCard.length),
    });
    return [...transcriptRows, ...diagnosticRows, ...editorCard].slice(0, viewport.rows);
  }
}

function frameEditor(statusText: string, editorRows: readonly string[], width: number): readonly string[] {
  const innerWidth = Math.max(10, width - 2);
  const topLabel = truncateVisible(statusText, Math.max(1, innerWidth - 4));
  const top = `╭─ ${topLabel} ${"─".repeat(Math.max(0, innerWidth - displayWidth(topLabel) - 3))}╮`;
  const middle = editorRows.map(row => `│ ${padVisible(truncateVisible(row, innerWidth - 1), innerWidth - 1)}│`);
  const bottomLabel = truncateVisible(" Ctrl+C exit · /think · /model · /new · /resume ", innerWidth);
  const bottom = `╰${bottomLabel}${"─".repeat(Math.max(0, innerWidth - displayWidth(bottomLabel)))}╯`;
  return [top, ...middle, bottom];
}

function padVisible(value: string, width: number): string {
  return `${value}${" ".repeat(Math.max(0, width - displayWidth(value)))}`;
}

export interface OwnedPiSessionControllerOptions {
  readonly adapter: PiEngineAdapter;
  readonly width: number;
  readonly renderBlock?: OwnedTranscriptRenderer;
  readonly customizations?: OwnedUiCustomizationRegistry;
  readonly diagnostics?: OwnedUiDiagnosticsRecorder;
  readonly onRequestRender?: () => void;
}

export class OwnedPiSessionController {
  readonly adapter: PiEngineAdapter;
  readonly root: OwnedSessionRootComponent;
  readonly #settings = new Map<string, unknown>();
  readonly #customizations: OwnedUiCustomizationRegistry;
  readonly #diagnostics: OwnedUiDiagnosticsRecorder;
  readonly #listeners = new Set<(view: OwnedUiSessionViewModel) => void>();
  readonly #unsubscribe: () => void;

  constructor(options: OwnedPiSessionControllerOptions) {
    this.adapter = options.adapter;
    this.#customizations = options.customizations ?? createVanillaUiCustomizationRegistry();
    this.#diagnostics = options.diagnostics ?? new OwnedUiDiagnosticsRecorder();
    const defaultRenderer = options.renderBlock ?? createOwnedTranscriptRenderer();
    const editorHandlers = {
      ...(options.onRequestRender === undefined ? {} : { onRequestRender: options.onRequestRender }),
      onSubmit: (text: string) => {
        void this.submit(text);
      },
      onQueue: (text: string) => {
        void this.submit(text);
      },
    };
    this.root = new OwnedSessionRootComponent(
      options.width,
      (block, width) => {
        const override = this.#customizations.resolve("transcript-block")?.implementation.render;
        return override ? override(block, width) : defaultRenderer(block, width);
      },
      editorHandlers,
    );
    this.root.update(this.adapter.view());
    this.#unsubscribe = this.adapter.onEvent(event => {
      if (event.type === "session-lifecycle" && event.lifecycle === "busy") this.root.editor.setBusy(true);
      if (event.type === "session-lifecycle" && event.lifecycle === "ready") this.root.editor.setBusy(false);
      if (event.type === "editor-state") this.root.editor.setQueuedSubmissions(event.editor.queuedSubmissions);
      if (event.type === "session-view" || event.type === "transcript-block" || event.type === "status" || event.type === "diagnostic") {
        this.#publish();
      }
    });
  }

  view(): OwnedUiSessionViewModel {
    return {
      ...this.adapter.view(),
      editor: this.root.editor.state(),
      customizations: this.#customizations.all(),
      diagnostics: [...this.adapter.view().diagnostics, ...this.#diagnostics.entries()],
    };
  }

  onView(listener: (view: OwnedUiSessionViewModel) => void): () => void {
    this.#listeners.add(listener);
    listener(this.view());
    return () => this.#listeners.delete(listener);
  }

  async submit(text: string): Promise<AdapterCommandResult> {
    if (text.startsWith("/")) return this.#slashCommand(text);
    return this.#engineCommand({
      type: "prompt",
      correlationId: this.#nextCorrelationId("prompt"),
      sessionId: this.adapter.sessionId,
      text,
    });
  }

  async abort(): Promise<AdapterCommandResult> {
    return this.#engineCommand(this.#simpleCommand("abort"));
  }

  async retry(): Promise<AdapterCommandResult> {
    return this.#engineCommand(this.#simpleCommand("retry"));
  }

  async compact(): Promise<AdapterCommandResult> {
    return this.#engineCommand(this.#simpleCommand("compact"));
  }

  async newSession(): Promise<AdapterCommandResult> {
    return this.#engineCommand(this.#simpleCommand("new-session"));
  }

  async resumeSession(sessionPath: string): Promise<AdapterCommandResult> {
    return this.#engineCommand({
      type: "resume-session",
      correlationId: this.#nextCorrelationId("resume"),
      sessionId: this.adapter.sessionId,
      sessionPath,
    });
  }

  async setSetting(key: string, value: unknown): Promise<AdapterCommandResult> {
    const command: OwnedUiCommand = {
      type: "set-setting",
      correlationId: this.#nextCorrelationId("setting"),
      sessionId: this.adapter.sessionId,
      key,
      value,
    };
    assertOwnedUiCommand(command);
    this.#settings.set(key, value);
    this.#publish();
    return { outcome: "completed", diagnostic: null };
  }

  applyCustomization(
    customization: Parameters<OwnedUiCustomizationRegistry["register"]>[0],
    implementation: Parameters<OwnedUiCustomizationRegistry["register"]>[1],
  ): () => void {
    const remove = this.#customizations.register(customization, implementation);
    this.root.transcript.invalidate();
    this.#publish();
    return () => {
      remove();
      this.root.transcript.invalidate();
      this.#publish();
    };
  }

  removeCustomization(id: string): boolean {
    const removed = this.#customizations.remove(id);
    if (removed) {
      this.root.transcript.invalidate();
      this.#publish();
    }
    return removed;
  }

  settings(): ReadonlyMap<string, unknown> {
    return new Map(this.#settings);
  }

  diagnostics(): OwnedUiDiagnosticsRecorder {
    return this.#diagnostics;
  }

  async setModel(model: { providerId: string; modelId: string; displayName: string }): Promise<AdapterCommandResult> {
    return this.#engineCommand({
      type: "set-model",
      correlationId: this.#nextCorrelationId("model"),
      sessionId: this.adapter.sessionId,
      model,
    });
  }

  async setThinkingLevel(thinkingLevel: OwnedUiSessionViewModel["thinkingLevel"]): Promise<AdapterCommandResult> {
    return this.#engineCommand({
      type: "set-thinking-level",
      correlationId: this.#nextCorrelationId("thinking"),
      sessionId: this.adapter.sessionId,
      thinkingLevel,
    });
  }

  async shutdown(): Promise<AdapterCommandResult> {
    const result = await this.#engineCommand(this.#simpleCommand("shutdown"));
    this.#unsubscribe();
    return result;
  }

  #publish(): void {
    this.root.update(this.view());
    const view = this.view();
    for (const listener of this.#listeners) listener(view);
  }

  async #engineCommand(command: OwnedUiCommand): Promise<AdapterCommandResult> {
    assertOwnedUiCommand(command);
    const result = await this.adapter.execute(command);
    if (result.outcome === "failed" || result.outcome === "rejected") {
      this.#diagnostics.record("error", "engine-command", result.diagnostic ?? result.outcome, true);
    }
    return result;
  }

  async #slashCommand(text: string): Promise<AdapterCommandResult> {
    const [name = "", ...arguments_] = text.slice(1).trim().split(/\s+/).filter(Boolean);
    switch (name) {
      case "abort":
        return this.abort();
      case "retry":
        return this.retry();
      case "compact":
        return this.compact();
      case "new":
        return this.newSession();
      case "resume": {
        const sessionPath = arguments_.join(" ");
        if (!sessionPath) return this.#localFailure("usage", "/resume requires a session path");
        return this.resumeSession(sessionPath);
      }
      case "think": {
        const level = arguments_[0];
        if (level !== "off" && level !== "minimal" && level !== "low" && level !== "medium" && level !== "high" && level !== "xhigh") {
          return this.#localFailure("usage", "/think requires off, minimal, low, medium, high, or xhigh");
        }
        return this.setThinkingLevel(level);
      }
      case "model": {
        const value = arguments_.join(" ");
        const [providerId, modelId] = value.split("/");
        if (!providerId || !modelId) return this.#localFailure("usage", "/model requires provider/model");
        return this.setModel({ providerId, modelId, displayName: modelId });
      }
      case "set": {
        const [key, ...valueParts] = arguments_;
        if (!key || valueParts.length === 0) return this.#localFailure("usage", "/set requires a key and value");
        return this.setSetting(key, valueParts.join(" "));
      }
      case "exit":
      case "quit":
        return this.shutdown();
      default:
        return this.#localFailure("unknown-command", `unknown owned UI command: /${name}`);
    }
  }

  #localFailure(code: string, diagnostic: string): AdapterCommandResult {
    this.#diagnostics.record("warning", code, diagnostic, true);
    this.#publish();
    return { outcome: "rejected", diagnostic };
  }

  #simpleCommand(type: "abort" | "retry" | "compact" | "shutdown" | "new-session"): OwnedUiCommand {
    return {
      type,
      correlationId: this.#nextCorrelationId(type),
      sessionId: this.adapter.sessionId,
    };
  }

  #nextCorrelationId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

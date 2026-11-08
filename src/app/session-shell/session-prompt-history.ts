import type {
  OwnedUiSessionViewModel,
  PromptHistoryImageSidecarAttachment,
  PromptHistoryImageSidecarPort,
  PromptHistoryPort,
} from "../../contracts/owned-ui/index.js";
import type { OwnedUiShellEditorPort } from "../../contracts/owned-ui/index.js";
import { PromptHistoryController } from "./prompt-history-controller.js";
import type { OwnedUiShellHistoryOptions } from "./session-shell-root.js";

type HistoryScope = "unique" | "shared";

/** What prompt history needs from the session: the editor, the transcript, and a render request. */
export interface SessionPromptHistoryPorts {
  readonly editor: OwnedUiShellEditorPort;
  usesDefaultInputSurface(): boolean;
  rehydrate(text: string, resolveImage: (id: string) => PromptHistoryImageSidecarAttachment | null): string;
  requestRender(): void;
  transcript(): OwnedUiSessionViewModel["transcript"];
  currentHistorySessionId(): string | null;
}

/** The user prompts in a transcript, oldest first: the recall a store-less or replaced history starts from. */
function userTexts(transcript: OwnedUiSessionViewModel["transcript"]): string[] {
  return transcript.flatMap(block => block.kind === "user" ? [block.text] : []);
}

/**
 * Binds persistent prompt history to the current session and scope, and replaces the store when either changes.
 * Invariant: the controller is built in one place, so the initial and rebound histories behave the same.
 */
export class SessionPromptHistory {
  readonly #options: OwnedUiShellHistoryOptions;
  readonly #ports: SessionPromptHistoryPorts;
  #controller: PromptHistoryController | null;
  #scope: HistoryScope;
  #sessionId: string | undefined;
  #imageSidecar: PromptHistoryImageSidecarPort | undefined;
  #started = false;

  constructor(options: OwnedUiShellHistoryOptions, ports: SessionPromptHistoryPorts) {
    this.#options = options;
    this.#ports = ports;
    this.#scope = options.scope ?? "unique";
    this.#sessionId = options.sessionId;
    this.#imageSidecar = options.imageSidecar;
    this.#controller = this.#createController(options.store, userTexts(ports.transcript()));
  }

  get controller(): PromptHistoryController | null { return this.#controller; }
  get imageSidecar(): PromptHistoryImageSidecarPort | undefined { return this.#imageSidecar; }

  start(): void {
    this.#started = true;
    this.#controller?.start();
  }

  synchronize(): void { this.#controller?.synchronize(); }

  close(): Promise<boolean> { return this.#controller?.close() ?? Promise.resolve(true); }

  // Invariant: delivery recovery does not replace a store; conversation or live scope changes can.
  rebind(replaced: boolean, scope?: HistoryScope): void {
    if (this.#options.forSession !== undefined || this.#options.forScope !== undefined) {
      const sessionId = this.#ports.currentHistorySessionId();
      const selectedScope = scope ?? this.#scope;
      if (selectedScope !== this.#scope || sessionId !== this.#sessionId) {
        if (!replaced) this.#ports.editor.recall?.restoreDraft?.();
        const previous = this.#controller;
        this.#controller = null;
        this.#imageSidecar = undefined;
        this.#scope = selectedScope;
        this.#sessionId = sessionId ?? undefined;
        void previous?.close().catch(() => false);
        const destination = this.#options.forScope !== undefined
          ? this.#options.forScope(selectedScope, sessionId)
          : sessionId === null ? null : this.#options.forSession!(sessionId);
        if (destination !== null) {
          this.#imageSidecar = destination.imageSidecar;
          this.#controller = this.#createController(destination.store, replaced ? userTexts(this.#ports.transcript()) : []);
          if (this.#started) this.#controller.start();
        } else {
          // Security: missing identity must not reopen Shared or retain another session's recall.
          const fallback = replaced ? userTexts(this.#ports.transcript()).reverse() : [];
          this.#ports.editor.recall?.reset();
          this.#ports.editor.recall?.replace(fallback);
        }
        return;
      }
    }
    if (replaced) this.#controller?.reset(userTexts(this.#ports.transcript()));
  }

  #createController(store: PromptHistoryPort, fallback: readonly string[]): PromptHistoryController {
    return new PromptHistoryController({
      editor: this.#ports.editor,
      store,
      limit: this.#options.limit,
      fallback,
      active: () => this.#ports.usesDefaultInputSurface(),
      render: () => this.#ports.requestRender(),
      rehydrate: value => this.#ports.rehydrate(value, id => this.#imageSidecar?.readAttachment(id) ?? null),
    });
  }
}

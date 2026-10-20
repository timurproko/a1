import {
  assertOwnedUiCommand,
  assertPromptImages,
  ImageAttachmentError,
} from "../../contracts/owned-ui/index.js";
import type {
  OwnedUiCommand,
  OwnedUiCommandResult,
  OwnedUiSessionBackend,
  OwnedUiSessionViewModel,
  OwnedUiWorkflowResult,
  PromptHistoryImageSidecarPort,
  PromptHistoryKind,
} from "../../contracts/owned-ui/index.js";
import { renderPiShellStatusText } from "../../integrations/pi/components/shell-presenters-info.js";
import type { PromptHistoryController } from "./prompt-history-controller.js";
import type { ResidentTabCoordinator } from "./resident-tab-coordinator.js";
import type { SessionConcern } from "./session-concern.js";
import type { OwnedUiSessionShellRoot } from "./session-shell-root.js";
import type { OwnedUiPresenterTerminal } from "./shell-host.js";

export interface PromptSubmissionPorts {
  readonly backend: Pick<OwnedUiSessionBackend, "session" | "identity" | "workflows">;
  readonly root: Pick<OwnedUiSessionShellRoot,
    | "editor" | "hasPendingPastes" | "waitForPromptPastes" | "setExtensionWidget" | "prepareHistoryText"
    | "imageChipAttachmentsFromEditor" | "preparePromptSubmission" | "omitUnsentPromptImages"
    | "resumeViewportFollowing" | "beginImageSubmissionStatus" | "appendWorkflowResult">;
  readonly terminal: Pick<OwnedUiPresenterTerminal, "requestRender">;
  readonly residentTab: ResidentTabCoordinator;
  readonly cwd: string;
  promptHistory(): PromptHistoryController | null;
  imageSidecar(): PromptHistoryImageSidecarPort | undefined;
  disposed(): boolean;
  correlation(prefix: string): string;
  lifecycle(): OwnedUiSessionViewModel["lifecycle"];
  currentSessionFile(): string | null;
  /** Slash input the presenter routes itself: owned routes, workflows, and skills. */
  slashCommand(text: string): Promise<OwnedUiCommandResult>;
  /** A prompt is about to be submitted; a pending suggestion for the old draft no longer applies. */
  invalidateSuggestions(): void;
}

const rejected = (diagnostic: string): OwnedUiCommandResult => ({ outcome: "rejected", diagnostic });

/**
 * Turns editor input into engine commands: prompts, steering, follow-ups, and bash, each recorded
 * in history first. It holds a submission whose image pastes are still preparing, journals prompts
 * for resident tabs, and recovers the draft when a submission is rejected.
 */
export class PromptSubmission implements SessionConcern {
  readonly #ports: PromptSubmissionPorts;
  readonly #waiting = new Map<string, { controller: AbortController; result: Promise<OwnedUiCommandResult> }>();
  #editorRevision = 0;

  constructor(ports: PromptSubmissionPorts) {
    this.#ports = ports;
  }

  /** True while a submission waits for its image pastes. */
  get waiting(): boolean {
    return this.#waiting.size > 0;
  }

  /** The editor changed; a later recovery never overwrites input typed after its submission. */
  noteEditorChange(): void {
    this.#editorRevision++;
  }

  submit(text: string): Promise<OwnedUiCommandResult> {
    return this.#whenReady(text, () => this.#submit(text));
  }

  queueFollowUp(draft: string): Promise<OwnedUiCommandResult> {
    return this.#whenReady(draft, () => this.#queueFollowUp(draft));
  }

  cancelWaiting(): void {
    for (const item of this.#waiting.values()) item.controller.abort();
  }

  /** Puts waiting submissions and the engine's queued input back into the editor. */
  restoreQueued(): void {
    const queued = [...this.#waiting.keys(), ...this.#ports.backend.workflows.clearQueuedWorkflows()];
    this.cancelWaiting();
    if (queued.length === 0) return;
    this.#ports.root.editor.setText(queued.join("\n"));
    this.#ports.terminal.requestRender();
  }

  /** Sends slash text the shell does not own as engine prompt input; history keeps what was typed. */
  sendSlashPrompt(text: string, typed: string = text): Promise<OwnedUiCommandResult> {
    this.#rememberInput(typed, "slash");
    this.#ports.root.resumeViewportFollowing();
    return this.execute({
      type: this.#ports.lifecycle() === "busy" ? "steer" : "prompt",
      correlationId: this.#ports.correlation("prompt-command"),
      sessionId: this.#ports.backend.identity.sessionId,
      text,
    });
  }

  /** Executes a command; with a draft, a rejected or failed submission puts the draft back for recovery. */
  async execute(command: OwnedUiCommand, draft?: string): Promise<OwnedUiCommandResult> {
    const { backend } = this.#ports;
    if (draft === undefined) return backend.session.execute(command);
    const revision = this.#editorRevision;
    try {
      assertOwnedUiCommand(command);
    } catch (error) {
      return this.#recover(draft, revision, error);
    }
    try {
      const result = await backend.session.execute(command);
      if (result.outcome === "rejected") return this.#recover(draft, revision);
      return result;
    } catch {
      // Security: dispatch might already have reached the provider. Never retry automatically.
      this.#ports.root.editor.addToHistory(draft);
      this.#ports.promptHistory()?.rememberRecovery(draft);
      this.reportError(undefined, "Submission failed; delivery is uncertain. Check the conversation before retrying. Press Up to recover the draft.");
      return { outcome: "failed", diagnostic: "submission delivery is uncertain" };
    }
  }

  reportError(error?: unknown, message?: string): void {
    // Security: arbitrary provider/extension error messages can contain the entire request.
    try {
      this.#ports.root.appendWorkflowResult({ command: "debug", outcome: "failed", message: message
        ?? (error instanceof ImageAttachmentError ? error.message : "Submission failed. Check the prompt and try again.") },
      error instanceof ImageAttachmentError ? error.code : undefined);
      this.#ports.terminal.requestRender();
    } catch { /* Security: error presentation cannot create another rejected submission callback. */ }
  }

  onSessionReplaced(): void {
    this.cancelWaiting();
  }

  dispose(): void {
    this.cancelWaiting();
  }

  #whenReady(draft: string, action: () => Promise<OwnedUiCommandResult>): Promise<OwnedUiCommandResult> {
    const { root, backend } = this.#ports;
    const previous = this.#waiting.get(draft);
    if (previous !== undefined) return previous.result;
    if (!root.hasPendingPastes(draft)) return this.#guard(draft, action);
    const controller = new AbortController();
    const generation = backend.identity.sessionGeneration;
    const result = this.#guard(draft, async () => {
      await root.waitForPromptPastes(draft, controller.signal);
      if (controller.signal.aborted || this.#ports.disposed() || backend.identity.sessionGeneration !== generation) return rejected("image submission canceled");
      return action();
    }).finally(() => {
      this.#waiting.delete(draft);
      if (!this.#ports.disposed()) this.#showWaiting();
    });
    this.#waiting.set(draft, { controller, result });
    if (root.editor.getText() === draft) root.editor.setText("");
    this.#showWaiting();
    return result;
  }

  #showWaiting(): void {
    const count = this.#waiting.size;
    this.#ports.root.setExtensionWidget("owned-image-preparation", count === 0 ? null : {
      render: width => [...renderPiShellStatusText(`Waiting for images (${count} submission${count === 1 ? "" : "s"}) — Esc cancels; dequeue restores`, width)],
      invalidate: () => {},
    }, "aboveEditor");
    this.#ports.terminal.requestRender();
  }

  async #guard(draft: string, action: () => Promise<OwnedUiCommandResult>): Promise<OwnedUiCommandResult> {
    const revision = this.#editorRevision;
    try { return await action(); }
    catch (error) {
      if (error instanceof ImageAttachmentError && error.code === "image-canceled") return rejected("image submission canceled");
      return this.#recover(draft, revision, error);
    }
  }

  #recover(draft: string, revision: number, error?: unknown): OwnedUiCommandResult {
    const { root } = this.#ports;
    root.editor.addToHistory(draft);
    this.#ports.promptHistory()?.rememberRecovery(draft);
    // Concurrency: never overwrite input typed (even typed and cleared) after this submission.
    if (revision === this.#editorRevision && root.editor.getText().length === 0) root.editor.setText(draft);
    const message = error instanceof ImageAttachmentError ? error.message : "Submission rejected. Check the prompt and attachments.";
    this.reportError(error, error instanceof ImageAttachmentError && error.code === "image-count"
      ? message
      : `${message} Press Up to recover the draft.`);
    return rejected(message);
  }

  #rememberInput(text: string, kind: PromptHistoryKind): void {
    const { root } = this.#ports;
    root.editor.addToHistory(text);
    const history = this.#ports.promptHistory();
    if (history === null) return;
    const reusable = root.prepareHistoryText(text);
    if (reusable.length === 0) {
      history.rememberRecovery(text);
      return;
    }
    // Rationale: write the image chip payloads referenced by an editor draft to the sidecar
    // directory before their history row commits. Missing sidecar dependency = silent skip; the
    // recall path treats an absent sidecar the same as a corrupt one.
    const sidecar = this.#ports.imageSidecar();
    if (sidecar !== undefined) {
      for (const record of root.imageChipAttachmentsFromEditor(text)) {
        sidecar.write(record.id, { tag: record.tag, data: record.image.data, mimeType: record.image.mimeType, savedAt: new Date().toISOString() });
      }
    }
    history.capture(reusable, kind, this.#ports.cwd, this.#ports.backend.identity.sessionId);
  }

  async #submit(text: string): Promise<OwnedUiCommandResult> {
    this.#ports.invalidateSuggestions();
    const displayInput = text.trim();
    if (!displayInput) return { outcome: "completed", diagnostic: null };
    if (displayInput.startsWith("/")) return this.#ports.slashCommand(displayInput);
    const { root, backend } = this.#ports;
    const prepared = root.preparePromptSubmission(displayInput);
    assertPromptImages(prepared.images);
    const input = prepared.text.trim();
    if (input.startsWith("!")) {
      const bash = await this.#bash(input, displayInput);
      if (bash !== undefined) return bash;
    }
    // Compatibility: match interactive Pi: input during compaction is queued steering; the engine
    // shows it in the pending rows and delivers it when compaction ends.
    const type = this.#ports.lifecycle() === "busy" ? "steer" as const : "prompt" as const;
    this.#rememberInput(root.omitUnsentPromptImages(displayInput).trim(), type);
    root.resumeViewportFollowing();
    const command = {
      type,
      correlationId: this.#ports.correlation(type),
      sessionId: backend.identity.sessionId,
      text: input,
      ...(prepared.images.length === 0 ? {} : { images: prepared.images }),
    } as const;
    let submission: { readonly id: string } | undefined;
    try {
      submission = await this.#ports.residentTab.admit({
        sessionId: command.sessionId,
        sessionFile: this.#ports.currentSessionFile(),
        kind: type,
        text: input,
      });
    } catch {
      if (root.editor.getText().length === 0) root.editor.setText(displayInput);
      const message = "Prompt was not sent because its recovery journal could not be synchronized.";
      this.reportError(undefined, message);
      return rejected(message);
    }
    const finishSending = prepared.images.length === 0 ? () => {} : root.beginImageSubmissionStatus();
    try {
      const result = await this.execute(command, displayInput);
      if (submission !== undefined && result.outcome !== "rejected") {
        await this.#ports.residentTab.dispatched(submission.id, command.correlationId);
      }
      return result;
    } finally {
      finishSending();
    }
  }

  // Protocol: `!command` runs bash with its output in context, `!!command` keeps it out; an empty command is prompt text.
  async #bash(input: string, displayInput: string): Promise<OwnedUiCommandResult | undefined> {
    const excludeFromContext = input.startsWith("!!");
    const command = input.slice(excludeFromContext ? 2 : 1).trim();
    if (!command) return undefined;
    this.#rememberInput(displayInput, "bash");
    try {
      const result = await this.#ports.backend.workflows.executeBashWorkflow(command, excludeFromContext);
      const workflow: OwnedUiWorkflowResult = {
        command: "debug",
        outcome: result.cancelled ? "cancelled" : result.exitCode === 0 || result.exitCode === undefined ? "completed" : "failed",
        message: result.cancelled ? "Bash command cancelled" : `Bash exited ${result.exitCode ?? 0}: ${command}`,
        ...(result.output ? { detail: result.output } : {}),
      };
      this.#ports.root.appendWorkflowResult(workflow);
      this.#ports.terminal.requestRender();
      return workflow.outcome === "failed" ? rejected(workflow.message) : { outcome: "completed", diagnostic: null };
    } catch (error) {
      const message = `Bash command failed: ${error instanceof Error ? error.message : String(error)}`;
      this.#ports.root.appendWorkflowResult({ command: "debug", outcome: "failed", message });
      this.#ports.terminal.requestRender();
      return rejected(message);
    }
  }

  async #queueFollowUp(draft: string): Promise<OwnedUiCommandResult> {
    const { root, backend } = this.#ports;
    const displayInput = draft.trim();
    if (!displayInput) return rejected("nothing to queue");
    const prepared = root.preparePromptSubmission(displayInput);
    assertPromptImages(prepared.images);
    const text = prepared.text.trim();
    this.#rememberInput(displayInput, "follow-up");
    if (root.editor.getText() === draft) root.editor.setText("");
    root.resumeViewportFollowing();
    return this.execute({
      type: "follow-up",
      correlationId: this.#ports.correlation("follow-up"),
      sessionId: backend.identity.sessionId,
      text,
      ...(prepared.images.length === 0 ? {} : { images: prepared.images }),
    }, displayInput);
  }
}

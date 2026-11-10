import type { OwnedUiShellComponents, OwnedUiShellHotkeysPresentation, OwnedUiShellTranscriptComponentPort } from "../../contracts/owned-ui/index.js";
import type { ImageAttachmentError, OwnedUiWorkflowMessage, OwnedUiWorkflowResult } from "../../contracts/owned-ui/index.js";
import type { DockChrome } from "./dock-chrome.js";
import type { TranscriptDocument } from "./transcript-document.js";

interface WorkflowOutputPorts {
  readonly customViewport: boolean;
  readonly components: Pick<OwnedUiShellComponents, "info" | "text">;
  readonly document: Pick<TranscriptDocument, "lastId" | "anchorOf" | "invalidate" | "appendAnchored" | "removeAnchored">;
  readonly dock: Pick<DockChrome, "setNotice" | "dismissNotice">;
  /** How many semantic transcript blocks precede new output; workflow output anchors after them. */
  transcriptLength(): number;
  outputPad(): 0 | 1;
  hotkeysPresentation(): OwnedUiShellHotkeysPresentation;
  readonly componentRuntime: { getColumns(): number; getRows(): number; requestRender(): void };
  /** Output changed what the shell draws; the root invalidates. */
  invalidate(): void;
}

/**
 * Presents workflow results: bare A1 answers in the dock notice, the pinned profile appends
 * transcript-anchored output, and consecutive status lines at the same anchor replace each other.
 */
export class WorkflowOutput {
  readonly #ports: WorkflowOutputPorts;
  #sequence = 0;
  readonly #statusMessages = new Map<string, string>();
  #lastStatusId: string | undefined;

  constructor(ports: WorkflowOutputPorts) {
    this.#ports = ports;
  }

  appendStatus(message: string): void {
    // Rationale: bare A1 acknowledges commands in one dock notice above the editor, where the
    // reader's eye already is, instead of a transcript row that opens an empty session at the
    // top-left or sinks into a long feed. The pinned route keeps Pi's chat placement.
    if (this.#ports.customViewport) {
      this.#ports.dock.setNotice({ kind: "status", message });
      return;
    }
    const { document } = this.#ports;
    const previousId = this.#lastStatusId;
    if (previousId !== undefined
      && document.lastId === previousId
      && document.anchorOf(previousId) === this.#ports.transcriptLength()) {
      this.#statusMessages.set(previousId, message);
      document.invalidate("workflow-status");
      this.#ports.invalidate();
      return;
    }
    const id = this.#appendAnchored(width => [
      "",
      ...this.#ports.components.info.statusText(this.#statusMessages.get(id) ?? message, width),
    ]);
    this.#statusMessages.set(id, message);
    this.#lastStatusId = id;
  }

  appendMessage(message: OwnedUiWorkflowMessage, errorCode?: ImageAttachmentError["code"]): void {
    if (message.kind === "status") {
      this.appendStatus(message.message);
      return;
    }
    if (this.#ports.customViewport && (message.kind === "warning" || message.kind === "error")) {
      this.#ports.dock.setNotice({
        kind: errorCode === "image-count" ? "warning" : message.kind,
        message: message.message,
        ...(errorCode === undefined ? {} : { errorCode }),
      });
      return;
    }
    this.#lastStatusId = undefined;
    const presentation = { kind: message.kind, message: message.message };
    this.#appendAnchored(width => this.#ports.components.info.commandMessage(presentation, width, this.#ports.outputPad()));
  }

  appendResult(result: OwnedUiWorkflowResult, errorCode?: ImageAttachmentError["code"]): void {
    // Rationale: model state already repaints the footer; only actionable diagnostics need another surface.
    if (this.#ports.customViewport && result.outcome === "completed"
      && result.presentation?.kind === "model-change") {
      for (const message of result.messages ?? []) {
        if (message.kind !== "status") this.appendMessage(message, errorCode);
      }
      if (result.messages === undefined && (result.messageKind === "warning" || result.messageKind === "error")) {
        this.appendMessage({ kind: result.messageKind, message: result.message }, errorCode);
      }
      return;
    }
    if (result.messages !== undefined) {
      for (const message of result.messages) this.appendMessage(message, errorCode);
      return;
    }
    if (result.messageKind === "silent" || (result.outcome === "cancelled" && result.messageKind === undefined)) return;
    if (result.command === "reload" && result.outcome === "completed") {
      this.appendStatus(result.message);
      return;
    }
    if (result.outcome === "completed" && this.#appendPresentation(result)) return;
    if (result.outcome === "failed") {
      this.appendMessage({
        kind: result.messageKind === "warning" ? "warning" : "error",
        message: result.message,
      }, errorCode);
      return;
    }
    if (result.outcome === "completed" && (result.command === "quit" || result.command === "compact")) return;
    if (result.outcome === "completed" && result.command === "new" && this.#ports.customViewport) {
      // Rationale: bare A1 keeps the replacement session visually empty while preserving Pi's accent notice shape.
      this.#ports.dock.setNotice({ kind: "new-session", message: result.message });
      return;
    }
    if (result.outcome === "completed" && (result.command === "new" || result.command === "name" || result.command === "debug")) {
      this.#lastStatusId = undefined;
      const presentation = { kind: result.command, message: result.message, ...(result.detail === undefined ? {} : { detail: result.detail }) };
      this.#appendAnchored(width => this.#ports.components.info.commandMessage(presentation, width, this.#ports.outputPad()));
      return;
    }
    if (result.outcome === "completed" && this.#appendAnnouncement(result.command)) return;
    // Rationale: the pinned engine links both share URLs; the workflow result carries the plain URLs.
    const link = (url: string) => this.#ports.components.text.hyperlink(url);
    const message = result.command !== "share" ? result.message
      : result.detail ? `${linkShareUrl(result.message, link)}\nGist: ${link(result.detail)}`
      // Protocol: Radius shares carry only the artifact URL.
      : linkShareUrl(result.message, link);
    this.appendStatus(message);
  }

  /** Drops every anchored output and the status-replacement chain. */
  reset(): void {
    this.#ports.document.removeAnchored();
    this.#statusMessages.clear();
    this.#lastStatusId = undefined;
  }

  // Invariant: session info, hotkeys, and changelog draw their own components; false for any other completed command.
  #appendPresentation(result: OwnedUiWorkflowResult): boolean {
    if (result.command === "session" && result.presentation?.kind === "session-info") {
      this.#lastStatusId = undefined;
      const sessionInfo = this.#ports.components.info.sessionInfo(result.presentation);
      this.#appendAnchored(width => sessionInfo.render(width), () => sessionInfo.dispose?.());
      return true;
    }
    if (result.command === "hotkeys") {
      this.#lastStatusId = undefined;
      const presentation = this.#ports.hotkeysPresentation();
      const hotkeys = this.#ports.components.info.hotkeys(
        presentation.bindings,
        presentation.getShortcuts,
        presentation.profile,
      );
      this.#appendAnchored(width => hotkeys.render(width), () => hotkeys.dispose?.());
      return true;
    }
    if (result.command === "changelog") {
      this.#lastStatusId = undefined;
      const changelog = this.#ports.components.info.changelog(result.detail ?? "No changelog entries found.");
      this.#appendAnchored(width => changelog.render(width), () => changelog.dispose?.());
      return true;
    }
    return false;
  }

  // Invariant: the two easter-egg announcements; false for any other command.
  #appendAnnouncement(command: string): boolean {
    if (command === "arminsayshi") {
      this.#lastStatusId = undefined;
      const armin = this.#ports.components.info.armin(this.#ports.componentRuntime);
      this.#appendAnchored(width => ["", ...armin.render(width)], () => armin.dispose?.());
      return true;
    }
    if (command === "dementedelves") {
      this.#lastStatusId = undefined;
      const announcement = this.#ports.components.info.earendilAnnouncement();
      this.#appendAnchored(width => ["", ...announcement.render(width)], () => announcement.dispose?.());
      return true;
    }
    return false;
  }

  #appendAnchored(render: (width: number) => readonly string[], dispose?: () => void): string {
    // Invariant: transcript-bound workflow output supersedes a pending acknowledgement.
    this.#ports.dock.dismissNotice();
    this.#sequence += 1;
    const id = `workflow-status-${this.#sequence}`;
    const component: OwnedUiShellTranscriptComponentPort = {
      id,
      revision: 1,
      render,
      handleInput() {},
      invalidate() {},
      update() {},
      setExpanded() {},
      setOutputPad() {},
      setHideThinkingBlock() {},
      setMermaidRenderingMode() {},
      setImagePresentation() {},
      ...(dispose === undefined ? {} : { dispose }),
    };
    this.#ports.document.appendAnchored(id, component, this.#ports.transcriptLength());
    this.#ports.invalidate();
    return id;
  }
}

/** "Share URL: <url>" with the URL made clickable; other share wordings pass through unchanged. */
function linkShareUrl(message: string, link: (url: string) => string): string {
  const match = /^Share URL: (\S+)$/.exec(message);
  return match === null ? message : `Share URL: ${link(match[1]!)}`;
}

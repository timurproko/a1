import { PRODUCT_TEXT } from "../../product-identity.js";

export interface SessionResumeCommandMetadata {
  readonly sessionId: string;
  readonly sessionDir: string;
  readonly usesDefaultSessionDir: boolean;
}

export function formatSessionResumeCommand(metadata: SessionResumeCommandMetadata): string {
  const args = [PRODUCT_TEXT.commandName];
  if (!metadata.usesDefaultSessionDir) args.push("--session-dir", quoteCommandArgument(metadata.sessionDir));
  args.push("--session", metadata.sessionId);
  return args.join(" ");
}

export function quoteCommandArgument(value: string): string {
  if (value.length > 0 && !/[^a-zA-Z0-9_\-./~:@]/.test(value)) return value;
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

export interface ExitTextInput {
  readonly terminalMode: "regular" | "fullscreen";
  readonly customViewport: boolean;
  readonly exitMode: "transcript" | "resume-hint";
  readonly resume: SessionResumeCommandMetadata | null;
  /** The styled transcript, rendered only when the pinned profile asks for it. */
  readonly transcript: () => string;
}

/**
 * What a fullscreen leave prints into the parent terminal: nothing after a regular-screen session,
 * only the resume hint for bare A1 or when configured, and otherwise the transcript then the hint.
 */
export function composeExitText(input: ExitTextInput): string {
  if (input.terminalMode !== "fullscreen") return "";
  const resumeHint = input.resume === null ? "" : `${dim("To resume this session:")} ${formatSessionResumeCommand(input.resume)}`;
  // Invariant: bare A1 leaves only the hint behind; the pinned comparison profile still
  // honors fullscreenExitOutput, including the styled transcript.
  if (input.customViewport || input.exitMode === "resume-hint") return resumeHint;
  return [input.transcript(), resumeHint].filter(Boolean).join("\n\n");
}

/** Resolves once when the session stops, whether it stopped itself, was quit, or was disposed. */
export class SessionStopLatch {
  readonly stopped: Promise<void>;
  #resolve: (() => void) | undefined;

  constructor() {
    this.stopped = new Promise(resolve => {
      this.#resolve = resolve;
    });
  }

  resolve(): void {
    const resolve = this.#resolve;
    this.#resolve = undefined;
    resolve?.();
  }

  /** The engine stopped on its own: dispose the shell, then resolve whether or not disposal failed. */
  settleAfter(dispose: () => Promise<void>): void {
    void dispose().then(() => this.resolve(), () => this.resolve());
  }
}

function dim(value: string): string {
  return `\u001b[2m${value}\u001b[22m`;
}

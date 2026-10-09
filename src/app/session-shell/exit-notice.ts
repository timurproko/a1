/**
 * The runtime's half of the unclean-exit protocol with the native process guardian. While the
 * notice is armed, the guardian treats the runtime's end as unclean: it restores the terminal and
 * prints these lines, so a killed session still leaves its resume command behind. A clean shutdown
 * clears the notice after the terminal is restored.
 */
import { renameSync, rmSync, writeFileSync } from "node:fs";
import { PRODUCT_IDENTITY } from "../../product-identity.js";
import { formatSessionResumeCommand, type SessionResumeCommandMetadata } from "./session-shell.js";

export interface ExitNoticeSource {
  readonly identity: {
    readonly sessionGeneration: number;
    currentSessionResumeMetadata(): SessionResumeCommandMetadata | null;
  };
  readonly session: {
    onEvent(listener: (event: { readonly type: string }) => void): () => void;
  };
}

export interface ArmedExitNotice {
  clear(): void;
}

export function uncleanExitNoticeLines(resume: SessionResumeCommandMetadata | null): string[] {
  return [
    `${PRODUCT_IDENTITY.displayName} was stopped unexpectedly.`,
    ...(resume === null ? [] : [`To resume this session: ${formatSessionResumeCommand(resume)}`]),
  ];
}

/** Arms the notice and keeps its resume command following the bound session until cleared. */
export function armExitNotice(source: ExitNoticeSource, path: string): ArmedExitNotice {
  let current: string | null = null;
  let cleared = false;
  let generation = source.identity.sessionGeneration;
  const write = () => {
    if (cleared) return;
    // Protocol: plain text only; the guardian strips control characters, so styling would be lost.
    const text = `${uncleanExitNoticeLines(source.identity.currentSessionResumeMetadata()).join("\n")}\n`;
    if (text === current) return;
    try {
      // Invariant: the guardian may read at any instant, so it sees the previous or the next notice, never half of one.
      const temporary = `${path}.${process.pid}.tmp`;
      writeFileSync(temporary, text, { mode: 0o600 });
      renameSync(temporary, path);
      current = text;
    } catch {}
  };
  write();
  const unsubscribe = source.session.onEvent(event => {
    // Rationale: a session is persisted by its first response and replaced by /new or /resume;
    // these events cover both without touching the per-chunk stream.
    const replaced = source.identity.sessionGeneration !== generation;
    if (!replaced && event.type !== "session-lifecycle" && event.type !== "assistant-message-completed") return;
    generation = source.identity.sessionGeneration;
    write();
  });
  return {
    clear() {
      if (cleared) return;
      cleared = true;
      unsubscribe();
      try { rmSync(path, { force: true }); } catch {}
    },
  };
}

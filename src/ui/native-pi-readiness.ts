import type { TerminalSurface } from "../domain/index.js";

export const NATIVE_PI_READINESS_DEADLINE_MS = 15_000;

export interface NativePiReadinessEvidence {
  readonly status: "pending" | "ready" | "failed";
  readonly reason: string;
  readonly visibleCharacters: number;
  readonly cursorOnly: boolean;
  readonly editorMarker: string | null;
  readonly contextMarker: string | null;
  readonly elapsedMs: number;
  readonly deadlineMs: number;
}

const EDITOR_MARKERS = [
  /READY>/i,
  /Ask anything/i,
  /Type (?:a )?message/i,
  /Send (?:a )?message/i,
  /Message Pi/i,
  /escape interrupt/i,
] as const;
const CONTEXT_MARKERS = [
  /PI FIXTURE/i,
  /pi v\d/i,
  /offline/i,
  /model/i,
  /tokens?/i,
  /settings/i,
  /ctrl[+\-]/i,
  /\/help/i,
] as const;

export function inspectNativePiReadiness(
  surface: TerminalSurface,
  elapsedMs: number,
  deadlineMs: number,
): NativePiReadinessEvidence {
  const text = surface.cells.map(row => row.map(cell => cell.width === 0 ? "" : cell.character).join("")).join("\n");
  const visibleCharacters = [...text].filter(character => character.trim().length > 0).length;
  const editorMarker = matchingText(text, EDITOR_MARKERS);
  const contextMarker = matchingText(text, CONTEXT_MARKERS);
  const ready = editorMarker !== null && contextMarker !== null;
  const cursorOnly = visibleCharacters === 0;
  if (ready) {
    return { status: "ready", reason: "recognizable Native Pi editor and context are visible", visibleCharacters, cursorOnly, editorMarker, contextMarker, elapsedMs, deadlineMs };
  }
  if (elapsedMs >= deadlineMs) {
    const reason = cursorOnly
      ? "Native Pi remained empty or cursor-only until the readiness deadline"
      : "Native Pi did not expose recognizable editor and startup/footer content before the readiness deadline";
    return { status: "failed", reason, visibleCharacters, cursorOnly, editorMarker, contextMarker, elapsedMs, deadlineMs };
  }
  return { status: "pending", reason: "waiting for recognizable Native Pi editor and context", visibleCharacters, cursorOnly, editorMarker, contextMarker, elapsedMs, deadlineMs };
}

function matchingText(text: string, patterns: readonly RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match?.[0]) return match[0];
  }
  return null;
}

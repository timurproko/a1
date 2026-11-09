import type { OwnedUiSessionNameCompletion } from "../../contracts/owned-ui/index.js";

export type SessionNameFormat = "kebab" | "sentence" | "title";

export function formatSessionName(value: string, format: SessionNameFormat): string | null {
  const words = (format === "kebab" ? value.toLowerCase() : value).match(/[a-z0-9]+/gi) ?? [];
  const name = words.map((word, index) => {
    if (format === "kebab") return word;
    if (/^[A-Z0-9]+$/.test(word) || /[a-z][A-Z]/.test(word)) return word;
    const lower = word.toLowerCase();
    return format === "title" || index === 0 ? lower[0]!.toUpperCase() + lower.slice(1) : lower;
  }).join(format === "kebab" ? "-" : " ");
  if (!name) return null;
  if (name.length <= 16) return name;
  const boundary = name.slice(0, 17).lastIndexOf(format === "kebab" ? "-" : " ");
  return (boundary >= 4 ? name.slice(0, boundary) : name.slice(0, 16)).replace(/[- ]+$/g, "") || null;
}

/** Two bounded tool-free attempts; cancellation never becomes an automatic fallback. */
export async function generateSessionNameCandidate(
  prompt: string,
  hints: string,
  complete: (request: OwnedUiSessionNameCompletion) => Promise<string | null>,
  signal: AbortSignal,
  format: () => SessionNameFormat,
  timeoutMs = 30_000,
): Promise<string> {
  for (const maxTokens of [4_096, 32_768]) {
    signal.throwIfAborted();
    const deadline = new AbortController();
    const attempt = AbortSignal.any([signal, deadline.signal]);
    const timer = setTimeout(() => deadline.abort(), timeoutMs);
    timer.unref?.();
    let aborted: (() => void) | undefined;
    try {
      const cancelled = new Promise<never>((_, reject) => {
        aborted = () => reject(attempt.reason);
        attempt.addEventListener("abort", aborted, { once: true });
      });
      const requestedFormat = format();
      const style = requestedFormat === "kebab" ? "a lowercase hyphenated title" : `a ${requestedFormat === "sentence" ? "sentence case" : "title case"} title with spaces, preserving acronyms and technical spelling`;
      const response = await Promise.race([complete({
        prompt: `Name this coding task with ${style} of at most 16 characters. Reply only with the title.\nRepository hints: ${hints.slice(0, 300)}\n<task>\n${prompt.slice(0, 500)}\n</task>`,
        maxTokens, signal: attempt,
      }), cancelled]);
      signal.throwIfAborted();
      if (response !== null && formatSessionName(response, format()) !== null) return response;
    } catch {
      signal.throwIfAborted();
    } finally {
      clearTimeout(timer);
      if (aborted) attempt.removeEventListener("abort", aborted);
    }
  }
  signal.throwIfAborted();
  const fallback = (prompt.match(/[a-z0-9]+/gi) ?? []).slice(0, 3).join(" ");
  return fallback || "new task";
}

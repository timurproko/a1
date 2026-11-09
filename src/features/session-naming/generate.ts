import type { OwnedUiSessionNameCompletion } from "../../contracts/owned-ui/index.js";

function normalize(value: string): string | null {
  const name = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!name) return null;
  if (name.length <= 16) return name;
  const boundary = name.slice(0, 17).lastIndexOf("-");
  return (boundary >= 4 ? name.slice(0, boundary) : name.slice(0, 16)).replace(/-+$/g, "") || null;
}

/** Two bounded tool-free attempts; cancellation never becomes an automatic fallback. */
export async function generateSessionName(
  prompt: string,
  hints: string,
  complete: (request: OwnedUiSessionNameCompletion) => Promise<string | null>,
  signal: AbortSignal,
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
      const response = await Promise.race([complete({
        prompt: `Name this coding task with a lowercase hyphenated title of at most 16 characters. Reply only with the title.\nRepository hints: ${hints.slice(0, 300)}\n<task>\n${prompt.slice(0, 500)}\n</task>`,
        maxTokens, signal: attempt,
      }), cancelled]);
      signal.throwIfAborted();
      const name = response === null ? null : normalize(response);
      if (name !== null) return name;
    } catch {
      signal.throwIfAborted();
    } finally {
      clearTimeout(timer);
      if (aborted) attempt.removeEventListener("abort", aborted);
    }
  }
  signal.throwIfAborted();
  return normalize((prompt.toLowerCase().match(/[a-z0-9]+/g) ?? []).slice(0, 3).join("-")) ?? "new-task";
}

export const AUTO_NAME_MAX_LENGTH = 16;
export const AUTO_NAME_TIMEOUT_MS = 30_000;
// Rationale: reasoning models can spend a small ceiling on hidden thinking and emit no title, so an
// answerless attempt retries with a larger bound; budgets stay strictly increasing, as in v2.
export const AUTO_NAME_TOKEN_BUDGETS = [4_096, 32_768] as const;

export function normalizeAutoName(value: string): string | null {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").replace(/-+/g, "-");
  if (!normalized) return null;
  if (normalized.length <= AUTO_NAME_MAX_LENGTH) return normalized;
  const clipped = normalized.slice(0, AUTO_NAME_MAX_LENGTH + 1);
  const boundary = clipped.lastIndexOf("-");
  const result = (boundary >= 4 ? clipped.slice(0, boundary) : normalized.slice(0, AUTO_NAME_MAX_LENGTH)).replace(/-+$/g, "");
  return result || null;
}

export function fallbackAutoName(prompt: string): string {
  const words = prompt.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return normalizeAutoName(words.slice(0, 3).join("-")) ?? "new-task";
}

export interface AutoNameCompletion {
  readonly prompt: string;
  readonly maxTokens: number;
  readonly signal: AbortSignal;
}

export async function generateAutoName(
  firstPrompt: string,
  complete: (request: AutoNameCompletion) => Promise<string | null>,
  timeoutMs = AUTO_NAME_TIMEOUT_MS,
): Promise<string> {
  for (const maxTokens of AUTO_NAME_TOKEN_BUDGETS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    timer.unref?.();
    try {
      const response = await complete({
        prompt: `Name this coding task with a lowercase hyphenated title of at most ${AUTO_NAME_MAX_LENGTH} characters. Reply only with the title.\n\n${firstPrompt.slice(0, 500)}`,
        maxTokens,
        signal: controller.signal,
      });
      const name = response === null ? null : normalizeAutoName(response);
      if (name !== null) return name;
    } catch {
      // Rationale: naming is best effort; the larger bounded attempt precedes the deterministic fallback.
    } finally {
      clearTimeout(timer);
    }
  }
  return fallbackAutoName(firstPrompt);
}

export const CONTEXTUAL_PROMPT_SUGGESTION_INSTRUCTION = `[NEXT USER INPUT]
Predict the one short response the user is most likely to type next.
Use the user's recent intent and writing style. Prefer a concrete continuation such as approving an offered action, choosing an offered option, running a requested check, committing, or pushing.
Return nothing when the next input is unclear, the previous response failed, or the user should assess or correct the result.
Do not answer as the assistant. Do not add a label, explanation, quotation marks, Markdown, or multiple sentences.
Return only 2-12 words, except a natural one-word command or answer is allowed.`;

const ALLOWED_SINGLE_WORDS = new Set([
  "yes", "yeah", "yep", "sure", "ok", "okay", "no",
  "continue", "apply", "commit", "push", "deploy", "test", "check", "stop", "exit", "quit",
]);

/** Converts untrusted model output into one inert, bounded user-voice candidate. */
export function normalizePromptSuggestionCandidate(candidate: string | null | undefined): string | null {
  if (typeof candidate !== "string") return null;
  const suggestion = candidate.trim();
  if (suggestion.length === 0 || [...suggestion].length >= 100) return null;
  if (/[\p{C}\r\n\t]/u.test(suggestion)) return null;
  if (/[\*`#]|__|~~/.test(suggestion)) return null;
  if (/[.!?]\s+\S/u.test(suggestion)) return null;

  const lower = suggestion.toLowerCase();
  if (/^(api error:|prompt is too long|request timed out|invalid api key|image was too large)/.test(lower)) return null;
  if (lower === "done" || /^(nothing to suggest|no suggestion|stay silent|silence\b)/.test(lower)) return null;
  if (/^\w+:\s/u.test(suggestion)) return null;
  if (/^(let me|i(?:'|’)ll|i(?:'|’)ve|i(?:'|’)m|i can|i would|i think|here(?:'|’)s|here is|here are|you can|you should|you could|sure,|of course|certainly)\b/i.test(suggestion)) return null;
  if (/\b(thanks|thank you|looks good|sounds good|that works|that worked|nice|great|perfect|awesome|excellent)\b/i.test(suggestion)) return null;

  const words = suggestion.split(/\s+/u);
  if (words.length > 12) return null;
  if (words.length === 1 && !suggestion.startsWith("/") && !ALLOWED_SINGLE_WORDS.has(lower)) return null;
  return suggestion;
}

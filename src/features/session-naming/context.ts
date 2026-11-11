import type { OwnedUiTranscriptBlock } from "../../contracts/owned-ui/index.js";
import type { SessionNamingContext } from "./controller.js";

const GENERIC_WORDS = new Set("a an the i we you my our your want need can could should would will lets let please now just and or to for of in on with from this that it some more make get do go ahead ok okay yes yep sure approved approve proceed continue implement implementation task tasks change changes feature fix add update build create new main master develop repo repository worktree later again".split(" "));
const APPROVAL_WORDS = new Set([...GENERIC_WORDS, "plan", "thanks", "thank", "start", "done"]);

function cleanTaskText(value: string): string {
  return value.replace(/[^\s"'<>]*\.(?:png|jpe?g|gif|webp|bmp)(?:\?[^\s]*)?/giu, " ")
    .replace(/\[Image[^\]\n]*\]/giu, " ").replace(/[\u0000-\u001f\u007f]/gu, " ").replace(/\s+/gu, " ").trim();
}

function words(value: string): string[] {
  return value.match(/[a-z0-9]+/gi) ?? [];
}

function subjectWords(value: string): string[] {
  return words(value).filter(word => !GENERIC_WORDS.has(word.toLowerCase()));
}

export function isGenericSessionName(value: string): boolean {
  const tokens = words(value);
  return tokens.length === 0 || tokens.every(word => APPROVAL_WORDS.has(word.toLowerCase()));
}

export interface SessionNamingTask {
  readonly prompt: string;
  readonly hints: string;
  readonly discussion: readonly { readonly role: "user" | "assistant"; readonly text: string }[];
  readonly fallback: string;
}

export function sessionNamingTask(prompt: string, promptId: string, context: SessionNamingContext,
  transcript: readonly OwnedUiTranscriptBlock[], allowUnanchored: boolean): SessionNamingTask {
  const current = cleanTaskText(prompt.slice(0, 4_000)).slice(0, 2_000);
  const directory = context.cwd.split(/[\\/]/).at(-1) ?? "";
  const branch = context.branch?.replace(/^[^/]+\//u, "") ?? "";
  const hints = `${directory} (${context.branch ?? "no branch"})`.slice(0, 300);
  const hintWords = subjectWords(branch || directory).filter(word => word.length > 2);
  const anchors = new Set([...hintWords, ...subjectWords(current)].map(word => word.toLowerCase()));
  const end = transcript.findLastIndex(block => block.id === promptId);
  // Security: only bounded plain user/assistant text preceding this prompt can enter naming.
  const recent = transcript.slice(Math.max(0, (end < 0 ? transcript.length : end) - 48), end < 0 ? undefined : end)
    .filter((block): block is OwnedUiTranscriptBlock & { kind: "user" | "assistant" } => block.kind === "user" || block.kind === "assistant")
    .slice(-6).map(block => ({ role: block.kind, text: cleanTaskText(block.text.slice(0, 2_000)).slice(0, 1_000) }))
    .filter(block => block.text && !block.text.startsWith("/") && !isGenericSessionName(block.text));
  let start = recent.findLastIndex(block => subjectWords(block.text).some(word => anchors.has(word.toLowerCase())));
  if (start < 0 && allowUnanchored && hintWords.length === 0 && words(current).length > 0 && isGenericSessionName(current)) {
    start = recent.findLastIndex(block => block.role === "user");
  }
  const discussion = start < 0 ? [] : recent.slice(start);
  const concretePrompt = !isGenericSessionName(current) ? current : "";
  const fallbackSource = concretePrompt || (hintWords.length > 0 ? hintWords.join(" ") : discussion.findLast(block => block.role === "user")?.text ?? discussion.at(-1)?.text ?? "");
  const fallback = subjectWords(fallbackSource).slice(0, 3).join(" ") || "new task";
  return { prompt: current, hints, discussion, fallback };
}

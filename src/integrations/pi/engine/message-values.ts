/** Pure readers over Pi's untyped session messages and the blocks projected from them. */
import type { OwnedUiTranscriptBlock } from "../../../contracts/owned-ui/index.js";

export function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function messageFallbackKey(message: unknown, fallbackIndex: number): string {
  if (!isRecord(message)) return `message-unknown-${fallbackIndex}`;
  const timestamp = typeof message.timestamp === "number" && Number.isSafeInteger(message.timestamp)
    ? message.timestamp
    : `index-${fallbackIndex}`;
  return `message-${stringValue(message.role) ?? "unknown"}-${timestamp}`;
}

/** A later error may restate a declaration, but cannot make completed arguments incomplete. */
export function retainCompletedArguments(current: OwnedUiTranscriptBlock, next: OwnedUiTranscriptBlock): OwnedUiTranscriptBlock {
  if (current.toolState?.argsComplete !== true || next.toolState === undefined || next.toolState.argsComplete) return next;
  return { ...next, toolState: { ...next.toolState, argsComplete: true },
    ...(next.toolRendering === undefined || current.toolRendering === undefined ? {} : {
      toolRendering: { ...next.toolRendering, arguments: current.toolRendering.arguments },
    }),
    payload: { ...(isRecord(next.payload) ? next.payload : {}), argsComplete: true } };
}

/**
 * Whether two blocks say the same thing. A block that says what it already said is not a
 * new revision: the shell renders a block once per revision, so bumping one it did not
 * need re-renders it for nothing.
 */
export function sameBlockContent(left: OwnedUiTranscriptBlock, right: OwnedUiTranscriptBlock): boolean {
  return left.kind === right.kind
    && left.status === right.status
    && left.title === right.title
    && left.text === right.text
    && sameValue(left.toolState, right.toolState)
    && sameValue(left.toolRendering, right.toolRendering)
    && sameValue(left.payload, right.payload)
    && sameValue(left.imageReferences ?? [], right.imageReferences ?? []);
}

export function sameValue(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (typeof left !== typeof right || left === null || right === null) return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    return left.every((value, index) => sameValue(value, right[index]));
  }
  if (typeof left !== "object") return false;
  const leftKeys = Object.keys(left as Record<string, unknown>);
  const rightRecord = right as Record<string, unknown>;
  if (leftKeys.length !== Object.keys(rightRecord).length) return false;
  return leftKeys.every(key =>
    Object.hasOwn(rightRecord, key) && sameValue((left as Record<string, unknown>)[key], rightRecord[key]));
}

export function textFromContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map(item => isRecord(item) && item.type === "text" ? stringValue(item.text) ?? "" : "")
    .filter(text => text.length > 0)
    .join("\n");
}

export function assistantContent(content: readonly unknown[]): readonly Record<string, unknown>[] {
  const result: Record<string, unknown>[] = [];
  for (const item of content) {
    if (!isRecord(item)) continue;
    if (item.type === "text") result.push({ type: "text", text: stringValue(item.text) ?? "" });
    else if (item.type === "thinking") {
      result.push({
        type: "thinking",
        thinking: stringValue(item.thinking) ?? "",
        ...(item.redacted === true ? { redacted: true } : {}),
      });
    } else if (item.type === "toolCall") {
      result.push({
        type: "toolCall",
        id: stringValue(item.id) ?? "",
        name: stringValue(item.name) ?? "unknown",
        arguments: sanitizeJson(item.arguments),
      });
    }
  }
  return result;
}

export function contentImageCount(content: unknown): number {
  return Array.isArray(content)
    ? content.filter(item => isRecord(item) && item.type === "image").length
    : 0;
}

export function jsonSummary(value: unknown): { readonly summary: string; readonly json: unknown } {
  const json = sanitizeJson(value);
  let summary = "";
  try {
    summary = JSON.stringify(json);
  } catch {
    summary = String(value);
  }
  if (summary.length > 512) summary = `${summary.slice(0, 509)}...`;
  return { summary, json };
}

export function sanitizeJson(value: unknown, depth = 0): unknown {
  if (typeof value === "bigint") return value.toString();
  if (value === null || ["string", "number", "boolean"].includes(typeof value)) return value;
  if (depth >= 8) return "[truncated]";
  if (Array.isArray(value)) return value.slice(0, 100).map(item => sanitizeJson(item, depth + 1));
  if (isRecord(value)) {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value).slice(0, 100)) {
      output[key] = sanitizeJson(item, depth + 1);
    }
    return output;
  }
  return String(value);
}

export function finiteNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

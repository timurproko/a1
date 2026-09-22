import { toolRenderingInput } from "./tool-rendering.js";
import { TranscriptImageAssets } from "./transcript-image-assets.js";
import { acceptsTranscriptUpdate, transcriptToolState, type OwnedUiTranscriptBlock, type OwnedUiTranscriptImageReference } from "../../../contracts/owned-ui/index.js";
import { assistantContent, contentImageCount, isRecord, jsonSummary, messageFallbackKey, retainCompletedArguments, sameBlockContent, sanitizeJson, stringValue, textFromContent } from "./message-values.js";

const IMAGE_DIMENSION_NOTE = /^\[Image: original \d+x\d+, displayed at \d+x\d+\. Multiply coordinates by \d+(?:\.\d+)? to map to original image\.\]$/u;
const IMAGE_CONVERSION_NOTE = /^\[Image converted from image\/[a-z0-9.+-]+ to image\/[a-z0-9.+-]+\.\]$/iu;
const IMAGE_OMISSION_NOTE = /^\[Image omitted: could not be (?:converted to a supported inline image format|resized below the inline image size limit)\.\]$/u;

function isImageProcessingHint(line: string): boolean {
  return IMAGE_DIMENSION_NOTE.test(line) || IMAGE_CONVERSION_NOTE.test(line) || IMAGE_OMISSION_NOTE.test(line);
}

function userPresentation(content: unknown): OwnedUiTranscriptBlock["userPresentation"] | undefined {
  const imageCount = contentImageCount(content);
  if (imageCount === 0) return undefined;
  const lines = textFromContent(content).split("\n");
  const retainedHints: string[] = [];
  let dimensionCount = 0;
  let hintStart = lines.length;
  while (hintStart > 0) {
    const line = lines[hintStart - 1]!;
    if (!isImageProcessingHint(line)) break;
    if (IMAGE_DIMENSION_NOTE.test(line)) dimensionCount++;
    else retainedHints.unshift(line);
    hintStart--;
  }
  if (dimensionCount === 0 || dimensionCount > imageCount) return undefined;
  lines.splice(hintStart);
  if (lines.at(-1) === "") lines.pop();
  if (retainedHints.length > 0) lines.push("", ...retainedHints);
  return { visibleText: lines.join("\n") };
}

export interface PiTranscriptProjectionPorts {
  /** Pinned Pi's current retry attempt, which words an aborted declaration's failure text. */
  retryAttempt(): number;
  /** Called once per stored block change, in order, so the adapter can deliver it. */
  blockChanged(block: OwnedUiTranscriptBlock): void;
}

/**
 * The transcript as the owned UI sees it: Pi's session messages and tool events projected into
 * ordered, revisioned blocks. The projection owns block identity (message and tool ids that stay
 * stable across streaming, settlement, and rebuilds), revision numbering, image asset retention,
 * and the reconciliation rules that keep late or duplicate events from disturbing a settled
 * block. It never touches delivery: the adapter seals pending snapshots before a replacement and
 * receives each changed block through the ports.
 */
export class PiTranscriptProjection {
  readonly assets = new TranscriptImageAssets();
  #transcript: OwnedUiTranscriptBlock[] = [];
  readonly #transcriptIndex = new Map<string, number>();
  #transcriptSnapshot: readonly OwnedUiTranscriptBlock[] | undefined;
  readonly #messageBlockIds = new WeakMap<object, string>();
  readonly #messageFallbackIds = new Map<string, string[]>();
  readonly #toolBlockIds = new Map<string, string>();
  #nextBlockSequence = 0;
  readonly #ports: PiTranscriptProjectionPorts;

  constructor(ports: PiTranscriptProjectionPorts) {
    this.#ports = ports;
  }

  /** The current blocks in transcript order; not a copy. */
  get blocks(): readonly OwnedUiTranscriptBlock[] {
    return this.#transcript;
  }

  /** A frozen copy that stays identical until the next change, so views can share it. */
  snapshot(): readonly OwnedUiTranscriptBlock[] {
    return this.#transcriptSnapshot ??= Object.freeze([...this.#transcript]);
  }

  // Performance: replacing the transcript rebuilds its index so block lookup stays constant-time.
  /** Replace every block; the caller has already sealed pending delivery snapshots. */
  replace(blocks: OwnedUiTranscriptBlock[]): void {
    for (const block of blocks) this.assets.retain(block);
    for (const block of this.#transcript) this.assets.release(block);
    this.#transcript = blocks;
    this.#transcriptIndex.clear();
    for (const [index, block] of blocks.entries()) this.#transcriptIndex.set(block.id, index);
    this.assets.discardUnowned();
    this.#transcriptSnapshot = undefined;
  }

  block(id: string): OwnedUiTranscriptBlock | undefined {
    const index = this.#transcriptIndex.get(id);
    return index === undefined ? undefined : this.#transcript[index];
  }

  // Invariant: run-local completion may restate messages, but never owns transcript membership.
  /** Fold a finished run's messages into the transcript without replacing session-authoritative scope. */
  mergeRun(messages: readonly unknown[], sessionMessages: readonly unknown[]): void {
    const positions = new Map<unknown, { index: number; occurrence: number }>();
    const sessionOccurrences = new Map<string, number>();
    for (const [index, message] of sessionMessages.entries()) {
      const key = messageFallbackKey(message, index);
      const occurrence = sessionOccurrences.get(key) ?? 0;
      sessionOccurrences.set(key, occurrence + 1);
      positions.set(message, { index, occurrence });
    }
    const runOccurrences = new Map<string, number>();
    for (const [index, message] of messages.entries()) {
      const key = messageFallbackKey(message, index);
      const occurrence = runOccurrences.get(key) ?? 0;
      runOccurrences.set(key, occurrence + 1);
      const position = positions.get(message) ?? { index, occurrence };
      for (const block of this.messageBlocks(message, "finalized", position.index, position.occurrence)) {
        this.upsert(block);
      }
      this.settleFailedDeclarations(message);
    }
  }

  // Invariant: full replacement is reserved for session-authoritative scope (bind/settlement).
  /** Build the authoritative block list for `messages`, reusing unchanged blocks so their rendered rows survive. */
  rebuild(messages: readonly unknown[], status: OwnedUiTranscriptBlock["status"]): OwnedUiTranscriptBlock[] {
    const blocks: OwnedUiTranscriptBlock[] = [];
    const blockIndexes = new Map<string, number>();
    const occurrences = new Map<string, number>();
    for (const [index, message] of messages.entries()) {
      const key = messageFallbackKey(message, index);
      const occurrence = occurrences.get(key) ?? 0;
      occurrences.set(key, occurrence + 1);
      for (const block of this.messageBlocks(message, status, index, occurrence,
        id => blocks[blockIndexes.get(id) ?? -1] ?? this.block(id))) {
        const existingIndex = blockIndexes.get(block.id);
        if (existingIndex === undefined) {
          blockIndexes.set(block.id, blocks.length);
          blocks.push(block);
          continue;
        }
        const existing = blocks[existingIndex];
        if (existing !== undefined) {
          blocks[existingIndex] = {
            ...block,
            payload: {
              ...(isRecord(existing.payload) ? existing.payload : {}),
              ...(isRecord(block.payload) ? block.payload : {}),
            },
          };
        }
      }
    }
    // Performance: an authoritative rebuild restates most of what is already there. Reusing the block
    // that already says it keeps its revision, and with it the rows the shell rendered for
    // it — otherwise every turn that ends re-renders the whole session.
    return blocks.map(block => {
      const existing = this.block(block.id);
      const next = existing === undefined ? block : retainCompletedArguments(existing, block);
      return existing !== undefined && sameBlockContent(existing, next) ? existing : next;
    });
  }

  upsertMessage(
    message: unknown,
    status: OwnedUiTranscriptBlock["status"],
  ): OwnedUiTranscriptBlock | undefined {
    const blocks = this.messageBlocks(message, status, this.#transcript.length);
    const first = blocks[0];
    for (const block of blocks) this.upsert(block);
    return first;
  }

  messageBlocks(
    message: unknown,
    status: OwnedUiTranscriptBlock["status"],
    fallbackIndex: number,
    occurrence?: number,
    currentBlock: (id: string) => OwnedUiTranscriptBlock | undefined = id => this.block(id),
  ): OwnedUiTranscriptBlock[] {
    if (!isRecord(message) || typeof message.role !== "string") return [];
    const baseId = this.#messageBlockId(message, fallbackIndex, status, occurrence);
    if (message.role === "user") {
      const presentation = userPresentation(message.content);
      return [{
        id: baseId,
        kind: "user",
        status,
        revision: this.nextRevision(baseId),
        title: "User",
        text: textFromContent(message.content),
        ...(presentation === undefined ? {} : { userPresentation: presentation }),
        imageReferences: this.imageReferences(message.content, "user"),
        payload: {
          role: "user",
          imageCount: contentImageCount(message.content),
          timestamp: typeof message.timestamp === "number" && Number.isFinite(message.timestamp) ? message.timestamp : null,
        },
      }];
    }
    if (message.role === "bashExecution") {
      return [{
        id: baseId,
        kind: "bash",
        status,
        revision: this.nextRevision(baseId),
        title: stringValue(message.command) ?? "Bash",
        text: stringValue(message.output) ?? "",
        payload: {
          role: "bashExecution",
          command: stringValue(message.command) ?? "",
          exitCode: typeof message.exitCode === "number" ? message.exitCode : null,
          cancelled: message.cancelled === true,
          truncated: message.truncated === true,
          fullOutputPath: stringValue(message.fullOutputPath) ?? null,
          excludeFromContext: message.excludeFromContext === true,
        },
      }];
    }
    if (message.role === "custom") {
      if (message.display === false) return [];
      return [{
        id: baseId,
        kind: "custom",
        status,
        revision: this.nextRevision(baseId),
        title: stringValue(message.customType) ?? "Custom",
        text: textFromContent(message.content),
        payload: {
          role: "custom",
          customType: stringValue(message.customType) ?? "custom",
          display: true,
          details: message.details,
          timestamp: typeof message.timestamp === "number" ? message.timestamp : 0,
        },
      }];
    }
    if (message.role === "compactionSummary" || message.role === "branchSummary") {
      return [{
        id: baseId,
        kind: "compaction",
        status,
        revision: this.nextRevision(baseId),
        title: message.role === "branchSummary" ? "Branch summary" : "Compaction summary",
        text: stringValue(message.summary) ?? "",
        payload: {
          role: message.role,
          tokensBefore: typeof message.tokensBefore === "number" ? message.tokensBefore : 0,
          fromId: stringValue(message.fromId) ?? null,
          timestamp: typeof message.timestamp === "number" ? message.timestamp : 0,
        },
      }];
    }
    if (message.role === "toolResult") {
      const toolCallId = stringValue(message.toolCallId);
      const blockId = toolCallId === undefined
        ? baseId
        : this.#toolBlockIds.get(toolCallId) ?? `tool-${toolCallId}`;
      if (toolCallId !== undefined) this.#toolBlockIds.set(toolCallId, blockId);
      const existing = currentBlock(blockId);
      const existingPayload = isRecord(existing?.payload) ? existing.payload : undefined;
      const payload = {
        role: "toolResult", toolCallId: toolCallId ?? null,
        toolName: stringValue(message.toolName) ?? stringValue(existingPayload?.toolName) ?? "unknown",
        argsComplete: true, partialResult: status === "live", isError: message.isError === true,
      };
      const rendering = toolRenderingInput({ args: undefined, previousArgs: existing?.toolRendering,
        result: message, payload, image: part => this.imageReferences([part], "tool-result")[0] });
      return [{
        id: blockId,
        kind: "tool-result",
        status,
        toolState: { argsComplete: true, execution: status === "live" ? "running" : message.isError === true ? "failed" : "succeeded" },
        revision: this.nextRevision(blockId),
        title: stringValue(message.toolName) ?? existing?.title ?? "Tool result",
        ...rendering,
        payload,
      }];
    }
    if (message.role !== "assistant" || !Array.isArray(message.content)) return [];

    const blocks: OwnedUiTranscriptBlock[] = [{
      id: baseId,
      kind: "assistant",
      status,
      revision: this.nextRevision(baseId),
      title: "Assistant",
      text: textFromContent(message.content),
      payload: {
        role: "assistant",
        content: assistantContent(message.content),
        provider: stringValue(message.provider) ?? null,
        model: stringValue(message.model) ?? null,
        api: stringValue(message.api) ?? null,
        usage: sanitizeJson(message.usage),
        stopReason: stringValue(message.stopReason) ?? null,
        errorMessage: stringValue(message.errorMessage) ?? null,
        timestamp: typeof message.timestamp === "number" ? message.timestamp : 0,
      },
    }];
    for (const item of message.content) {
      if (!isRecord(item) || item.type !== "toolCall") continue;
      const toolCallId = stringValue(item.id) ?? `${baseId}:${blocks.length}`;
      const blockId = this.#toolBlockIds.get(toolCallId) ?? `tool-${toolCallId}`;
      this.#toolBlockIds.set(toolCallId, blockId);
      const failure = status === "finalized" ? this.#declarationFailure(message) : undefined;
      const payload = { toolCallId, toolName: stringValue(item.name) ?? "unknown",
        argsComplete: failure === undefined && status === "finalized",
        ...(failure === undefined ? {} : { isError: true }) };
      const rendering = toolRenderingInput({ args: item.arguments, payload,
        ...(failure === undefined ? {} : { result: { content: [{ type: "text", text: failure.text }] } }),
        image: () => undefined });
      blocks.push({
        id: blockId,
        kind: failure === undefined ? "tool-call" : "tool-result",
        status: failure === undefined ? "live" : "finalized",
        toolState: {
          argsComplete: failure === undefined && status === "finalized",
          execution: failure?.execution ?? "pending",
        },
        revision: this.nextRevision(blockId),
        title: stringValue(item.name) ?? "Tool",
        ...rendering,
        text: failure?.text ?? jsonSummary(item.arguments).summary,
        payload,
      });
    }
    return blocks;
  }

  #declarationFailure(message: Record<string, unknown>): { execution: "failed" | "aborted"; text: string } | undefined {
    // Provenance: pinned interactive-mode message_end and history reconstruction settle pending tools.
    if (message.role !== "assistant") return undefined;
    if (message.stopReason === "aborted") {
      const attempts = this.#ports.retryAttempt();
      return { execution: "aborted", text: attempts > 0
        ? `Aborted after ${attempts} retry attempt${attempts > 1 ? "s" : ""}` : "Operation aborted" };
    }
    return message.stopReason === "error"
      ? { execution: "failed", text: stringValue(message.errorMessage) || "Error" } : undefined;
  }

  settleFailedDeclarations(message: unknown): void {
    if (!isRecord(message)) return;
    const failure = this.#declarationFailure(message);
    if (failure === undefined) return;
    for (const block of this.#transcript) {
      const state = transcriptToolState(block);
      if (state === undefined || state.execution !== "pending" && state.execution !== "running") continue;
      const payload = { ...(isRecord(block.payload) ? block.payload : {}), partialResult: false, isError: true };
      this.upsert({
        ...block, kind: "tool-result", status: "finalized", revision: block.revision + 1,
        ...toolRenderingInput({ args: undefined, previousArgs: block.toolRendering, payload,
          result: { content: [{ type: "text", text: failure.text }] }, image: () => undefined }),
        toolState: { ...state, execution: failure.execution }, payload,
      });
    }
  }

  imageReferences(content: unknown, source: OwnedUiTranscriptImageReference["source"]): readonly OwnedUiTranscriptImageReference[] {
    if (!Array.isArray(content)) return [];
    const references: OwnedUiTranscriptImageReference[] = [];
    for (const item of content) {
      if (references.length >= 16) break;
      const reference = this.assets.reference(item, source);
      if (reference !== undefined) references.push(reference);
    }
    return references;
  }

  upsertToolExecution(event: Record<string, unknown>): void {
    const toolCallId = stringValue(event.toolCallId);
    if (!toolCallId) return;
    const blockId = this.#toolBlockIds.get(toolCallId) ?? `tool-${toolCallId}`;
    this.#toolBlockIds.set(toolCallId, blockId);
    const ended = event.type === "tool_execution_end";
    const existing = this.block(blockId);
    const state = existing === undefined ? undefined : transcriptToolState(existing);
    // Invariant: duplicate starts cannot blank accumulated output; late events cannot reopen a settled invocation.
    if (state !== undefined && (state.execution !== "pending" && state.execution !== "running"
      || event.type === "tool_execution_start" && state.execution === "running")) return;
    const source = ended ? event.result : event.partialResult;
    const payload = { toolCallId, toolName: stringValue(event.toolName) ?? "unknown",
      partialResult: event.type === "tool_execution_update", argsComplete: true, isError: event.isError === true };
    const rendering = toolRenderingInput({ args: event.args, previousArgs: existing?.toolRendering, result: source,
      payload, image: part => this.imageReferences([part], "tool-result")[0] });
    this.upsert({
      id: blockId,
      kind: ended ? "tool-result" : "tool-call",
      status: ended ? "finalized" : "live",
      toolState: { argsComplete: true, execution: ended ? event.isError === true ? "failed" : "succeeded" : "running" },
      revision: this.nextRevision(blockId),
      title: stringValue(event.toolName) ?? "Tool",
      ...rendering,
      payload,
    });
  }

  upsert(block: OwnedUiTranscriptBlock): void {
    const index = this.#transcriptIndex.get(block.id);
    if (index !== undefined) {
      const existing = this.#transcript[index];
      // Invariant: argument completion is not execution finality; stale phases still stay rejected.
      if (existing !== undefined && !acceptsTranscriptUpdate(existing, block)) return;
      if (existing !== undefined) block = retainCompletedArguments(existing, block);
      // Performance: nothing is emitted for a block that repeats itself, and keeping the
      // revision keeps the rows it already rendered.
      if (existing !== undefined && sameBlockContent(existing, block)) return;
      this.assets.retain(block);
      if (existing !== undefined) this.assets.release(existing);
      this.#transcript[index] = block;
    } else {
      this.assets.retain(block);
      this.#transcriptIndex.set(block.id, this.#transcript.length);
      this.#transcript.push(block);
    }
    this.#transcriptSnapshot = undefined;
    this.#ports.blockChanged(block);
  }

  #messageBlockId(
    message: Record<string, unknown>,
    fallbackIndex: number,
    status: OwnedUiTranscriptBlock["status"],
    occurrence?: number,
  ): string {
    const existing = this.#messageBlockIds.get(message);
    if (existing) return existing;
    const fallback = messageFallbackKey(message, fallbackIndex);
    const cached = this.#messageFallbackIds.get(fallback) ?? [];
    let id: string | undefined;
    if (occurrence !== undefined) {
      id = cached[occurrence];
      if (id === undefined) {
        id = `${fallback}-${occurrence}`;
        cached[occurrence] = id;
      }
    } else {
      id = [...cached].reverse().find(candidate =>
        this.block(candidate)?.status === "live");
      if (id === undefined && status === "finalized") id = cached.at(-1);
      if (id === undefined) {
        id = `${fallback}-${cached.length}`;
        cached.push(id);
      }
    }
    this.#messageFallbackIds.set(fallback, cached);
    this.#messageBlockIds.set(message, id);
    return id;
  }

  nextRevision(id: string): number {
    const existing = this.block(id);
    if (existing) return existing.revision + 1;
    this.#nextBlockSequence += 1;
    return this.#nextBlockSequence;
  }
}

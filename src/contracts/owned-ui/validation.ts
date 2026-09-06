import {
  OWNED_UI_CONTRACT_VERSION,
  type OwnedUiCommand,
  type OwnedUiCustomization,
  type OwnedUiDiagnostics,
  type OwnedUiDialog,
  type OwnedUiEditorState,
  type OwnedUiEvent,
  type OwnedUiOverlay,
  type OwnedUiPromptSuggestionIdentity,
  type OwnedUiPromptSuggestionRequest,
  type OwnedUiPromptSuggestionResult,
  type OwnedUiPromptSuggestionState,
  type OwnedUiSessionViewModel,
  type OwnedUiSnapshot,
  type OwnedUiStatusView,
  type OwnedUiTerminalSurface,
  type OwnedUiTranscriptBlock,
} from "./model.js";

const MAX_ID_LENGTH = 128;
const MAX_LABEL_LENGTH = 256;
const MAX_MESSAGE_LENGTH = 4_096;
const MAX_TEXT_BYTES = 256 * 1024;
const MAX_PAYLOAD_BYTES = 64 * 1024;
const MAX_SESSION_VIEW_BYTES = 1024 * 1024;
const MAX_IMAGE_DATA_BYTES = 8 * 1024 * 1024;
const MAX_PROMPT_IMAGES = 8;
const MAX_BLOCKS = 10_000;
const MAX_CUSTOMIZATIONS = 1_000;
const MAX_DIAGNOSTICS = 1_000;
const MAX_QUEUE = 32;
const MAX_BADGES = 32;
const MAX_STATUS_DIAGNOSTICS = 32;
const MAX_ACTIVE_COMMANDS = 64;

const IMAGE_REFERENCE_SOURCES = new Set(["user", "tool-result"]);

const BLOCK_KINDS = new Set([
  "user",
  "assistant",
  "thinking",
  "tool-call",
  "tool-result",
  "retry",
  "compaction",
  "error",
  "system",
  "custom",
  "bash",
]);
const LIFECYCLES = new Set(["starting", "ready", "busy", "suspended", "stopping", "stopped", "failed"]);
const BLOCK_STATUSES = new Set(["live", "finalized"]);
const SEVERITIES = new Set(["info", "warning", "error"]);
const THINKING_LEVELS = new Set(["off", "minimal", "low", "medium", "high", "xhigh"]);
const SLOT_IDS = new Set([
  "theme",
  "transcript-block",
  "tool-card",
  "editor",
  "status",
  "command",
  "selector",
  "dialog",
  "overlay",
  "layout",
]);
const OUTCOMES = new Set(["accepted", "rejected", "completed", "failed", "timed-out", "cancelled"]);
const FOCUSED_REGIONS = new Set(["transcript", "editor", "dialog", "overlay", "status"]);
const DIALOG_KINDS = new Set(["choice", "editor", "settings", "confirmation"]);
const OVERLAY_PLACEMENTS = new Set(["bottom", "center"]);

export function assertOwnedUiCommand(command: OwnedUiCommand): void {
  assertId(command.correlationId, "owned-UI correlation id");
  assertId(command.sessionId, "owned-UI session id");
  switch (command.type) {
    case "prompt":
    case "steer":
    case "follow-up":
      assertBoundedText(command.text, "owned-UI prompt text", MAX_TEXT_BYTES);
      if (command.images !== undefined) {
        assertCollection(command.images, "owned-UI prompt images", MAX_PROMPT_IMAGES);
        for (const image of command.images) {
          if (image.type !== "image") throw new TypeError("owned-UI prompt image type is invalid");
          assertBoundedText(image.data, "owned-UI prompt image data", MAX_IMAGE_DATA_BYTES);
          assertBoundedText(image.mimeType, "owned-UI prompt image MIME type", MAX_LABEL_LENGTH);
        }
      }
      return;
    case "abort":
    case "retry":
    case "compact":
    case "shutdown":
    case "new-session":
      return;
    case "resume-session":
      assertBoundedText(command.sessionPath, "owned-UI resume session path", MAX_TEXT_BYTES);
      return;
    case "set-model":
      assertId(command.model.providerId, "owned-UI provider id");
      assertId(command.model.modelId, "owned-UI model id");
      assertBoundedText(command.model.displayName, "owned-UI model display name", MAX_LABEL_LENGTH);
      return;
    case "set-thinking-level":
      assertEnum(command.thinkingLevel, THINKING_LEVELS, "owned-UI thinking level");
      return;
    case "set-setting":
      assertId(command.key, "owned-UI setting key");
      assertJsonValue(command.value, "owned-UI setting value", MAX_PAYLOAD_BYTES);
      return;
    case "apply-customization":
      assertOwnedUiCustomization(command.customization);
      return;
    case "remove-customization":
      assertId(command.customizationId, "owned-UI customization id");
      return;
    case "resize-surface":
      assertOwnedUiTerminalSurface(command.surface);
      return;
    default:
      throw new TypeError("owned-UI command type is unknown");
  }
}

export function assertOwnedUiEvent(event: OwnedUiEvent): void {
  assertId(event.sessionId, "owned-UI event session id");
  assertNonNegativeInteger(event.sequence, "owned-UI event sequence");
  switch (event.type) {
    case "session-lifecycle":
      assertEnum(event.lifecycle, LIFECYCLES, "owned-UI lifecycle");
      assertOptionalText(event.reason, "owned-UI lifecycle reason", MAX_MESSAGE_LENGTH);
      return;
    case "session-view":
      assertOwnedUiSessionViewModel(event.view);
      assertViewSession(event.view, event.sessionId);
      return;
    case "transcript-block":
      assertOwnedUiTranscriptBlock(event.block);
      return;
    case "assistant-message-completed":
      assertNonNegativeInteger(event.sessionGeneration, "owned-UI assistant response session generation");
      assertNonNegativeInteger(event.runSequence, "owned-UI assistant response run sequence");
      assertNonNegativeInteger(event.responseSequence, "owned-UI assistant response sequence");
      assertNonNegativeInteger(event.assistantMessageCount, "owned-UI assistant response count");
      if (event.model !== null) assertOwnedUiModelInfo(event.model);
      if (typeof event.successful !== "boolean") throw new TypeError("owned-UI assistant response success state is invalid");
      assertOptionalText(event.stopReason, "owned-UI assistant response stop reason", MAX_LABEL_LENGTH);
      if (typeof event.toolContinuation !== "boolean") throw new TypeError("owned-UI assistant response tool-continuation state is invalid");
      return;
    case "agent-run-started":
      return;
    case "agent-run-settled":
      assertNonNegativeInteger(event.sessionGeneration, "owned-UI settlement session generation");
      assertNonNegativeInteger(event.runSequence, "owned-UI settlement run sequence");
      assertNonNegativeInteger(event.responseSequence, "owned-UI settlement response sequence");
      assertNonNegativeInteger(event.assistantMessageCount, "owned-UI settlement assistant message count");
      if (event.model !== null) assertOwnedUiModelInfo(event.model);
      if (typeof event.successful !== "boolean") throw new TypeError("owned-UI settlement success state is invalid");
      return;
    case "editor-state":
      assertOwnedUiEditorState(event.editor);
      return;
    case "status":
      assertOwnedUiStatusView(event.status);
      return;
    case "dialog":
      if (event.dialog !== null) assertOwnedUiDialog(event.dialog);
      return;
    case "overlay":
      if (event.overlay !== null) assertOwnedUiOverlay(event.overlay);
      return;
    case "command-outcome":
      assertId(event.correlationId, "owned-UI outcome correlation id");
      assertEnum(event.outcome, OUTCOMES, "owned-UI command outcome");
      assertOptionalText(event.diagnostic, "owned-UI command diagnostic", MAX_MESSAGE_LENGTH);
      return;
    case "customization":
      assertCollection(event.customizations, "owned-UI customizations", MAX_CUSTOMIZATIONS);
      assertUniqueCustomizations(event.customizations);
      for (const customization of event.customizations) assertOwnedUiCustomization(customization);
      return;
    case "terminal-surface":
      assertOwnedUiTerminalSurface(event.surface);
      return;
    case "diagnostic":
      assertOwnedUiDiagnostics(event.diagnostic);
      return;
    default:
      throw new TypeError("owned-UI event type is unknown");
  }
}

export function assertOwnedUiPromptSuggestionIdentity(identity: OwnedUiPromptSuggestionIdentity): void {
  assertId(identity.sessionId, "prompt-suggestion session id");
  assertNonNegativeInteger(identity.sessionGeneration, "prompt-suggestion session generation");
  assertNonNegativeInteger(identity.runSequence, "prompt-suggestion run sequence");
  assertNonNegativeInteger(identity.responseSequence, "prompt-suggestion response sequence");
  assertOwnedUiModelInfo(identity.model);
}

export function assertOwnedUiPromptSuggestionRequest(request: OwnedUiPromptSuggestionRequest): void {
  assertOwnedUiPromptSuggestionIdentity(request.identity);
  if (typeof request.signal !== "object" || request.signal === null
    || typeof request.signal.aborted !== "boolean"
    || typeof request.signal.addEventListener !== "function") {
    throw new TypeError("prompt-suggestion abort signal is invalid");
  }
}

export function assertOwnedUiPromptSuggestionResult(result: OwnedUiPromptSuggestionResult): void {
  assertOwnedUiPromptSuggestionIdentity(result.identity);
  assertPromptSuggestionText(result.text, true);
}

export function assertOwnedUiPromptSuggestionState(state: OwnedUiPromptSuggestionState): void {
  if (state.status === "idle") return;
  if (state.status !== "generating" && state.status !== "prepared" && state.status !== "available") {
    throw new TypeError("prompt-suggestion state is invalid");
  }
  assertOwnedUiPromptSuggestionIdentity(state.identity);
  if (state.status === "generating" && typeof state.settled !== "boolean") {
    throw new TypeError("prompt-suggestion settlement state is invalid");
  }
  if (state.status === "prepared" || state.status === "available") assertPromptSuggestionText(state.text, false);
}

export function assertOwnedUiSessionViewModel(view: OwnedUiSessionViewModel): void {
  if (view.contractVersion !== OWNED_UI_CONTRACT_VERSION) {
    throw new TypeError("unsupported owned-UI contract version");
  }
  assertId(view.sessionId, "owned-UI view session id");
  assertNonNegativeInteger(view.revision, "owned-UI view revision");
  assertEnum(view.lifecycle, LIFECYCLES, "owned-UI lifecycle");
  assertOwnedUiEditorState(view.editor);
  assertOwnedUiStatusView(view.status);
  assertOwnedUiTerminalSurface(view.terminal);
  if (view.activeModel !== null) {
    assertOwnedUiModelInfo(view.activeModel);
  }
  assertEnum(view.thinkingLevel, THINKING_LEVELS, "owned-UI thinking level");
  assertCollection(view.activeCommandIds, "owned-UI active commands", MAX_ACTIVE_COMMANDS);
  for (const commandId of view.activeCommandIds) assertId(commandId, "owned-UI active command id");
  if (view.dialog !== null) assertOwnedUiDialog(view.dialog);
  if (view.overlay !== null) assertOwnedUiOverlay(view.overlay);
  if (view.dialog !== null && view.terminal.focusedRegion !== "dialog") {
    throw new TypeError("an active owned-UI dialog must own dialog focus");
  }
  if (view.dialog === null && view.overlay !== null && view.terminal.focusedRegion !== "overlay") {
    throw new TypeError("an active owned-UI overlay must own overlay focus");
  }
  assertCollection(view.transcript, "owned-UI transcript blocks", MAX_BLOCKS);
  const blockIds = new Set<string>();
  for (const block of view.transcript) {
    assertOwnedUiTranscriptBlock(block);
    if (blockIds.has(block.id)) throw new TypeError(`duplicate owned-UI transcript block id: ${block.id}`);
    blockIds.add(block.id);
  }
  assertCollection(view.customizations, "owned-UI customizations", MAX_CUSTOMIZATIONS);
  assertUniqueCustomizations(view.customizations);
  for (const customization of view.customizations) assertOwnedUiCustomization(customization);
  assertCollection(view.diagnostics, "owned-UI diagnostics", MAX_DIAGNOSTICS);
  for (const diagnostic of view.diagnostics) assertOwnedUiDiagnostics(diagnostic);
  assertJsonBytes(view, "owned-UI session view", MAX_SESSION_VIEW_BYTES);
}

export function assertOwnedUiSnapshot(snapshot: OwnedUiSnapshot): void {
  if (snapshot.contractVersion !== OWNED_UI_CONTRACT_VERSION) {
    throw new TypeError("unsupported owned-UI snapshot contract version");
  }
  assertId(snapshot.snapshotId, "owned-UI snapshot id");
  assertId(snapshot.sessionId, "owned-UI snapshot session id");
  assertNonNegativeInteger(snapshot.sequence, "owned-UI snapshot sequence");
  assertOwnedUiSessionViewModel(snapshot.view);
  assertViewSession(snapshot.view, snapshot.sessionId);
  assertJsonBytes(snapshot, "owned-UI snapshot", MAX_SESSION_VIEW_BYTES);
}

export function assertOwnedUiCustomization(customization: OwnedUiCustomization): void {
  assertId(customization.id, "owned-UI customization id");
  assertEnum(customization.slot, SLOT_IDS, "owned-UI customization slot");
  assertIntegerInRange(customization.version, 1, Number.MAX_SAFE_INTEGER, "owned-UI customization version");
  assertIntegerInRange(customization.precedence, 0, 10_000, "owned-UI customization precedence");
  assertBoundedText(customization.label, "owned-UI customization label", MAX_LABEL_LENGTH);
  assertJsonObject(customization.payload, "owned-UI customization payload", MAX_PAYLOAD_BYTES);
}

export function assertOwnedUiTranscriptBlock(block: OwnedUiTranscriptBlock): void {
  assertId(block.id, "owned-UI transcript block id");
  assertEnum(block.kind, BLOCK_KINDS, "owned-UI transcript block kind");
  assertEnum(block.status, BLOCK_STATUSES, "owned-UI transcript block status");
  assertNonNegativeInteger(block.revision, "owned-UI transcript block revision");
  assertOptionalText(block.title, "owned-UI transcript block title", MAX_LABEL_LENGTH);
  assertPossiblyEmptyText(block.text, "owned-UI transcript block text", MAX_TEXT_BYTES);
  assertJsonValue(block.payload, "owned-UI transcript block payload", MAX_PAYLOAD_BYTES);
  if (block.imageReferences !== undefined) {
    assertCollection(block.imageReferences, "owned-UI transcript image references", 16);
    for (const reference of block.imageReferences) {
      assertId(reference.assetId, "owned-UI transcript image asset id");
      if (!/^image\/[a-z0-9.+-]+$/i.test(reference.mimeType)) throw new TypeError("owned-UI transcript image MIME type is invalid");
      assertIntegerInRange(reference.byteLength, 1, 20 * 1024 * 1024, "owned-UI transcript image byte length");
      assertEnum(reference.source, IMAGE_REFERENCE_SOURCES, "owned-UI transcript image source");
    }
  }
}

export function assertOwnedUiEditorState(editor: OwnedUiEditorState): void {
  assertPossiblyEmptyText(editor.text, "owned-UI editor text", MAX_TEXT_BYTES);
  assertCollection(editor.queuedSubmissions, "owned-UI queued submissions", MAX_QUEUE);
  let queuedBytes = 0;
  for (const submission of editor.queuedSubmissions) {
    assertBoundedText(submission, "owned-UI queued submission", MAX_TEXT_BYTES);
    queuedBytes += textBytes(submission);
  }
  if (queuedBytes > MAX_TEXT_BYTES) throw new RangeError("owned-UI queued submissions exceed their byte limit");
  assertIntegerInRange(editor.cursorOffset, 0, editor.text.length, "owned-UI editor cursor offset");
  assertNonNegativeInteger(editor.historyRevision, "owned-UI editor history revision");
  if (typeof editor.submitEnabled !== "boolean") throw new TypeError("owned-UI submit state is invalid");
  if (editor.selection !== null) {
    assertIntegerInRange(editor.selection.start, 0, editor.text.length, "owned-UI selection start");
    assertIntegerInRange(editor.selection.end, editor.selection.start, editor.text.length, "owned-UI selection end");
  }
}

export function assertOwnedUiStatusView(status: OwnedUiStatusView): void {
  assertBoundedText(status.title, "owned-UI status title", MAX_LABEL_LENGTH);
  assertOptionalText(status.workingMessage, "owned-UI working message", MAX_MESSAGE_LENGTH);
  assertCollection(status.diagnostics, "owned-UI status diagnostics", MAX_STATUS_DIAGNOSTICS);
  for (const diagnostic of status.diagnostics) {
    assertBoundedText(diagnostic, "owned-UI status diagnostic", MAX_MESSAGE_LENGTH);
  }
  assertCollection(status.badges, "owned-UI status badges", MAX_BADGES);
  for (const badge of status.badges) assertBoundedText(badge, "owned-UI status badge", MAX_LABEL_LENGTH);
  if (status.usage !== undefined) {
    for (const [name, value] of Object.entries({
      input: status.usage.input,
      output: status.usage.output,
      cacheRead: status.usage.cacheRead,
      cacheWrite: status.usage.cacheWrite,
      cost: status.usage.cost,
      contextWindow: status.usage.contextWindow,
    })) {
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new TypeError(`owned-UI usage ${name} is invalid`);
    }
    if (status.usage.latestCacheHitRate !== null
      && (typeof status.usage.latestCacheHitRate !== "number" || !Number.isFinite(status.usage.latestCacheHitRate))) {
      throw new TypeError("owned-UI cache-hit rate is invalid");
    }
    if (status.usage.latestPrompt !== undefined && status.usage.latestPrompt !== null) {
      for (const [name, value] of Object.entries(status.usage.latestPrompt)) {
        if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(`owned-UI latest prompt ${name} is invalid`);
      }
    }
    if (status.usage.contextAvailable !== undefined && typeof status.usage.contextAvailable !== "boolean") {
      throw new TypeError("owned-UI context availability is invalid");
    }
    if (status.usage.contextTokens !== null
      && (!Number.isSafeInteger(status.usage.contextTokens) || status.usage.contextTokens < 0)) {
      throw new TypeError("owned-UI context tokens are invalid");
    }
    if (status.usage.contextPercent !== null
      && (typeof status.usage.contextPercent !== "number" || !Number.isFinite(status.usage.contextPercent))) {
      throw new TypeError("owned-UI context percentage is invalid");
    }
    if (typeof status.usage.usingSubscription !== "boolean" || typeof status.usage.autoCompactEnabled !== "boolean") {
      throw new TypeError("owned-UI usage flags are invalid");
    }
  }
  if (status.footer !== undefined) {
    assertOptionalText(status.footer.branch, "owned-UI footer branch", MAX_LABEL_LENGTH);
    assertOptionalText(status.footer.sessionName, "owned-UI footer session name", MAX_LABEL_LENGTH);
    assertIntegerInRange(status.footer.availableProviderCount, 0, 1_000, "owned-UI footer provider count");
    assertCollection(status.footer.extensionStatuses, "owned-UI footer extension statuses", MAX_BADGES);
    for (const entry of status.footer.extensionStatuses) {
      if (!Array.isArray(entry) || entry.length !== 2) throw new TypeError("owned-UI footer extension status is invalid");
      assertBoundedText(entry[0], "owned-UI footer extension id", MAX_LABEL_LENGTH);
      assertBoundedText(entry[1], "owned-UI footer extension value", MAX_LABEL_LENGTH);
    }
  }
}

export function assertOwnedUiTerminalSurface(surface: OwnedUiTerminalSurface): void {
  assertIntegerInRange(surface.columns, 20, 500, "owned-UI terminal columns");
  assertIntegerInRange(surface.rows, 8, 300, "owned-UI terminal rows");
  assertEnum(surface.focusedRegion, FOCUSED_REGIONS, "owned-UI focused region");
  if (typeof surface.hardwareCursor !== "boolean") throw new TypeError("owned-UI hardware-cursor state is invalid");
}

export function assertOwnedUiDiagnostics(diagnostic: OwnedUiDiagnostics): void {
  assertNonNegativeInteger(diagnostic.sequence, "owned-UI diagnostic sequence");
  assertId(diagnostic.code, "owned-UI diagnostic code");
  assertEnum(diagnostic.severity, SEVERITIES, "owned-UI diagnostic severity");
  assertBoundedText(diagnostic.message, "owned-UI diagnostic message", MAX_MESSAGE_LENGTH);
  if (typeof diagnostic.recoverable !== "boolean") throw new TypeError("owned-UI diagnostic recoverability is invalid");
}

function assertOwnedUiModelInfo(model: { readonly providerId: string; readonly modelId: string; readonly displayName: string }): void {
  assertId(model.providerId, "owned-UI provider id");
  assertId(model.modelId, "owned-UI model id");
  assertBoundedText(model.displayName, "owned-UI model display name", MAX_LABEL_LENGTH);
}

function assertOwnedUiDialog(dialog: OwnedUiDialog): void {
  assertId(dialog.id, "owned-UI dialog id");
  assertBoundedText(dialog.title, "owned-UI dialog title", MAX_LABEL_LENGTH);
  assertEnum(dialog.kind, DIALOG_KINDS, "owned-UI dialog kind");
  assertJsonValue(dialog.payload, "owned-UI dialog payload", MAX_PAYLOAD_BYTES);
}

function assertOwnedUiOverlay(overlay: OwnedUiOverlay): void {
  assertId(overlay.id, "owned-UI overlay id");
  assertId(overlay.componentSlotId, "owned-UI overlay component slot id");
  assertEnum(overlay.placement, OVERLAY_PLACEMENTS, "owned-UI overlay placement");
  if (typeof overlay.modal !== "boolean") throw new TypeError("owned-UI overlay modal state is invalid");
  assertJsonValue(overlay.payload, "owned-UI overlay payload", MAX_PAYLOAD_BYTES);
}

function assertUniqueCustomizations(customizations: readonly OwnedUiCustomization[]): void {
  const ids = new Set<string>();
  for (const customization of customizations) {
    if (ids.has(customization.id)) throw new TypeError(`duplicate owned-UI customization id: ${customization.id}`);
    ids.add(customization.id);
  }
}

function assertViewSession(view: OwnedUiSessionViewModel, sessionId: string): void {
  if (view.sessionId !== sessionId) throw new TypeError("owned-UI view session identity does not match its envelope");
}

function assertEnum(value: string, allowed: ReadonlySet<string>, name: string): void {
  if (typeof value !== "string" || !allowed.has(value)) throw new TypeError(`${name} is invalid`);
}

function assertId(value: string, name: string): void {
  assertBoundedText(value, name, MAX_ID_LENGTH);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value)) throw new TypeError(`${name} contains unsupported characters`);
}

function assertBoundedText(value: string, name: string, maximumBytes: number): void {
  if (typeof value !== "string" || value.length === 0 || value.includes("\0") || textBytes(value) > maximumBytes) {
    throw new TypeError(`${name} is invalid`);
  }
}

function assertPossiblyEmptyText(value: string, name: string, maximumBytes: number): void {
  if (typeof value !== "string" || value.includes("\0") || textBytes(value) > maximumBytes) {
    throw new TypeError(`${name} is invalid`);
  }
}

function assertOptionalText(value: string | null, name: string, maximumBytes: number): void {
  if (value === null) return;
  assertBoundedText(value, name, maximumBytes);
}

function assertPromptSuggestionText(value: string | null, allowEmpty: boolean): void {
  if (value === null) return;
  if (typeof value !== "string" || value.includes("\0") || (!allowEmpty && value.length === 0) || [...value].length >= 100) {
    throw new TypeError("prompt-suggestion text is invalid");
  }
}

function assertCollection(value: readonly unknown[], name: string, maximum: number): void {
  if (!Array.isArray(value) || value.length > maximum) throw new RangeError(`${name} exceeds its maximum length`);
}

function assertNonNegativeInteger(value: number, name: string): void {
  assertIntegerInRange(value, 0, Number.MAX_SAFE_INTEGER, name);
}

function assertIntegerInRange(value: number, minimum: number, maximum: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${name} must be an integer from ${minimum} to ${maximum}`);
  }
}

function assertJsonObject(value: unknown, name: string, maximumBytes: number): void {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`);
  }
  assertJsonValue(value, name, maximumBytes);
}

function assertJsonValue(value: unknown, name: string, maximumBytes: number): void {
  let encoded: string | undefined;
  try {
    encoded = JSON.stringify(value);
  } catch {
    throw new TypeError(`${name} must be JSON serializable`);
  }
  if (encoded === undefined) throw new TypeError(`${name} must be JSON serializable`);
  if (textBytes(encoded) > maximumBytes) throw new RangeError(`${name} exceeds its byte limit`);
}

function assertJsonBytes(value: unknown, name: string, maximumBytes: number): void {
  assertJsonValue(value, name, maximumBytes);
}

function textBytes(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

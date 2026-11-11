import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { isRecord, readModel, readThinkingLevel, requireCapability, stringProperty } from "./message-values.js";
import type { AgentSession, AgentSessionRuntime } from "../startup-public.js";
import {
  AUTH_REFRESH_TIMEOUT_MS,
  errorMessage,
  findExactWorkflowModel,
  pathArgument,
  pinnedHotkeySummary,
  pinnedSessionInfoPresentation,
  workflowConfirmation,
  workflowResult,
} from "./workflow-support.js";
import type { PiProviderAuthentication } from "./provider-authentication.js";
import type { PiWorkflowContexts } from "./workflow-contexts.js";
import type { OwnedUiModelInfo, OwnedUiSnapshot, OwnedUiThinkingLevel } from "../../../contracts/owned-ui/index.js";
import type {
  PiBashWorkflowResult,
  PiWorkflowHost,
  PiWorkflowInteractionHost,
  PiWorkflowMessage,
  PiWorkflowRequest,
  PiWorkflowResult,
} from "./workflows.js";

type PiSessionApi = AgentSession;
type PiRuntimeApi = AgentSessionRuntime;
type PiWorkflowModel = ReturnType<PiRuntimeApi["services"]["modelRuntime"]["getAvailableSnapshot"]>[number];

/** How many workflows and engine commands may be admitted together before new work is rejected. */
const MAX_PENDING_WORK = 32;

interface PiWorkflowRunnerOptions {
  readonly productMode?: "bare" | "comparison";
  readonly agentDir: string;
  readonly host: PiWorkflowHost;
  readonly contexts: PiWorkflowContexts;
}

export interface PiWorkflowRunnerPorts {
  session(): PiSessionApi | undefined;
  runtime(): PiRuntimeApi | undefined;
  disposed(): boolean;
  sessionGeneration(): number;
  /** The owned UI's prompt/notify host for login flows; the adapter swaps it when the shell binds. */
  interaction(): PiWorkflowInteractionHost;
  /** True while the adapter refuses new work: delivery overload, stopped admission, or disposal. */
  admissionStopped(): boolean;
  /** Engine commands currently admitted; they share the admission budget with workflows. */
  pendingCommandCount(): number;
  beginRunning(): void;
  endRunning(): void;
  activeModel(): OwnedUiModelInfo | null;
  setActiveModel(model: OwnedUiModelInfo): void;
  thinkingLevel(): OwnedUiThinkingLevel;
  setThinkingLevel(level: OwnedUiThinkingLevel): void;
  emitView(): void;
  reconcileActiveModelAvailability(): void;
  bindExtensionUiToSession(): Promise<void>;
  applyPinnedSetting(selection: string): Promise<PiWorkflowResult>;
  snapshot(): OwnedUiSnapshot;
  dispose(): Promise<void>;
}

/**
 * Pinned Pi's slash-command workflows, run against the adapter's current session and runtime
 * through ports. The runner owns workflow admission (the pending set and its cancellation), the
 * clipboard writer the owned UI binds, provider authentication, and the per-command result
 * wording; the adapter decides what the session is, how the view is published, and when work is
 * refused, and the contexts collaborator supplies selector state.
 */
export class PiWorkflowRunner {
  readonly #agentDir: string;
  readonly #bare: boolean;
  readonly #host: PiWorkflowHost;
  readonly #authentication: () => Promise<PiProviderAuthentication>;
  readonly #ports: PiWorkflowRunnerPorts;
  readonly #pending = new Set<{ command: PiWorkflowRequest["command"]; cancel(): void }>();
  #clipboardWriter: ((text: string) => Promise<boolean>) | undefined;

  constructor(options: PiWorkflowRunnerOptions, ports: PiWorkflowRunnerPorts) {
    this.#agentDir = options.agentDir;
    this.#bare = options.productMode === "bare";
    this.#host = options.host;
    this.#ports = ports;
    let authentication: Promise<PiProviderAuthentication> | undefined;
    this.#authentication = () => authentication ??= import("./provider-authentication.js").then(({ PiProviderAuthentication }) => new PiProviderAuthentication({ agentDir: options.agentDir, contexts: options.contexts }, {
      runtime: () => ports.runtime(),
      requireSession: () => this.#requireSession(),
      disposed: () => ports.disposed(),
      sessionGeneration: () => ports.sessionGeneration(),
      interaction: () => ports.interaction(),
      setActiveModel: model => { ports.setActiveModel(model); },
      reconcileActiveModelAvailability: () => { ports.reconcileActiveModelAvailability(); },
      emitView: () => { ports.emitView(); },
    }));
  }

  /** Workflows admitted and not yet settled. */
  get pendingCount(): number {
    return this.#pending.size;
  }

  /** Resolve every admitted workflow as cancelled, except the named command. */
  cancelPending(except?: PiWorkflowRequest["command"]): void {
    for (const pending of this.#pending) if (pending.command !== except) pending.cancel();
  }

  /** Presentation pressure must not cancel an independently applied state mutation. */
  cancelForDelivery(): void {
    const mutations = new Set<PiWorkflowRequest["command"]>(["model", "models", "thinking", "scoped-models", "name"]);
    for (const pending of this.#pending) if (!mutations.has(pending.command)) pending.cancel();
  }

  #requireSession(): PiSessionApi {
    const session = this.#ports.session();
    if (this.#ports.disposed() || !this.#ports.runtime() || !session) throw new Error("engine adapter is not running");
    return session;
  }

  async cycleModelWorkflow(direction: "forward" | "backward"): Promise<PiWorkflowResult> {
    try {
      const session = this.#requireSession();
      const result = await requireCapability(session.cycleModel, "cycleModel").call(session, direction);
      if (!isRecord(result) || !isRecord(result.model)) {
        const scoped = Array.isArray(session.scopedModels) && session.scopedModels.length > 0;
        return workflowResult("model", "completed", scoped ? "Only one model in scope" : "Only one model available", undefined, "status");
      }
      const model = readModel(result.model);
      if (model) this.#ports.setActiveModel(model);
      if (result.thinkingLevel !== undefined) this.#ports.setThinkingLevel(readThinkingLevel(result.thinkingLevel));
      this.#ports.emitView();
      const modelName = stringProperty(result.model, "name") ?? stringProperty(result.model, "id") ?? "model";
      const reasoning = result.model.reasoning === true;
      const thinking = this.#ports.thinkingLevel();
      const suffix = reasoning && thinking !== "off" ? ` (thinking: ${thinking})` : "";
      return { ...workflowResult("model", "completed", `Switched to ${modelName}${suffix}`, undefined, "status"), presentation: { kind: "model-change" } };
    } catch (error) {
      return workflowResult("model", "failed", error instanceof Error ? error.message : String(error));
    }
  }

  /** Bind the owned UI's clipboard lifecycle without changing the comparison host. True means acknowledged delivery. */
  bindClipboardWriter(writer: (text: string) => Promise<boolean>): () => void {
    const previous = this.#clipboardWriter;
    this.#clipboardWriter = writer;
    return () => { if (this.#clipboardWriter === writer) this.#clipboardWriter = previous; };
  }

  /** Workflow and tree copying share the active owner's write fence and delivery acknowledgment. */
  async copyWorkflowText(text: string): Promise<boolean> {
    if (this.#clipboardWriter !== undefined) return this.#clipboardWriter(text);
    await this.#host.copyText(text);
    return true;
  }

  async executeBashWorkflow(command: string, excludeFromContext: boolean): Promise<PiBashWorkflowResult> {
    const session = this.#requireSession();
    const result = await requireCapability(session.executeBash, "executeBash").call(session, command, undefined, { excludeFromContext });
    if (!isRecord(result)) throw new Error("Pi bash workflow returned a malformed result");
    return {
      command,
      output: typeof result.output === "string" ? result.output : "",
      exitCode: typeof result.exitCode === "number" ? result.exitCode : undefined,
      cancelled: result.cancelled === true,
      truncated: result.truncated === true,
      excludeFromContext,
    };
  }

  reloadBlockedResult(): PiWorkflowResult | null {
    const session = this.#requireSession();
    if (session.isStreaming) return workflowResult("reload", "failed", "Wait for the current response to finish before reloading.", undefined, "warning");
    if (session.isCompacting) return workflowResult("reload", "failed", "Wait for compaction to finish before reloading.", undefined, "warning");
    return null;
  }

  async executeWorkflow(request: PiWorkflowRequest): Promise<PiWorkflowResult> {
    const cancelled = workflowResult(request.command, "cancelled", "", undefined, "silent");
    if (request.command !== "quit" && (this.#ports.admissionStopped() || this.#ports.pendingCommandCount() + this.#pending.size >= MAX_PENDING_WORK)) return cancelled;
    let cancel!: () => void;
    const cancellation = new Promise<PiWorkflowResult>(resolve => { cancel = () => resolve(cancelled); });
    const pending = { command: request.command, cancel };
    this.#pending.add(pending); this.#ports.beginRunning();
    const operation = this.#runWorkflow(request).finally(() => { this.#ports.endRunning(); });
    try { return await Promise.race([operation, cancellation]); }
    finally { this.#pending.delete(pending); }
  }

  async #runWorkflow(request: PiWorkflowRequest): Promise<PiWorkflowResult> {
    try {
      return await this.#performWorkflow(request);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const contextualMessage = request.command === "export"
        ? `Failed to export session: ${errorMessage(error, "Unknown error")}`
        : request.command === "import"
          ? `Failed to import session: ${message}`
          : request.command === "new"
            ? `Failed to create session: ${message}`
            : request.command === "resume"
              ? `Failed to resume session: ${message}`
              : request.command === "reload" ? `Reload failed: ${message}` : message;
      return workflowResult(request.command, "failed", contextualMessage);
    }
  }

  async #selectModel(
    request: PiWorkflowRequest,
    reference: string,
    options: {
      readonly pool: readonly PiWorkflowModel[];
      readonly refreshOnMiss: boolean;
      readonly persist: boolean;
      /** Whether an unmatched reference asks the owned selector to open or fails outright. */
      readonly onMiss: "requires-selection" | "failed";
    },
  ): Promise<PiWorkflowResult> {
    const session = this.#requireSession();
    const runtime = this.#ports.runtime();
    if (!runtime) throw new Error("engine runtime is unavailable");
    let model = findExactWorkflowModel(reference, options.pool);
    const messages: PiWorkflowMessage[] = [];
    const generation = this.#ports.sessionGeneration();
    const current = () => !this.#ports.disposed() && generation === this.#ports.sessionGeneration();
    const publish = (message: PiWorkflowMessage) => {
      if (!current()) return;
      const interaction = this.#ports.interaction();
      if (interaction.publish) interaction.publish(message);
      else messages.push(message);
    };
    if (model === undefined && options.refreshOnMiss) {
      publish({ kind: "status", message: "Refreshing model catalogs…" });
      const controller = new AbortController();
      let timedOut = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, AUTH_REFRESH_TIMEOUT_MS);
      try {
        const refreshed = await runtime.services.modelRuntime.refresh?.({ signal: controller.signal });
        if (isRecord(refreshed) && refreshed.aborted === true && timedOut) {
          publish({ kind: "warning", message: "Model refresh timed out; searching cached models." });
        } else if (isRecord(refreshed) && refreshed.errors instanceof Map && refreshed.errors.size > 0) {
          publish({ kind: "warning", message: `Could not refresh ${[...refreshed.errors.keys()].join(", ")}; searching cached models.` });
        }
      } catch (error) {
        publish({
          kind: "warning",
          message: timedOut
            ? "Model refresh timed out; searching cached models."
            : `Could not refresh model catalogs: ${error instanceof Error ? error.message : String(error)}`,
        });
      } finally {
        clearTimeout(timeout);
      }
      model = findExactWorkflowModel(reference, [...(runtime.services.modelRuntime.getAvailableSnapshot?.() ?? [])]);
    }
    if (!current()) return workflowResult(request.command, "cancelled", "Model selection cancelled", undefined, "silent");
    if (model === undefined) {
      if (options.onMiss === "failed") {
        const failure: PiWorkflowMessage = { kind: "error", message: `Model not found: ${reference}` };
        return workflowResult(request.command, "failed", failure.message, undefined, "error", messages.length === 0 ? undefined : [...messages, failure]);
      }
      return {
        ...workflowResult(request.command, "requires-selection", "Select a model", reference, "silent"),
        ...(messages.length === 0 ? {} : { messages: Object.freeze(messages) }),
      };
    }
    try {
      await session.setModel(model, { persist: options.persist });
    } catch (error) {
      if (!current()) return workflowResult(request.command, "cancelled", "Model selection cancelled", undefined, "silent");
      const failure: PiWorkflowMessage = { kind: "error", message: error instanceof Error ? error.message : String(error) };
      return workflowResult(request.command, "failed", failure.message, undefined, "error", messages.length === 0 ? undefined : [...messages, failure]);
    }
    const providerId = stringProperty(model, "provider") ?? "unknown";
    const modelId = stringProperty(model, "id") ?? reference;
    // Invariant: selection already applied. A delivery-generation change cannot undo it; a replaced
    // session must not receive its view, but the operation result remains truthful.
    if (!this.#ports.disposed() && session === this.#ports.session()) {
      this.#ports.setActiveModel({ providerId, modelId, displayName: stringProperty(model, "name") ?? modelId });
      this.#ports.emitView();
    }
    const resultMessage: PiWorkflowMessage = { kind: "status", message: options.persist ? `Default model: ${providerId}/${modelId}` : `Model: ${modelId}` };
    const result = messages.length === 0
      ? workflowResult(request.command, "completed", resultMessage.message)
      : workflowResult(request.command, "completed", resultMessage.message, undefined, "status", [...messages, resultMessage]);
    return { ...result, presentation: { kind: "model-change" } };
  }

  async #performWorkflow(request: PiWorkflowRequest): Promise<PiWorkflowResult> {
    const session = this.#requireSession();
    const runtime = this.#ports.runtime();
    if (!runtime) throw new Error("engine runtime is unavailable");
    const selected = request.selection?.trim();
    const call: PiWorkflowCall = { request, session, runtime, argument: request.argument.trim(), selection: selected && selected.length > 0 ? selected : undefined };
    const { command } = request;
    const { argument, selection } = call;

    switch (command) {
      case "settings": return selection ? await this.#ports.applyPinnedSetting(selection) : workflowResult(command, "failed", "Settings requires the owned settings controller");
      case "thinking": return thinkingWorkflow(call, this.#ports);
      case "model": return this.#modelWorkflow(call);
      case "models": return this.#modelsWorkflow(call);
      case "scoped-models": return scopedModelsWorkflow(call);
      case "export": return (await import("./workflow-export.js")).exportWorkflow(request, session, this.#bare, this.#host.reserveExport);
      case "import": return importWorkflow(call);
      case "share": return (await import("./workflow-share.js")).runShareWorkflow({ request, session, runtime, host: this.#host });
      case "copy": return copyWorkflow(call, text => this.copyWorkflowText(text));
      case "name": return nameWorkflow(call, this.#ports);
      case "session": return sessionInfoWorkflow(call);
      case "changelog": return workflowResult(command, "completed", "What's New", await this.#host.readChangelog());
      case "hotkeys": return workflowResult(command, "completed", "Keyboard Shortcuts", pinnedHotkeySummary());
      case "fork": return forkWorkflow(call);
      case "clone": return cloneWorkflow(call);
      case "tree": return treeWorkflow(call);
      case "trust": return trustWorkflow(call);
      case "login":
      case "logout": {
        const generation = this.#ports.sessionGeneration();
        const authentication = await this.#authentication();
        if (this.#ports.disposed() || generation !== this.#ports.sessionGeneration() || this.#ports.admissionStopped()) return workflowResult(command, "cancelled", "", undefined, "silent");
        return command === "login" ? authentication.login(request, session, runtime, argument, selection)
          : selection ? authentication.logout(request, runtime, selection) : workflowResult(command, "failed", "Logout requires the owned authentication controller");
      }
      case "new": return newSessionWorkflow(call);
      case "compact": return compactWorkflow(call);
      case "resume": return resumeWorkflow(call);
      case "reload": return this.#reloadWorkflow(call);
      case "quit": return this.#ports.dispose().then(() => workflowResult(command, "completed", "Shutdown complete"));
      case "debug": return this.#debugWorkflow(request);
      case "arminsayshi": return workflowResult(command, "completed", "Armin says hi");
      case "dementedelves": return workflowResult(command, "completed", "Demented elves announcement");
    }
  }

  #modelWorkflow({ request, session, runtime, argument, selection }: PiWorkflowCall): Promise<PiWorkflowResult> {
    const reference = selection ?? argument;
    if (!reference) return Promise.resolve(workflowResult(request.command, "failed", "Model requires the owned model controller"));
    const scopedModels = Array.isArray(session.scopedModels)
      ? session.scopedModels.map(item => item.model)
      : [];
    // Compatibility: pinned Pi searches the session scope when one exists and refreshes catalogs only for an unscoped miss.
    return this.#selectModel(request, reference, {
      pool: scopedModels.length > 0 ? scopedModels : [...(runtime.services.modelRuntime.getAvailableSnapshot?.() ?? [])],
      refreshOnMiss: scopedModels.length === 0,
      persist: request.persist === true,
      onMiss: "requires-selection",
    });
  }

  #modelsWorkflow({ request, runtime, argument, selection }: PiWorkflowCall): Promise<PiWorkflowResult> {
    // Invariant: the bare dialog seeds its query from the argument; only an explicit selection switches the current session.
    if (!selection) return Promise.resolve(workflowResult(request.command, "requires-selection", "Select a model", argument || undefined, "silent"));
    return this.#selectModel(request, selection, {
      pool: [...(runtime.services.modelRuntime.getAvailableSnapshot?.() ?? [])],
      refreshOnMiss: true,
      persist: false,
      onMiss: "failed",
    });
  }

  async #reloadWorkflow({ request, session, runtime }: PiWorkflowCall): Promise<PiWorkflowResult> {
    const blocked = this.reloadBlockedResult();
    if (blocked) return blocked;
    await requireCapability(session.reload, "reload").call(session);
    await this.#ports.bindExtensionUiToSession();
    const message = "Reloaded keybindings, extensions, skills, prompts, themes, and context files";
    const modelError = runtime.services.modelRuntime.getError?.();
    return workflowResult(request.command, "completed", message, undefined, "status", modelError ? [
      { kind: "error", message: `models.json error: ${modelError}` },
      { kind: "status", message },
    ] : undefined);
  }

  async #debugWorkflow(request: PiWorkflowRequest): Promise<PiWorkflowResult> {
    const debugPath = join(this.#agentDir, "pi-debug.log");
    await mkdir(dirname(debugPath), { recursive: true });
    await writeFile(debugPath, `${JSON.stringify(this.#ports.snapshot(), null, 2)}\n`, "utf8");
    return workflowResult(request.command, "completed", "✓ Debug log written", debugPath);
  }
}

/** One admitted workflow request with the session and runtime it runs against and its trimmed inputs. */
interface PiWorkflowCall {
  readonly request: PiWorkflowRequest;
  readonly session: PiSessionApi;
  readonly runtime: PiRuntimeApi;
  readonly argument: string;
  readonly selection: string | undefined;
}

function thinkingWorkflow(
  { request, session, argument, selection }: PiWorkflowCall,
  ports: Pick<PiWorkflowRunnerPorts, "setThinkingLevel" | "emitView">,
): PiWorkflowResult {
  const requested = (selection ?? argument).trim();
  if (!requested) return workflowResult(request.command, "requires-selection", "Select a thinking level", undefined, "silent");
  const available = (session.getAvailableThinkingLevels?.() ?? []).map(String);
  // Compatibility: pinned Pi matches the argument case-insensitively and words the failure with the available levels.
  const level = available.find(candidate => candidate.toLowerCase() === requested.toLowerCase());
  if (level === undefined) {
    return workflowResult(request.command, "failed", `Unknown thinking level "${requested}". Available levels: ${available.join(", ")}.`);
  }
  try {
    session.setThinkingLevel(readThinkingLevel(level), { persist: request.persist === true });
  } catch (error) {
    return workflowResult(request.command, "failed", error instanceof Error ? error.message : String(error));
  }
  ports.setThinkingLevel(readThinkingLevel(session.thinkingLevel));
  ports.emitView();
  return workflowResult(request.command, "completed", request.persist === true ? `Default thinking level: ${level}` : `Thinking level: ${level}`);
}

function scopedModelsWorkflow({ request, session, runtime, selection }: PiWorkflowCall): PiWorkflowResult {
  if (!selection) return workflowResult(request.command, "failed", "Scoped models requires the owned scoped-model controller");
  const [providerId, modelId] = selection.split("/", 2);
  const model = providerId && modelId ? runtime.services.modelRuntime.getModel(providerId, modelId) : undefined;
  if (!model) return workflowResult(request.command, "failed", `Model is unavailable: ${selection}`);
  requireCapability(session.setScopedModels, "setScopedModels").call(session, [{ model }]);
  return workflowResult(request.command, "completed", `Enabled scoped model ${selection}`);
}

async function importWorkflow({ request, runtime, argument }: PiWorkflowCall): Promise<PiWorkflowResult> {
  const path = pathArgument(argument);
  if (!path) return workflowResult(request.command, "failed", "Usage: /import <path.jsonl>");
  if (request.confirmed === undefined) {
    return workflowConfirmation(request.command, `Replace current session with ${path}?`);
  }
  if (!request.confirmed) return workflowResult(request.command, "cancelled", "Import cancelled", undefined, "status");
  try {
    const result = await requireCapability(runtime.importFromJsonl, "importFromJsonl").call(runtime, path, request.cwdOverride);
    if (isRecord(result) && result.cancelled === true) return workflowResult(request.command, "cancelled", "Import cancelled", undefined, "status");
    return workflowResult(request.command, "completed", `Session imported from: ${path}`);
  } catch (error) {
    const issue = isRecord(error) && isRecord(error.issue) ? error.issue : undefined;
    const fallbackCwd = issue === undefined ? undefined : stringProperty(issue, "fallbackCwd");
    if (fallbackCwd !== undefined && request.cwdOverride === undefined) {
      const sessionCwd = stringProperty(issue, "sessionCwd") ?? "the session working directory";
      return workflowConfirmation(
        request.command,
        `cwd from session file does not exist\n${sessionCwd}\n\ncontinue in current cwd\n${fallbackCwd}`,
        fallbackCwd,
      );
    }
    throw error;
  }
}

async function copyWorkflow({ request, session }: PiWorkflowCall, copy: (text: string) => Promise<boolean>): Promise<PiWorkflowResult> {
  const text = requireCapability(session.getLastAssistantText, "getLastAssistantText").call(session);
  if (typeof text !== "string" || text.length === 0) return workflowResult(request.command, "completed", "", undefined, "silent");
  const acknowledged = await copy(text);
  return workflowResult(request.command, "completed", acknowledged ? "Copied last agent message to clipboard" : "Submitted last agent message to clipboard");
}

function nameWorkflow({ request, session, argument }: PiWorkflowCall, ports: Pick<PiWorkflowRunnerPorts, "emitView">): PiWorkflowResult {
  const manager = session.sessionManager;
  if (!argument) {
    const current = manager?.getSessionName();
    return typeof current === "string"
      ? workflowResult(request.command, "completed", `Session name: ${current}`)
      : workflowResult(request.command, "failed", "Usage: /name <name>", undefined, "warning");
  }
  requireCapability(session.setSessionName, "setSessionName").call(session, argument);
  ports.emitView();
  const actual = sessionNameOr(manager?.getSessionName(), argument);
  return workflowResult(
    request.command,
    "completed",
    `Session name set: ${actual}`,
    actual === argument ? undefined : `Session name was normalized from ${JSON.stringify(argument)} to ${JSON.stringify(actual)}`,
  );
}

function sessionInfoWorkflow({ request, session, runtime }: PiWorkflowCall): PiWorkflowResult {
  const manager = session.sessionManager;
  const stats = requireCapability(session.getSessionStats, "getSessionStats").call(session);
  const entries = manager?.getEntries();
  return {
    ...workflowResult(request.command, "completed", "Session Info"),
    presentation: pinnedSessionInfoPresentation(
      stats,
      manager?.getSessionName(),
      Array.isArray(entries) ? entries : [],
      runtime.services.modelRuntime,
      {
        mode: runtime.services.settingsManager?.getCacheWarmingMode?.(),
        status: (session as { cacheWarmingStatus?: unknown }).cacheWarmingStatus,
      },
    ),
  };
}

async function forkWorkflow({ request, runtime, selection }: PiWorkflowCall): Promise<PiWorkflowResult> {
  if (!selection) return workflowResult(request.command, "failed", "Fork requires the owned user-message controller");
  const result = await requireCapability(runtime.fork, "fork").call(runtime, selection, { position: "before" });
  if (isRecord(result) && result.cancelled === true) return workflowResult(request.command, "cancelled", "Fork cancelled", undefined, "silent");
  return workflowResult(request.command, "completed", "Forked to new session");
}

async function cloneWorkflow({ request, session, runtime }: PiWorkflowCall): Promise<PiWorkflowResult> {
  const leaf = session.sessionManager?.getLeafId?.();
  if (typeof leaf !== "string") return workflowResult(request.command, "completed", "Nothing to clone yet", undefined, "status");
  const result = await requireCapability(runtime.fork, "fork").call(runtime, leaf, { position: "at" });
  if (isRecord(result) && result.cancelled === true) return workflowResult(request.command, "cancelled", "Clone cancelled", undefined, "silent");
  return workflowResult(request.command, "completed", "Cloned to new session");
}

async function treeWorkflow({ request, session, selection }: PiWorkflowCall): Promise<PiWorkflowResult> {
  if (!selection) return workflowResult(request.command, "failed", "Tree navigation requires the owned tree controller");
  const navigateTree = requireCapability(session.navigateTree, "navigateTree");
  const result = request.treeSummary === undefined
    ? await navigateTree.call(session, selection)
    : await navigateTree.call(session, selection, {
        summarize: request.treeSummary.summarize,
        ...(request.treeSummary.customInstructions === undefined ? {} : { customInstructions: request.treeSummary.customInstructions }),
      });
  if (isRecord(result) && result.aborted === true) return workflowResult(request.command, "cancelled", "Branch summarization cancelled", undefined, "status");
  if (isRecord(result) && result.cancelled === true) return workflowResult(request.command, "cancelled", "Navigation cancelled", undefined, "status");
  const editorText = isRecord(result) && typeof result.editorText === "string" ? result.editorText : undefined;
  return workflowResult(request.command, "completed", "Navigated to selected point", editorText);
}

function trustWorkflow({ request, runtime, selection }: PiWorkflowCall): PiWorkflowResult {
  if (!selection) return workflowResult(request.command, "failed", "Trust requires the owned trust controller");
  requireCapability(runtime.services.settingsManager?.setProjectTrusted, "setProjectTrusted").call(runtime.services.settingsManager, selection === "trust");
  return workflowResult(request.command, "completed", selection === "trust" ? "Project trusted" : "Project trust removed");
}

async function newSessionWorkflow({ request, runtime }: PiWorkflowCall): Promise<PiWorkflowResult> {
  const result = await runtime.newSession();
  if (isRecord(result) && result.cancelled === true) return workflowResult(request.command, "cancelled", "New session cancelled", undefined, "silent");
  return workflowResult(request.command, "completed", "✓ New session started", undefined, "accent");
}

async function compactWorkflow({ request, session, argument }: PiWorkflowCall): Promise<PiWorkflowResult> {
  try {
    await session.compact(argument || undefined);
    return workflowResult(request.command, "completed", "Compaction requested", undefined, "silent");
  } catch (error) {
    return workflowResult(request.command, "failed", error instanceof Error ? error.message : String(error));
  }
}

async function resumeWorkflow({ request, runtime, argument, selection }: PiWorkflowCall): Promise<PiWorkflowResult> {
  if (!selection && !argument) return workflowResult(request.command, "failed", "Resume requires the owned session controller");
  const sessionPath = selection ?? argument;
  try {
    const result = await runtime.switchSession(sessionPath);
    if (isRecord(result) && result.cancelled === true) return workflowResult(request.command, "cancelled", "Resume cancelled", undefined, "silent");
    return workflowResult(request.command, "completed", "Resumed session");
  } catch (error) {
    const issue = isRecord(error) && isRecord(error.issue) ? error.issue : undefined;
    const fallbackCwd = issue === undefined ? undefined : stringProperty(issue, "fallbackCwd");
    if (fallbackCwd === undefined) throw error;
    if (request.confirmed === undefined) {
      const sessionCwd = stringProperty(issue, "sessionCwd") ?? "the session working directory";
      return workflowConfirmation(request.command, `cwd from session file does not exist\n${sessionCwd}\n\ncontinue in current cwd\n${fallbackCwd}`);
    }
    if (!request.confirmed) return workflowResult(request.command, "cancelled", "Resume cancelled", undefined, "status");
    const result = await runtime.switchSession(sessionPath, { cwdOverride: fallbackCwd });
    if (isRecord(result) && result.cancelled === true) return workflowResult(request.command, "cancelled", "Resume cancelled", undefined, "silent");
    return workflowResult(request.command, "completed", "Resumed session in current cwd");
  }
}

/**
 * The name the session normalized the request to, or the request when it reports none. `/name`
 * publishes a view right after setting it, so the footer shows the new name at once.
 */
function sessionNameOr(normalized: unknown, requested: string): string {
  return typeof normalized === "string" ? normalized : requested;
}

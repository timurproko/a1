import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { PRODUCT_IDENTITY } from "../../../product-identity.js";
import { isRecord, readModel, readThinkingLevel, requireCapability, stringProperty } from "./message-values.js";
import { CredentialSynchronizationError, type AgentSession, type AgentSessionRuntime } from "../startup-public.js";
import {
  AUTH_REFRESH_TIMEOUT_MS,
  commandMissing,
  errorMessage,
  findExactWorkflowModel,
  isAbortError,
  isUnknownModel,
  pathArgument,
  PINNED_DEFAULT_MODEL_BY_PROVIDER,
  pinnedHotkeySummary,
  pinnedSessionInfoPresentation,
  shareCommandFailureDetail,
  shareViewerUrl,
  workflowConfirmation,
  workflowLoginNotification,
  workflowResult,
} from "./workflow-support.js";
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

/** How many workflows and engine commands may be admitted together before new work is rejected. */
const MAX_PENDING_WORK = 32;

export interface PiWorkflowRunnerOptions {
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
  readonly #host: PiWorkflowHost;
  readonly #contexts: PiWorkflowContexts;
  readonly #ports: PiWorkflowRunnerPorts;
  readonly #pending = new Set<{ command: PiWorkflowRequest["command"]; cancel(): void }>();
  #clipboardWriter: ((text: string) => Promise<boolean>) | undefined;

  constructor(options: PiWorkflowRunnerOptions, ports: PiWorkflowRunnerPorts) {
    this.#agentDir = options.agentDir;
    this.#host = options.host;
    this.#contexts = options.contexts;
    this.#ports = ports;
  }

  /** Workflows admitted and not yet settled. */
  get pendingCount(): number {
    return this.#pending.size;
  }

  /** Resolve every admitted workflow as cancelled, except the named command. */
  cancelPending(except?: PiWorkflowRequest["command"]): void {
    for (const pending of this.#pending) if (pending.command !== except) pending.cancel();
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
      return workflowResult("model", "completed", `Switched to ${modelName}${suffix}`, undefined, "status");
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

  abortBashWorkflow(): void {
    this.#requireSession().abortBash?.();
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
    if (this.#ports.admissionStopped() || this.#ports.pendingCommandCount() + this.#pending.size >= MAX_PENDING_WORK) return cancelled;
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

  async #performWorkflow(request: PiWorkflowRequest): Promise<PiWorkflowResult> {
    const session = this.#requireSession();
    const runtime = this.#ports.runtime();
    if (!runtime) throw new Error("engine runtime is unavailable");
    const argument = request.argument.trim();
    const selected = request.selection?.trim();
    const selection = selected && selected.length > 0 ? selected : undefined;

    switch (request.command) {
      case "settings": {
        if (!selection) return workflowResult(request.command, "failed", "Settings requires the owned settings controller");
        return await this.#ports.applyPinnedSetting(selection);
      }
      case "model": {
        const reference = selection ?? argument;
        if (!reference) return workflowResult(request.command, "failed", "Model requires the owned model controller");
        const scopedModels = Array.isArray(session.scopedModels)
          ? session.scopedModels.map(item => item.model)
          : [];
        let availableModels = scopedModels.length > 0
          ? scopedModels
          : [...(runtime.services.modelRuntime.getAvailableSnapshot?.() ?? [])];
        let model = findExactWorkflowModel(reference, availableModels);
        const messages: PiWorkflowMessage[] = [];
        const generation = this.#ports.sessionGeneration();
        const current = () => !this.#ports.disposed() && generation === this.#ports.sessionGeneration();
        const publish = (message: PiWorkflowMessage) => {
          if (!current()) return;
          const interaction = this.#ports.interaction();
          if (interaction.publish) interaction.publish(message);
          else messages.push(message);
        };
        if (model === undefined && scopedModels.length === 0) {
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
          availableModels = [...(runtime.services.modelRuntime.getAvailableSnapshot?.() ?? [])];
          model = findExactWorkflowModel(reference, availableModels);
        }
        if (!current()) return workflowResult(request.command, "cancelled", "Model selection cancelled", undefined, "silent");
        if (model === undefined) {
          return {
            ...workflowResult(request.command, "requires-selection", "Select a model", reference, "silent"),
            ...(messages.length === 0 ? {} : { messages: Object.freeze(messages) }),
          };
        }
        try {
          await session.setModel(model);
        } catch (error) {
          if (!current()) return workflowResult(request.command, "cancelled", "Model selection cancelled", undefined, "silent");
          const failure: PiWorkflowMessage = { kind: "error", message: error instanceof Error ? error.message : String(error) };
          return workflowResult(request.command, "failed", failure.message, undefined, "error", messages.length === 0 ? undefined : [...messages, failure]);
        }
        if (!current()) return workflowResult(request.command, "cancelled", "Model selection cancelled", undefined, "silent");
        const providerId = stringProperty(model, "provider") ?? "unknown";
        const modelId = stringProperty(model, "id") ?? reference;
        this.#ports.setActiveModel({ providerId, modelId, displayName: stringProperty(model, "name") ?? modelId });
        this.#ports.emitView();
        const resultMessage: PiWorkflowMessage = { kind: "status", message: `Model: ${modelId}` };
        return messages.length === 0
          ? workflowResult(request.command, "completed", resultMessage.message)
          : workflowResult(request.command, "completed", resultMessage.message, undefined, "status", [...messages, resultMessage]);
      }
      case "scoped-models": {
        if (!selection) return workflowResult(request.command, "failed", "Scoped models requires the owned scoped-model controller");
        const [providerId, modelId] = selection.split("/", 2);
        const model = providerId && modelId ? runtime.services.modelRuntime.getModel(providerId, modelId) : undefined;
        if (!model) return workflowResult(request.command, "failed", `Model is unavailable: ${selection}`);
        requireCapability(session.setScopedModels, "setScopedModels").call(session, [{ model }]);
        return workflowResult(request.command, "completed", `Enabled scoped model ${selection}`);
      }
      case "export": {
        const path = pathArgument(argument);
        const file = path?.toLowerCase().endsWith(".jsonl")
          ? requireCapability(session.exportToJsonl, "exportToJsonl").call(session, path)
          : await requireCapability(session.exportToHtml, "exportToHtml").call(session, path);
        return workflowResult(request.command, "completed", `Session exported to: ${String(file)}`);
      }
      case "import": {
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
      case "share": {
        const signal = request.signal;
        if (signal?.aborted) return workflowResult(request.command, "cancelled", "Share cancelled", undefined, "status");
        try {
          await this.#host.runCommand("gh", ["auth", "status"], signal === undefined ? undefined : { signal });
        } catch (error) {
          if (signal?.aborted || isAbortError(error)) return workflowResult(request.command, "cancelled", "Share cancelled", undefined, "status");
          const message = commandMissing(error)
            ? "GitHub CLI (gh) is not installed. Install it from https://cli.github.com/"
            : "GitHub CLI is not logged in. Run 'gh auth login' first.";
          return workflowResult(request.command, "failed", message);
        }
        const temporary = join(tmpdir(), `${PRODUCT_IDENTITY.filesystem.temporaryPrefix}pi-session-${process.pid}.html`);
        try {
          try {
            await requireCapability(session.exportToHtml, "exportToHtml").call(session, temporary);
          } catch (error) {
            return workflowResult(request.command, "failed", `Failed to export session: ${errorMessage(error, "Unknown error")}`);
          }
          if (signal?.aborted) return workflowResult(request.command, "cancelled", "Share cancelled", undefined, "status");
          let gist: { readonly stdout: string; readonly stderr: string };
          try {
            gist = await this.#host.runCommand("gh", ["gist", "create", "--public=false", temporary], signal === undefined ? undefined : { signal });
          } catch (error) {
            if (signal?.aborted || isAbortError(error)) return workflowResult(request.command, "cancelled", "Share cancelled", undefined, "status");
            return workflowResult(request.command, "failed", `Failed to create gist: ${shareCommandFailureDetail(error)}`);
          }
          if (signal?.aborted) return workflowResult(request.command, "cancelled", "Share cancelled", undefined, "status");
          const gistUrl = gist.stdout.trim();
          const gistId = gistUrl.split("/").at(-1);
          if (!gistId) return workflowResult(request.command, "failed", "Failed to parse gist ID from gh output");
          return workflowResult(request.command, "completed", `Share URL: ${shareViewerUrl(gistId)}`, gistUrl);
        } finally {
          await rm(temporary, { force: true });
        }
      }
      case "copy": {
        const text = requireCapability(session.getLastAssistantText, "getLastAssistantText").call(session);
        if (typeof text !== "string" || text.length === 0) return workflowResult(request.command, "failed", "No agent messages to copy yet.");
        const acknowledged = await this.copyWorkflowText(text);
        return workflowResult(request.command, "completed", acknowledged ? "Copied last agent message to clipboard" : "Submitted last agent message to clipboard");
      }
      case "name": {
        const manager = session.sessionManager;
        if (!argument) {
          const current = manager?.getSessionName();
          return typeof current === "string"
            ? workflowResult(request.command, "completed", `Session name: ${current}`)
            : workflowResult(request.command, "failed", "Usage: /name <name>", undefined, "warning");
        }
        requireCapability(session.setSessionName, "setSessionName").call(session, argument);
        const normalized = manager?.getSessionName();
        const actual = typeof normalized === "string" ? normalized : argument;
        return workflowResult(
          request.command,
          "completed",
          `Session name set: ${actual}`,
          actual === argument ? undefined : `Session name was normalized from ${JSON.stringify(argument)} to ${JSON.stringify(actual)}`,
        );
      }
      case "session": {
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
          ),
        };
      }
      case "changelog": {
        const changelog = await this.#host.readChangelog();
        return workflowResult(request.command, "completed", "What's New", changelog);
      }
      case "hotkeys":
        return workflowResult(request.command, "completed", "Keyboard Shortcuts", pinnedHotkeySummary());
      case "fork": {
        if (!selection) return workflowResult(request.command, "failed", "Fork requires the owned user-message controller");
        const result = await requireCapability(runtime.fork, "fork").call(runtime, selection, { position: "before" });
        if (isRecord(result) && result.cancelled === true) return workflowResult(request.command, "cancelled", "Fork cancelled", undefined, "silent");
        return workflowResult(request.command, "completed", "Forked to new session");
      }
      case "clone": {
        const manager = session.sessionManager;
        const leaf = manager?.getLeafId?.();
        if (typeof leaf !== "string") return workflowResult(request.command, "completed", "Nothing to clone yet", undefined, "status");
        const result = await requireCapability(runtime.fork, "fork").call(runtime, leaf, { position: "at" });
        if (isRecord(result) && result.cancelled === true) return workflowResult(request.command, "cancelled", "Clone cancelled", undefined, "silent");
        return workflowResult(request.command, "completed", "Cloned to new session");
      }
      case "tree": {
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
        return workflowResult(request.command, "completed", "Navigated to selected point");
      }
      case "trust": {
        if (!selection) return workflowResult(request.command, "failed", "Trust requires the owned trust controller");
        requireCapability(runtime.services.settingsManager?.setProjectTrusted, "setProjectTrusted").call(runtime.services.settingsManager, selection === "trust");
        return workflowResult(request.command, "completed", selection === "trust" ? "Project trusted" : "Project trust removed");
      }
      case "login": {
        if (!selection && !argument) return workflowResult(request.command, "failed", "Login requires the owned authentication controller");
        const modelRuntime = runtime.services.modelRuntime;
        let loginSelection = selection ?? argument;
        if (!selection && argument && !argument.includes(":")) {
          const normalized = argument.toLowerCase();
          const providers = modelRuntime.getProviders?.();
          const providerMatches = Array.isArray(providers) ? providers.filter(isRecord).filter(candidate =>
            stringProperty(candidate, "id")?.toLowerCase() === normalized
              || stringProperty(candidate, "name")?.toLowerCase() === normalized) : [];
          const providerReference = providerMatches.length === 1 ? stringProperty(providerMatches[0], "id") ?? argument : argument;
          const matching = this.#contexts.loginOptions().filter(option => option.id.endsWith(`:${providerReference}`));
          if (matching.length > 1) {
            const provider = modelRuntime.getProvider?.(providerReference);
            const providerName = stringProperty(provider, "name") ?? providerReference;
            return workflowResult(request.command, "failed", `Authentication method for ${providerName} requires the owned authentication controller`);
          }
          if (matching[0]) loginSelection = matching[0].id;
        }
        const [authTypeValue = "oauth", providerId = loginSelection] = loginSelection.includes(":")
          ? loginSelection.split(":", 2)
          : ["oauth", loginSelection];
        const authType = authTypeValue === "api_key" ? "api_key" as const : "oauth" as const;
        const provider = modelRuntime.getProvider?.(providerId);
        const providerName = stringProperty(provider, "name") ?? providerId;
        const previousModel = session.model;
        this.#ports.interaction().startLogin?.({ providerId, providerName, authType });
        try {
          await requireCapability(modelRuntime.login, "login").call(modelRuntime, providerId, authType, {
            signal: AbortSignal.timeout(120_000),
            prompt: async (prompt: unknown) => {
              const promptType = stringProperty(prompt, "type");
              const options = isRecord(prompt) && Array.isArray(prompt.options)
                ? prompt.options.filter(isRecord).flatMap(option => {
                    const id = stringProperty(option, "id");
                    const label = stringProperty(option, "label");
                    return id && label ? [{ id, label }] : [];
                  })
                : [];
              const response = await this.#ports.interaction().prompt({
                type: promptType === "select"
                  ? "select"
                  : promptType === "manual_code"
                    ? "manual-code"
                    : authType === "api_key"
                      ? "secret"
                      : "text",
                message: stringProperty(prompt, "message") ?? `Authenticate ${providerName}`,
                ...(stringProperty(prompt, "placeholder") === undefined ? {} : { placeholder: stringProperty(prompt, "placeholder")! }),
                ...(options.length === 0 ? {} : { options }),
              });
              if (response === null) throw new Error("Login cancelled");
              return response;
            },
            notify: (event: unknown) => {
              const notification = workflowLoginNotification(event);
              if (notification) this.#ports.interaction().notify(notification);
            },
          });
        } catch (error) {
          if (error instanceof Error && error.message === "Login cancelled") {
            return workflowResult(request.command, "cancelled", "Login cancelled", undefined, "silent");
          }
          const detail = error instanceof Error ? error.message : String(error);
          const actionLabel = authType === "api_key" ? `Saved API key for ${providerName}` : `Logged in to ${providerName}`;
          const message = error instanceof CredentialSynchronizationError
            ? `${actionLabel}, but local model state could not be synchronized: ${detail}`
            : authType === "api_key"
              ? `Failed to save API key for ${providerName}: ${detail}`
              : `Failed to login to ${providerName}: ${detail}`;
          return workflowResult(request.command, "failed", message);
        } finally {
          this.#ports.interaction().finishLogin?.();
        }
        return await this.#completeProviderAuthentication(providerId, providerName, authType, previousModel);
      }
      case "logout": {
        if (!selection) return workflowResult(request.command, "failed", "Logout requires the owned authentication controller");
        const [credentialType = "oauth", providerId = selection] = selection.includes(":") ? selection.split(":", 2) : ["oauth", selection];
        const modelRuntime = runtime.services.modelRuntime;
        const provider = modelRuntime.getProvider?.(providerId);
        const providerName = stringProperty(provider, "name") ?? providerId;
        try {
          await requireCapability(modelRuntime.logout, "logout").call(modelRuntime, providerId, { signal: AbortSignal.timeout(15_000) });
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error);
          const message = error instanceof CredentialSynchronizationError
            ? `Credentials removed for ${providerName}, but local model state could not be synchronized: ${detail}`
            : `Logout failed: ${detail}`;
          return workflowResult(request.command, "failed", message);
        }
        this.#ports.reconcileActiveModelAvailability();
        this.#ports.emitView();
        return workflowResult(
          request.command,
          "completed",
          credentialType === "api_key"
            ? `Removed stored API key for ${providerName}. Environment variables and models.json config are unchanged.`
            : `Logged out of ${providerName}`,
        );
      }
      case "new": {
        const result = await runtime.newSession();
        if (isRecord(result) && result.cancelled === true) return workflowResult(request.command, "cancelled", "New session cancelled", undefined, "silent");
        return workflowResult(request.command, "completed", "✓ New session started", undefined, "accent");
      }
      case "compact": {
        try {
          await session.compact(argument || undefined);
          return workflowResult(request.command, "completed", "Compaction requested", undefined, "silent");
        } catch (error) {
          return workflowResult(
            request.command,
            "failed",
            error instanceof Error ? error.message : String(error),
            undefined,
            "silent",
          );
        }
      }
      case "resume": {
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
      case "reload": {
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
      case "quit": {
        await this.#ports.dispose();
        return workflowResult(request.command, "completed", "Shutdown complete");
      }
      case "debug": {
        const debugPath = join(this.#agentDir, "pi-debug.log");
        await mkdir(dirname(debugPath), { recursive: true });
        await writeFile(debugPath, `${JSON.stringify(this.#ports.snapshot(), null, 2)}\n`, "utf8");
        return workflowResult(request.command, "completed", "✓ Debug log written", debugPath);
      }
      case "arminsayshi":
        return workflowResult(request.command, "completed", "Armin says hi");
      case "dementedelves":
        return workflowResult(request.command, "completed", "Demented elves announcement");
    }
  }

  async #completeProviderAuthentication(
    providerId: string,
    providerName: string,
    authType: "oauth" | "api_key",
    previousModel: unknown,
  ): Promise<PiWorkflowResult> {
    const session = this.#requireSession();
    const modelRuntime = this.#ports.runtime()?.services.modelRuntime;
    if (!modelRuntime) throw new Error("engine runtime is unavailable");
    const actionLabel = authType === "oauth" ? `Logged in to ${providerName}` : `Saved API key for ${providerName}`;
    let selectedModelId: string | undefined;
    let selectionError: string | undefined;
    if (isUnknownModel(previousModel)) {
      const available = modelRuntime.getAvailableSnapshot?.() ?? [];
      const providerModels = available.filter(model => stringProperty(model, "provider") === providerId);
      const defaultModelId = PINNED_DEFAULT_MODEL_BY_PROVIDER[providerId];
      if (defaultModelId === undefined) {
        selectionError = `${actionLabel}, but no default model is configured for provider "${providerId}". Use /model to select a model.`;
      } else if (providerModels.length === 0) {
        selectionError = `${actionLabel}, but no models are available for that provider. Use /model to select a model.`;
      } else {
        const selectedModel = providerModels.find(model => stringProperty(model, "id") === defaultModelId);
        if (selectedModel === undefined) {
          selectionError = `${actionLabel}, but its default model "${defaultModelId}" is not available. Use /model to select a model.`;
        } else {
          try {
            await session.setModel(selectedModel);
            selectedModelId = stringProperty(selectedModel, "id") ?? defaultModelId;
            this.#ports.setActiveModel({
              providerId,
              modelId: selectedModelId,
              displayName: stringProperty(selectedModel, "name") ?? selectedModelId,
            });
          } catch (error) {
            selectionError = `${actionLabel}, but selecting its default model failed: ${error instanceof Error ? error.message : String(error)}. Use /model to select a model.`;
          }
        }
      }
    }
    this.#ports.reconcileActiveModelAvailability();
    this.#ports.emitView();
    const status = `${actionLabel}.${selectedModelId ? ` Selected ${selectedModelId}.` : ""} Credentials saved to ${join(this.#agentDir, "auth.json")}`;
    const messages: PiWorkflowMessage[] = [
      { kind: "status", message: status },
      ...(selectionError === undefined ? [] : [{ kind: "error" as const, message: selectionError }]),
    ];
    this.#scheduleAuthenticatedProviderRefresh(providerId, actionLabel);
    return workflowResult("login", "completed", status, undefined, "status", messages);
  }

  #scheduleAuthenticatedProviderRefresh(providerId: string, actionLabel: string): void {
    const runtime = this.#ports.runtime();
    const refresh = runtime?.services.modelRuntime.refresh;
    if (!runtime || typeof refresh !== "function") return;
    const generation = this.#ports.sessionGeneration();
    const publish = this.#ports.interaction().publish;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AUTH_REFRESH_TIMEOUT_MS);
    // Compatibility: post-authentication refresh starts on the next turn so its notices follow the saved-credential status.
    void new Promise<void>(resolve => setTimeout(resolve, 0))
      .then(() => refresh.call(runtime.services.modelRuntime, { providers: [providerId], signal: controller.signal }))
      .then(result => {
        if (this.#ports.disposed() || this.#ports.sessionGeneration() !== generation) return;
        if (isRecord(result) && result.aborted === true) {
          publish?.({ kind: "warning", message: `${actionLabel}, but its model catalog refresh timed out; using cached models.` });
        } else if (isRecord(result) && result.errors instanceof Map && result.errors.size > 0) {
          publish?.({ kind: "warning", message: `${actionLabel}, but its model catalog could not be refreshed; using cached models.` });
        }
        this.#ports.reconcileActiveModelAvailability();
        this.#ports.emitView();
      })
      .catch(error => {
        if (this.#ports.disposed() || this.#ports.sessionGeneration() !== generation) return;
        publish?.({
          kind: "warning",
          message: controller.signal.aborted
            ? `${actionLabel}, but its model catalog refresh timed out; using cached models.`
            : `${actionLabel}, but its model catalog could not be refreshed: ${error instanceof Error ? error.message : String(error)}`,
        });
      })
      .finally(() => clearTimeout(timeout));
  }
}

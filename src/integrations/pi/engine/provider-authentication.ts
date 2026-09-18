import { join } from "node:path";
import { isRecord, requireCapability, stringProperty } from "./message-values.js";
import { CredentialSynchronizationError, type AgentSession, type AgentSessionRuntime } from "../startup-public.js";
import { AUTH_REFRESH_TIMEOUT_MS, isUnknownModel, PINNED_DEFAULT_MODEL_BY_PROVIDER, workflowLoginNotification, workflowResult } from "./workflow-support.js";
import type { PiWorkflowContexts } from "./workflow-contexts.js";
import type { OwnedUiModelInfo } from "../../../contracts/owned-ui/index.js";
import type { PiWorkflowInteractionHost, PiWorkflowMessage, PiWorkflowRequest, PiWorkflowResult } from "./workflows.js";

type PiSessionApi = AgentSession;
type PiRuntimeApi = AgentSessionRuntime;

export interface PiProviderAuthenticationPorts {
  runtime(): PiRuntimeApi | undefined;
  requireSession(): PiSessionApi;
  disposed(): boolean;
  sessionGeneration(): number;
  interaction(): PiWorkflowInteractionHost;
  setActiveModel(model: OwnedUiModelInfo): void;
  reconcileActiveModelAvailability(): void;
  emitView(): void;
}

/**
 * Pinned Pi's provider login and logout: resolving a provider reference to an authentication
 * method, driving the model runtime's login through the owned interaction host, selecting the
 * provider's pinned default model when the session had none, and the deferred catalog refresh
 * whose notices follow the saved-credential status. Wording follows pinned Pi exactly.
 */
export class PiProviderAuthentication {
  readonly #agentDir: string;
  readonly #contexts: PiWorkflowContexts;
  readonly #ports: PiProviderAuthenticationPorts;

  constructor(options: { readonly agentDir: string; readonly contexts: PiWorkflowContexts }, ports: PiProviderAuthenticationPorts) {
    this.#agentDir = options.agentDir;
    this.#contexts = options.contexts;
    this.#ports = ports;
  }

  /** Run pinned Pi's `/login` for a provider reference or an explicit `type:provider` selection. */
  async login(request: PiWorkflowRequest, session: PiSessionApi, runtime: PiRuntimeApi, argument: string, selection: string | undefined): Promise<PiWorkflowResult> {
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

  /** Run pinned Pi's `/logout` for a `type:provider` selection. */
  async logout(request: PiWorkflowRequest, runtime: PiRuntimeApi, selection: string): Promise<PiWorkflowResult> {
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

  async #completeProviderAuthentication(
    providerId: string,
    providerName: string,
    authType: "oauth" | "api_key",
    previousModel: unknown,
  ): Promise<PiWorkflowResult> {
    const session = this.#ports.requireSession();
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

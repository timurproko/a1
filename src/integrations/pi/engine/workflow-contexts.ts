import { realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { dynamicObject, isRecord, requireCapability, stringProperty } from "./message-values.js";
import { ProjectTrustStore, SessionManager, type AgentSession, type AgentSessionRuntime } from "../startup-public.js";
import { resolveConfiguredModelIds, scopedModelRecords, scopedModelReference, workflowOptions } from "./workflow-support.js";
import type { OwnedUiModelInfo } from "../../../contracts/owned-ui/index.js";
import type {
  PiAuthenticationProviderOption,
  PiProjectTrustContext,
  PiProjectTrustUpdate,
  PiScopedModelsContext,
  PiScopedModelsRefreshResult,
  PiSessionSelectorContext,
  PiTreeSelectorContext,
  PiWorkflowOption,
} from "./workflows.js";

type PiSessionApi = AgentSession;
type PiRuntimeApi = AgentSessionRuntime;

export interface PiWorkflowContextPorts {
  /** The working directory the runtime settled on; it can change when a session is resumed elsewhere. */
  cwd(): string;
  session(): PiSessionApi | undefined;
  runtime(): PiRuntimeApi | undefined;
  disposed(): boolean;
  activeModel(): OwnedUiModelInfo | null;
  emitView(): void;
}

/**
 * The selector contexts and option lists the owned UI's workflow dialogs read from pinned Pi:
 * model, scoped-model, session, tree, fork, project-trust, and provider-authentication state,
 * shaped for the owned controllers. Everything here is a read of the current session and runtime
 * plus the few writes the selectors commit directly (scoped models, project trust); running a
 * workflow belongs to the runner.
 */
export class PiWorkflowContexts {
  readonly #agentDir: string;
  readonly #ports: PiWorkflowContextPorts;

  constructor(options: { readonly agentDir: string }, ports: PiWorkflowContextPorts) {
    this.#agentDir = options.agentDir;
    this.#ports = ports;
  }

  #requireSession(): PiSessionApi {
    const session = this.#ports.session();
    if (this.#ports.disposed() || !this.#ports.runtime() || !session) throw new Error("engine adapter is not running");
    return session;
  }

  pinnedModelSelectorContext(): {
    readonly currentModel: unknown;
    readonly modelRuntime: unknown;
    readonly scopedModels: readonly unknown[];
    readonly defaultModel?: { readonly provider: string; readonly id: string };
  } {
    const session = this.#requireSession();
    const runtime = this.#ports.runtime();
    if (!runtime) throw new Error("engine runtime is unavailable");
    const scoped = session.scopedModels;
    const modelRuntime = runtime.services.modelRuntime;
    const selectorRuntime = typeof modelRuntime.getAvailableSnapshot === "function"
      ? modelRuntime
      : {
          getAvailableSnapshot: () => session.model === undefined ? [] : [session.model],
          getModel: (providerId: string, modelId: string) => modelRuntime.getModel(providerId, modelId),
          getError: () => undefined,
          refresh: async () => undefined,
        };
    const settingsManager = runtime.services.settingsManager;
    const defaultProvider = settingsManager?.getDefaultProvider?.();
    const defaultModelId = settingsManager?.getDefaultModel?.();
    return {
      currentModel: this.#ports.activeModel() === null ? undefined : session.model,
      ...(defaultProvider && defaultModelId ? { defaultModel: { provider: defaultProvider, id: defaultModelId } } : {}),
      modelRuntime: selectorRuntime,
      scopedModels: Array.isArray(scoped) ? scoped : [],
    };
  }

  pinnedProjectTrustContext(): PiProjectTrustContext {
    const runtime = this.#ports.runtime();
    if (!runtime) throw new Error("engine runtime is unavailable");
    const cwd = resolve(this.#ports.cwd());
    let trustPath = cwd;
    try { trustPath = realpathSync(cwd); } catch {
      // Compatibility: pinned Pi retains the resolved path when real-path lookup fails.
    }
    // Security: trust the target's parent, not the parent containing a directory alias.
    const parent = dirname(trustPath);
    const trustStore = new ProjectTrustStore(this.#agentDir);
    const trustOptions: PiProjectTrustContext["trustOptions"] = [
      { label: "Trust", trusted: true, updates: [{ path: trustPath, decision: true }], savedPath: trustPath },
      ...(parent === trustPath ? [] : [{
        label: `Trust parent folder (${parent})`,
        trusted: true,
        updates: [{ path: parent, decision: true }, { path: trustPath, decision: null }],
        savedPath: parent,
      }]),
      { label: "Do not trust", trusted: false, updates: [{ path: trustPath, decision: false }], savedPath: trustPath },
    ];
    return {
      cwd,
      savedDecision: trustStore.getEntry(cwd),
      projectTrusted: runtime.services.settingsManager?.isProjectTrusted?.() === true,
      trustOptions,
    };
  }

  persistProjectTrust(updates: readonly PiProjectTrustUpdate[]): void {
    new ProjectTrustStore(this.#agentDir).setMany([...updates]);
  }

  pinnedSessionSelectorContext(): PiSessionSelectorContext {
    const session = this.#requireSession();
    const manager = session.sessionManager;
    const cwd = manager?.getCwd?.();
    const sessionDir = manager?.getSessionDir?.();
    const currentSessionFilePath = manager?.getSessionFile?.();
    const usesDefaultSessionDir = manager?.usesDefaultSessionDir?.() === true;
    const resolvedCwd = typeof cwd === "string" ? cwd : this.#ports.cwd();
    const resolvedSessionDir = typeof sessionDir === "string" ? sessionDir : undefined;
    return {
      currentSessionFilePath: typeof currentSessionFilePath === "string" ? currentSessionFilePath : undefined,
      loadCurrentSessions: onProgress => SessionManager.list(resolvedCwd, resolvedSessionDir, onProgress),
      loadAllSessions: onProgress => usesDefaultSessionDir
        ? SessionManager.listAll(onProgress)
        : resolvedSessionDir === undefined ? SessionManager.listAll(onProgress) : SessionManager.listAll(resolvedSessionDir, onProgress),
      renameSession: async (sessionFilePath, nextName) => {
        const next = (nextName ?? "").trim();
        if (!next) return;
        SessionManager.open(sessionFilePath).appendSessionInfo(next);
      },
    };
  }

  pinnedScopedModelsContext(): PiScopedModelsContext {
    const session = this.#requireSession();
    const runtime = this.#ports.runtime();
    if (!runtime) throw new Error("engine runtime is unavailable");
    const models = scopedModelRecords(runtime.services.modelRuntime);
    const scoped = session.scopedModels;
    if (Array.isArray(scoped) && scoped.length > 0) {
      return {
        models: models.map(item => item.descriptor),
        enabledModelIds: scoped.map(scopedModelReference).filter((id): id is string => id !== undefined),
      };
    }
    const patterns = runtime.services.settingsManager?.getEnabledModels?.();
    return {
      models: models.map(item => item.descriptor),
      enabledModelIds: Array.isArray(patterns)
        ? resolveConfiguredModelIds(patterns.filter((value): value is string => typeof value === "string"), models)
        : null,
    };
  }

  updateScopedModels(enabledModelIds: readonly string[] | null): void {
    const session = this.#requireSession();
    const runtime = this.#ports.runtime();
    if (!runtime) throw new Error("engine runtime is unavailable");
    const models = scopedModelRecords(runtime.services.modelRuntime);
    const availableIds = new Set(models.map(item => `${item.descriptor.provider}/${item.descriptor.id}`));
    const selected = enabledModelIds?.filter(id => availableIds.has(id)) ?? [];
    const allAvailableEnabled = enabledModelIds !== null && availableIds.size > 0 && selected.length === availableIds.size;
    const scoped = enabledModelIds !== null && selected.length > 0 && !allAvailableEnabled
      ? selected.flatMap(id => {
          const item = models.find(candidate => `${candidate.descriptor.provider}/${candidate.descriptor.id}` === id);
          return item === undefined ? [] : [{ model: item.model }];
        })
      : [];
    requireCapability(session.setScopedModels, "setScopedModels").call(session, scoped);
    this.#ports.emitView();
  }

  persistScopedModels(enabledModelIds: readonly string[] | null): void {
    const runtime = this.#ports.runtime();
    if (!runtime) throw new Error("engine runtime is unavailable");
    const availableCount = scopedModelRecords(runtime.services.modelRuntime).length;
    const patterns = enabledModelIds === null || enabledModelIds.length === availableCount
      ? undefined
      : [...enabledModelIds];
    requireCapability(runtime.services.settingsManager?.setEnabledModels, "setEnabledModels").call(runtime.services.settingsManager, patterns === undefined ? undefined : [...patterns]);
  }

  async refreshScopedModels(signal: AbortSignal): Promise<PiScopedModelsRefreshResult> {
    const runtime = this.#ports.runtime();
    if (!runtime) throw new Error("engine runtime is unavailable");
    const result = await runtime.services.modelRuntime.refresh?.({ signal });
    const context = this.pinnedScopedModelsContext();
    if (isRecord(result) && result.aborted === true) {
      return { ...context, status: "Model refresh timed out; showing cached models.", statusKind: "warning" };
    }
    const errors = isRecord(result) ? result.errors : undefined;
    if (errors instanceof Map && errors.size > 0) {
      return {
        ...context,
        status: `Could not refresh ${[...errors.keys()].join(", ")}; showing cached models.`,
        statusKind: "warning",
      };
    }
    return { ...context, status: "Model catalogs refreshed.", statusKind: "success" };
  }

  pinnedLoginMethodOptions(providerReference: string): { readonly title: string; readonly options: readonly PiWorkflowOption[] } {
    const runtime = this.#ports.runtime();
    if (!runtime) throw new Error("engine runtime is unavailable");
    const modelRuntime = runtime.services.modelRuntime;
    const normalized = providerReference.trim().toLowerCase();
    const providers = modelRuntime.getProviders?.();
    const matches = Array.isArray(providers) ? providers.filter(isRecord).filter(candidate =>
      stringProperty(candidate, "id")?.toLowerCase() === normalized
        || stringProperty(candidate, "name")?.toLowerCase() === normalized) : [];
    const providerId = matches.length === 1 ? stringProperty(matches[0], "id") ?? providerReference : providerReference;
    const provider = modelRuntime.getProvider?.(providerId);
    const providerName = stringProperty(provider, "name") ?? providerId;
    const oauth = dynamicObject(dynamicObject(provider, "auth"), "oauth");
    const loginLabel = stringProperty(oauth, "loginLabel") ?? "Sign in with an account";
    const options = this.loginOptions().filter(option => option.id.endsWith(`:${providerId}`)).map(option => ({
      id: option.id,
      label: option.id.startsWith("api_key:") ? "Sign in with an API key" : loginLabel,
      ...(option.description === undefined ? {} : { description: option.description }),
    }));
    return { title: `Select authentication method for ${providerName}:`, options };
  }

  pinnedAmbientAuthentication(selection: string): { readonly providerId: string; readonly providerName: string; readonly title: string; readonly message: string } | null {
    if (!selection.startsWith("api_key:")) return null;
    const providerId = selection.slice("api_key:".length);
    const provider = this.#ports.runtime()?.services.modelRuntime.getProvider?.(providerId);
    const method = dynamicObject(dynamicObject(provider, "auth"), "apiKey");
    if (!method || typeof method.login === "function") return null;
    const providerName = stringProperty(provider, "name") ?? providerId;
    return { providerId, providerName, title: `${providerName} setup`, message: `${stringProperty(method, "name") ?? "Authentication"} is configured outside pi.` };
  }

  pinnedForkOptions(): readonly PiWorkflowOption[] {
    const session = this.#requireSession();
    const messages = requireCapability(session.getUserMessagesForForking, "getUserMessagesForForking").call(session);
    return workflowOptions(messages, "entryId", "text");
  }

  pinnedTreeSelectorContext(): PiTreeSelectorContext {
    const manager = this.#requireSession().sessionManager;
    const settings = this.#ports.runtime()?.services.settingsManager;
    const tree = manager?.getTree?.();
    const leaf = manager?.getLeafId?.();
    const configuredFilter = settings?.getTreeFilterMode?.();
    const filterMode = configuredFilter === "no-tools" || configuredFilter === "user-only" || configuredFilter === "labeled-only" || configuredFilter === "all"
      ? configuredFilter
      : "default";
    return {
      tree: Array.isArray(tree) ? tree : [],
      currentLeafId: typeof leaf === "string" ? leaf : null,
      filterMode,
      skipSummaryPrompt: settings?.getBranchSummarySkipPrompt?.() === true,
      appendLabelChange: (entryId, label) => {
        requireCapability(manager?.appendLabelChange, "appendLabelChange").call(manager, entryId, label);
      },
    };
  }

  modelOptions(): readonly PiWorkflowOption[] {
    const runtime = this.#ports.runtime();
    if (!runtime) return [];
    const models = runtime.services.modelRuntime.getAvailableSnapshot?.();
    if (!Array.isArray(models)) {
      const active = this.#ports.activeModel();
      return active ? [{ id: `${active.providerId}/${active.modelId}`, label: active.displayName, description: `${active.providerId}/${active.modelId}` }] : [];
    }
    return models.filter(isRecord).flatMap(model => {
      const provider = stringProperty(model, "provider");
      const id = stringProperty(model, "id");
      if (!provider || !id) return [];
      return [{ id: `${provider}/${id}`, label: stringProperty(model, "name") ?? id, description: `${provider}/${id}` }];
    });
  }

  loginOptions(authType?: "oauth" | "api_key"): readonly PiAuthenticationProviderOption[] {
    const runtime = this.#ports.runtime();
    const modelRuntime = runtime?.services.modelRuntime;
    if (!modelRuntime) return [];
    const providers = modelRuntime.getProviders?.();
    if (!Array.isArray(providers)) return [];
    return providers.filter(isRecord).flatMap(provider => {
      const id = stringProperty(provider, "id");
      if (!id) return [];
      const name = stringProperty(provider, "name") ?? id;
      const auth = isRecord(provider.auth) ? provider.auth : {};
      const authStatus = modelRuntime.getProviderAuthStatus?.(id);
      const source = authStatus?.label ?? authStatus?.source;
      const status = authStatus?.configured === true
        ? {
            type: modelRuntime.isUsingOAuth?.(id) === true ? "oauth" as const : "api_key" as const,
            ...(source === undefined ? {} : { source }),
          }
        : undefined;
      return [
        ...(authType !== "api_key" && auth.oauth ? [{
          id: `oauth:${id}`,
          providerId: id,
          label: name,
          description: "Account / OAuth",
          authType: "oauth" as const,
          ...(status === undefined ? {} : { status }),
        }] : []),
        ...(authType !== "oauth" && auth.apiKey ? [{
          id: `api_key:${id}`,
          providerId: id,
          label: name,
          description: "API key",
          authType: "api_key" as const,
          ...(status === undefined ? {} : { status }),
        }] : []),
      ];
    }).sort((left, right) => left.label.localeCompare(right.label));
  }

  async logoutOptions(): Promise<readonly PiAuthenticationProviderOption[]> {
    const runtime = this.#ports.runtime();
    if (!runtime) return [];
    const modelRuntime = runtime.services.modelRuntime;
    const credentials = await requireCapability(modelRuntime.listCredentials, "listCredentials").call(modelRuntime, { signal: AbortSignal.timeout(15_000) });
    if (!Array.isArray(credentials)) return [];
    return credentials.filter(isRecord).flatMap(credential => {
      const providerId = stringProperty(credential, "providerId");
      if (!providerId) return [];
      const credentialType = stringProperty(credential, "type") === "api_key" ? "api_key" : "oauth";
      const provider = modelRuntime.getProvider?.(providerId);
      return [{
        id: `${credentialType}:${providerId}`,
        providerId,
        label: stringProperty(provider, "name") ?? providerId,
        description: credentialType,
        authType: credentialType,
        status: { type: credentialType, source: "stored credential" },
      }];
    });
  }
}

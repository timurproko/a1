import { existsSync } from "node:fs";
import { createAgentSessionFromServices, type CreateAgentSessionRuntimeFactory } from "../startup-public.js";
import { markStartupPhase } from "../../../foundation/startup/index.js";
import { createPiRuntimeServicesAfterTrust } from "./runtime-services.js";
import type { PiRuntimeIntegrationOptions } from "./runtime-options.js";
import type { SessionWriterCoordinator } from "./session-writers.js";
import type { PiWorktreeTransitions } from "./worktree-transitions.js";

/** Recreate only cwd-bound Pi services and agent state; process invocation choices remain scoped to this factory. */
export function createPiSessionFactory(
  options: PiRuntimeIntegrationOptions,
  sessionWriters: SessionWriterCoordinator,
  transitions?: PiWorktreeTransitions,
): CreateAgentSessionRuntimeFactory {
  let initialInvocation = true;
  let invocationKeyProvider: string | undefined;
  return async ({ cwd, sessionManager: targetSessionManager, sessionStartEvent }) => {
    const pendingWriter = sessionWriters.prepare(targetSessionManager);
    try {
      if (initialInvocation && options.worktreeCwdReader !== undefined && targetSessionManager.buildSessionContext().messages.length > 0) {
        const file = targetSessionManager.getSessionFile();
        if (file !== undefined && existsSync(file)) {
          const signal = options.signal ?? new AbortController().signal;
          try { cwd = await options.worktreeCwdReader(targetSessionManager.getSessionId(), file, signal); }
          catch (error) {
            if (!(error instanceof Error && "code" in error && error.code === "worktree-attachment-invalid")) throw error;
            cwd = await options.worktreeCwdReader(targetSessionManager.getSessionId(), file, signal);
          }
        }
      }
      const { services, trust } = transitions?.takePrepared(cwd) ?? await createPiRuntimeServicesAfterTrust({
        ...options, cwd, ...(transitions === undefined ? {} : { worktreeExtension: transitions.extension }),
      });
      const launch = options.runtimeOptions === undefined && !services.settingsManager.getEnabledModels()?.length ? undefined : await import("./launch-options.js");
      if (options.runtimeOptions !== undefined) await launch!.assertPiInvocationResources(services, options.runtimeOptions);
      // Security: invocation credentials remain scoped to their original provider across project transitions.
      const explicitInvocation = options.runtimeOptions === undefined || (options.runtimeOptions.model === undefined && invocationKeyProvider === undefined) ? undefined
        : await launch!.resolvePiInvocationModel(services, options.runtimeOptions, undefined, invocationKeyProvider, initialInvocation);
      const modelScope = launch === undefined ? { scopedModels: [], model: undefined, thinkingLevel: undefined, diagnostics: [] }
        : await launch.resolveConfiguredModelScope(services, options.signal, options.runtimeOptions?.modelPatterns);
      const invocation = explicitInvocation ?? (options.runtimeOptions === undefined ? undefined
        : await launch!.resolvePiInvocationModel(services, options.runtimeOptions, modelScope.model, invocationKeyProvider, initialInvocation));
      invocationKeyProvider = invocation?.keyProvider;
      const hasExistingSession = targetSessionManager.buildSessionContext().messages.length > 0;
      const worktree = options.worktreeCwdReader === undefined ? undefined : await import("./worktree-tools.js");
      const created = await createAgentSessionFromServices({
        services, sessionManager: targetSessionManager,
        ...(options.worktreeCwdReader === undefined ? {} : {
          customTools: worktree!.createSessionWorktreeTools(...worktree!.runtimeWorktreeToolArguments(services, targetSessionManager, transitions?.toolsReader(targetSessionManager, services.cwd) ?? options.worktreeCwdReader, options.signal))
            .filter(tool => !services.resourceLoader.getExtensions().extensions.some(extension => extension.tools.has(tool.name))),
        }),
        ...(sessionStartEvent ? { sessionStartEvent } : {}),
        ...(modelScope.model && !hasExistingSession ? { model: modelScope.model } : {}),
        ...(modelScope.thinkingLevel && !hasExistingSession ? { thinkingLevel: modelScope.thinkingLevel } : {}),
        ...(modelScope.scopedModels.length > 0 ? { scopedModels: [...modelScope.scopedModels] } : {}),
        ...(invocation?.model === undefined ? {} : { model: invocation.model }),
        ...(invocation?.thinkingLevel === undefined ? {} : { thinkingLevel: invocation.thinkingLevel }),
        ...(options.runtimeOptions?.excludeTools === undefined ? {} : { excludeTools: [...options.runtimeOptions.excludeTools] }),
      });
      try {
        if (initialInvocation && options.runtimeOptions?.sessionName !== undefined) created.session.setSessionName(options.runtimeOptions.sessionName);
        await (options.markStartupPhase ?? (phase => markStartupPhase(process.env, phase)))("session-created");
      } catch (error) { created.session.dispose(); throw error; }
      sessionWriters.activate(pendingWriter);
      initialInvocation = false;
      return { ...created, services, diagnostics: [
        ...(trust.diagnostic === null ? [] : [{ type: "warning" as const, code: "project-trust", message: trust.diagnostic }]),
        ...modelScope.diagnostics,
      ] };
    } catch (error) { sessionWriters.abandon(pendingWriter); throw error; }
  };
}

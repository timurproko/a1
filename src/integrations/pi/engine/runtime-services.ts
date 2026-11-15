import { createAgentSessionServices, SettingsManager, type AgentSessionServices, type ExtensionFactory } from "../startup-public.js";
import { markStartupPhase } from "../../../foundation/startup/index.js";
import { resolvePiProjectTrustPreflight } from "./project-trust-preflight.js";
import { createWindowsNulCleanupExtension } from "./windows-filesystem-hygiene.js";
import type { PiRuntimeIntegrationOptions } from "./runtime-options.js";

/** Resolve target trust before any project settings factories or extensions are loaded. */
export async function createPiRuntimeServicesAfterTrust(
  options: Pick<PiRuntimeIntegrationOptions, "agentDir" | "projectTrustPrompt" | "projectTrustUi" | "preflightDependencies" | "markStartupPhase" | "runtimeOptions"> & { readonly cwd: string; readonly worktreeExtension?: ExtensionFactory },
): Promise<{ readonly services: AgentSessionServices; readonly trust: Awaited<ReturnType<typeof resolvePiProjectTrustPreflight>> }> {
  const resolveTrust = options.preflightDependencies?.resolveTrust ?? resolvePiProjectTrustPreflight;
  const createSettingsManager = options.preflightDependencies?.createSettingsManager
    ?? ((targetCwd: string, agentDir: string, projectTrusted: boolean) => SettingsManager.create(targetCwd, agentDir, { projectTrusted }));
  const createServices = options.preflightDependencies?.createServices ?? createAgentSessionServices;
  const markPhase = options.markStartupPhase ?? (phase => markStartupPhase(process.env, phase));
  let trust: Awaited<ReturnType<typeof resolveTrust>> | undefined;
  const settingsManager = createSettingsManager(options.cwd, options.agentDir, false);
  await markPhase("settings-loaded");
  const cleanupExtension = createWindowsNulCleanupExtension();
  const services = await createServices({
    cwd: options.cwd, agentDir: options.agentDir, settingsManager,
    resourceLoaderReloadOptions: {
      resolveProjectTrust: async ({ extensionsResult }) => {
        trust = await resolveTrust({
          cwd: options.cwd, agentDir: options.agentDir, extensionsResult,
          ...(options.projectTrustPrompt === undefined ? {} : { prompt: options.projectTrustPrompt }),
          ...(options.projectTrustUi === undefined ? {} : { trustUi: options.projectTrustUi }),
          ...(options.runtimeOptions?.projectTrust === undefined ? {} : { trustOverride: options.runtimeOptions.projectTrust }),
        });
        return trust.trusted;
      },
    },
    ...(options.runtimeOptions?.extensionFlagValues === undefined ? {} : { extensionFlagValues: new Map(options.runtimeOptions.extensionFlagValues) }),
    resourceLoaderOptions: {
      ...(options.runtimeOptions?.extensionPaths === undefined ? {} : { additionalExtensionPaths: [...options.runtimeOptions.extensionPaths] }),
      extensionFactories: [...(options.worktreeExtension === undefined ? [] : [options.worktreeExtension]), ...(cleanupExtension === null ? [] : [cleanupExtension])],
    },
  });
  await markPhase("pi-services");
  await markPhase("resource-discovery");
  if (trust === undefined) throw new Error("Resource services did not resolve project trust");
  return { services, trust };
}

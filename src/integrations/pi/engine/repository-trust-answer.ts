import { resolvePiProjectTrustPreflight } from "./project-trust-preflight.js";
import type { PiRuntimeIntegrationOptions } from "./runtime-options.js";

/**
 * Whether the person already trusts a repository, answered from saved and invocation decisions.
 * Security: no prompt is passed, so a repository that would need a trust question counts as not
 * trusted, and a repository's declared start command does not run for it.
 */
export function createRepositoryTrustAnswer(
  options: Pick<PiRuntimeIntegrationOptions, "agentDir" | "preflightDependencies" | "runtimeOptions">,
): (primaryRoot: string) => Promise<boolean> {
  return async primaryRoot => (await (options.preflightDependencies?.resolveTrust ?? resolvePiProjectTrustPreflight)({
    cwd: primaryRoot, agentDir: options.agentDir,
    ...(options.runtimeOptions?.projectTrust === undefined ? {} : { trustOverride: options.runtimeOptions.projectTrust }),
  })).trusted;
}

import {
  hasTrustRequiringProjectResources,
  ProjectTrustStore,
  SettingsManager,
} from "@earendil-works/pi-coding-agent";

export interface PiProjectTrustPreflightRequest {
  readonly cwd: string;
  readonly defaultDecision: "ask" | "always" | "never";
}

export type PiProjectTrustPreflightPrompt = (
  request: PiProjectTrustPreflightRequest,
) => Promise<boolean | null>;

export interface PiProjectTrustPreflightResult {
  readonly trusted: boolean;
  readonly source: "no-project-resources" | "saved" | "default" | "interactive" | "fail-closed";
  readonly diagnostic: string | null;
}

export interface ResolvePiProjectTrustPreflightOptions {
  readonly cwd: string;
  readonly agentDir: string;
  readonly prompt?: PiProjectTrustPreflightPrompt;
  readonly hasProjectResources?: (cwd: string) => boolean;
}

/**
 * Resolves trust from global state only. It never constructs a project-trusted
 * settings manager or resource loader; callers may do that only after this
 * result exists.
 */
export async function resolvePiProjectTrustPreflight(
  options: ResolvePiProjectTrustPreflightOptions,
): Promise<PiProjectTrustPreflightResult> {
  const hasProjectResources = options.hasProjectResources ?? hasTrustRequiringProjectResources;
  if (!hasProjectResources(options.cwd)) {
    return { trusted: true, source: "no-project-resources", diagnostic: null };
  }

  const trustStore = new ProjectTrustStore(options.agentDir);
  const saved = trustStore.get(options.cwd);
  if (saved !== null) return { trusted: saved, source: "saved", diagnostic: null };

  // projectTrusted:false is the security boundary: this read may see global
  // settings but cannot consume project settings or construct project resources.
  const globalSettings = SettingsManager.create(options.cwd, options.agentDir, { projectTrusted: false });
  const fallback = globalSettings.getDefaultProjectTrust();
  if (fallback === "always") return { trusted: true, source: "default", diagnostic: null };
  if (fallback === "never") return { trusted: false, source: "default", diagnostic: null };

  if (options.prompt === undefined) {
    return {
      trusted: false,
      source: "fail-closed",
      diagnostic: `Project resources in ${options.cwd} were withheld because trust requires interaction`,
    };
  }

  try {
    const decision = await options.prompt({ cwd: options.cwd, defaultDecision: fallback });
    if (decision === null) {
      return {
        trusted: false,
        source: "fail-closed",
        diagnostic: `Project resources in ${options.cwd} were withheld because trust selection was cancelled`,
      };
    }
    trustStore.set(options.cwd, decision);
    return { trusted: decision, source: "interactive", diagnostic: null };
  } catch (error) {
    return {
      trusted: false,
      source: "fail-closed",
      diagnostic: `Project resources in ${options.cwd} were withheld because trust resolution failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

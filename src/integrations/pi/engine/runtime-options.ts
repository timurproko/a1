import type { RuntimeLaunchOptions } from "../../../foundation/launch-context/index.js";
import type { StartupPhase } from "../../../foundation/startup/index.js";
import type { createAgentSessionServices, SettingsManager } from "../startup-public.js";
import type { PiProjectTrustPreflightPrompt, PiProjectTrustUi, resolvePiProjectTrustPreflight } from "./project-trust-preflight.js";
import type { PiSessionForkPrompt, PiSessionSelection } from "./session-selection.js";
import type { PiWorktreeCwdReader } from "./worktree-tools.js";

export interface PiRuntimeIntegrationOptions {
  readonly cwd: string;
  readonly runtimeOptions?: RuntimeLaunchOptions;
  /** Only the bare claim-owning product supplies this; comparison tools keep their ordinary cwd. */
  readonly worktreeCwdReader?: PiWorktreeCwdReader;
  readonly agentDir: string;
  readonly sessionDir?: string;
  readonly sessionPath?: string;
  readonly sessionSelection?: PiSessionSelection;
  readonly sessionForkPrompt?: PiSessionForkPrompt;
  readonly projectTrustPrompt?: PiProjectTrustPreflightPrompt;
  readonly projectTrustUi?: PiProjectTrustUi;
  readonly preflightDependencies?: PiRuntimePreflightDependencies;
  readonly signal?: AbortSignal;
  readonly markStartupPhase?: PiStartupPhaseMarker;
}

export type PiStartupPhaseMarker = (phase: StartupPhase) => Promise<void>;

export interface PiRuntimePreflightDependencies {
  readonly resolveTrust?: typeof resolvePiProjectTrustPreflight;
  readonly createSettingsManager?: (cwd: string, agentDir: string, projectTrusted: boolean) => SettingsManager;
  readonly createServices?: typeof createAgentSessionServices;
}

export type PiSessionReplacement =
  | { readonly kind: "new" }
  | { readonly kind: "resume"; readonly sessionPath: string };

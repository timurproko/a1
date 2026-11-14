import { realpathSync } from "node:fs";
import { homedir } from "node:os";
import type { RuntimeLaunchOptions } from "../../../foundation/launch-context/index.js";
import { dirname, resolve } from "node:path";
import {
  ProjectTrustStore,
  SettingsManager,
  type LoadExtensionsResult,
  type ProjectTrustContext,
} from "../startup-public.js";

type PiProjectTrustChoiceId =
  | "trust"
  | "trust-parent"
  | "trust-session"
  | "deny"
  | "deny-session";

interface PiProjectTrustChoice {
  readonly id: PiProjectTrustChoiceId;
  readonly label: string;
  readonly trusted: boolean;
  readonly updates: readonly { readonly path: string; readonly decision: boolean | null }[];
}

export interface PiProjectTrustPreflightRequest {
  readonly cwd: string;
  readonly defaultDecision: "ask" | "always" | "never";
  readonly choices: readonly { readonly id: PiProjectTrustChoiceId; readonly label: string }[];
}

export type PiProjectTrustPreflightPrompt = (
  request: PiProjectTrustPreflightRequest,
) => Promise<PiProjectTrustChoiceId | null>;

export type PiProjectTrustUi = Pick<ProjectTrustContext, "hasUI" | "ui">;

export interface PiProjectTrustPreflightResult {
  readonly trusted: boolean;
  readonly source: "saved" | "default" | "interactive" | "fail-closed" | "invocation" | "extension";
  readonly diagnostic: string | null;
}

export interface ResolvePiProjectTrustPreflightOptions {
  readonly cwd: string;
  readonly agentDir: string;
  readonly prompt?: PiProjectTrustPreflightPrompt;
  readonly trustOverride?: boolean;
  readonly extensionsResult?: LoadExtensionsResult;
  readonly trustUi?: PiProjectTrustUi;
}

/**
 * Resolves trust from global state only. It never constructs a project-trusted
 * settings manager or resource loader; callers may do that only after this
 * result exists.
 */
export async function resolvePiProjectTrustPreflight(
  options: ResolvePiProjectTrustPreflightOptions,
): Promise<PiProjectTrustPreflightResult> {
  if (options.trustOverride !== undefined) return { trusted: options.trustOverride, source: "invocation", diagnostic: null };
  const trustStore = new ProjectTrustStore(options.agentDir);
  if (options.extensionsResult?.extensions.some(extension => extension.handlers.has("project_trust"))) {
    const decision = await (await import("./extension-trust.js")).resolveExtensionProjectTrust(options, trustStore);
    if (decision !== undefined) return decision;
  }
  const saved = trustStore.get(options.cwd);
  if (saved !== null) return { trusted: saved, source: "saved", diagnostic: null };

  // Security: projectTrusted:false is the boundary: this read may see global
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
    const choices = projectTrustChoices(options.cwd);
    const decision = await options.prompt({
      cwd: options.cwd,
      defaultDecision: fallback,
      choices: choices.map(({ id, label }) => ({ id, label })),
    });
    if (decision === null) {
      return {
        trusted: false,
        source: "fail-closed",
        diagnostic: `Project resources in ${options.cwd} were withheld because trust selection was cancelled`,
      };
    }
    const selected = choices.find(choice => choice.id === decision);
    if (selected === undefined) throw new Error(`unknown trust selection: ${decision}`);
    if (selected.updates.length > 0) trustStore.setMany([...selected.updates]);
    return { trusted: selected.trusted, source: "interactive", diagnostic: null };
  } catch (error) {
    // Protocol: an explicit bare-A1 exit propagates after the prompt restores the terminal;
    // ordinary prompt failures still continue through the fail-closed restricted shell.
    if (error instanceof Error && error.name === "ProjectTrustPromptExitError") throw error;
    return {
      trusted: false,
      source: "fail-closed",
      diagnostic: `Project resources in ${options.cwd} were withheld because trust resolution failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/** Resolve before switching effective cwd, including quoted home-relative paths. */
export function resolveSessionArgumentPath(path: string, cwd: string): string {
  const expanded = path === "~" ? homedir() : /^~[/\\]/.test(path) ? resolve(homedir(), path.slice(2)) : path;
  return resolve(cwd, expanded);
}

/** Storage lookup consumes only globally or explicitly trusted settings, never project factories. */
export function resolvePiSessionDirectory(options: {
  readonly cwd: string;
  readonly agentDir: string;
  readonly sessionDir?: string;
  readonly runtimeOptions?: RuntimeLaunchOptions;
}): string | undefined {
  const explicit = options.sessionDir ?? options.runtimeOptions?.sessionDir ?? process.env.PI_CODING_AGENT_SESSION_DIR;
  if (explicit !== undefined) return resolveSessionArgumentPath(explicit, options.cwd);
  const global = SettingsManager.create(options.cwd, options.agentDir, { projectTrusted: false });
  const trusted = options.runtimeOptions?.projectTrust ?? new ProjectTrustStore(options.agentDir).get(options.cwd) ?? (global.getDefaultProjectTrust() === "always");
  const directory = trusted ? SettingsManager.create(options.cwd, options.agentDir, { projectTrusted: true }).getSessionDir() : global.getSessionDir();
  return directory === undefined ? undefined : resolveSessionArgumentPath(directory, options.cwd);
}

/** Pinned Pi's five startup outcomes, with canonical parent scope resolved before project resources load. */
function projectTrustChoices(cwd: string): readonly PiProjectTrustChoice[] {
  let trustPath = resolve(cwd);
  try { trustPath = realpathSync(trustPath); } catch {
    // Compatibility: pinned Pi keeps the resolved path when real-path lookup fails.
  }
  const parent = dirname(trustPath);
  return [
    { id: "trust", label: "Trust", trusted: true, updates: [{ path: trustPath, decision: true }] },
    ...(parent === trustPath ? [] : [{
      id: "trust-parent" as const,
      label: `Trust parent folder (${parent})`,
      trusted: true,
      updates: [{ path: parent, decision: true }, { path: trustPath, decision: null }],
    }]),
    { id: "trust-session", label: "Trust (this session only)", trusted: true, updates: [] },
    { id: "deny", label: "Do not trust", trusted: false, updates: [{ path: trustPath, decision: false }] },
    { id: "deny-session", label: "Do not trust (this session only)", trusted: false, updates: [] },
  ];
}

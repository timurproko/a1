import { join } from "node:path";
import { DefaultPackageManager, ModelRuntime, SettingsManager } from "@earendil-works/pi-coding-agent";
import {
  agentPackageOutcome,
  type AgentPackageDescriptor,
  type AgentPackageOperation,
  type AgentPackageOutcome,
  type AgentPackagesPort,
  type AgentPackagesPortInput,
} from "../../../contracts/agent-engine/index.js";

const MODEL_REFRESH_TIMEOUT_MS = 15_000;

/**
 * Pinned Pi's package manager already takes the profile root as an argument, so
 * this binds it to the root A1 chose rather than to whatever the configuration-root
 * environment variable happens to say. Pi's own package command handler is not used:
 * it prints Pi's command names and ends the process, and both of those belong to
 * whichever A1 command is running.
 *
 * The settings manager is created with project trust withheld, which is what keeps
 * every operation to the user scope of the selected profile — a project-local
 * `packages` list is never read, so it can never be written either.
 */
export function createPiPackagesPort(input: AgentPackagesPortInput): AgentPackagesPort {
  const { profileRoot, cwd } = input;
  const settingsManager = SettingsManager.create(cwd, profileRoot, { projectTrusted: false });
  const packageManager = new DefaultPackageManager({ cwd, agentDir: profileRoot, settingsManager });
  packageManager.setProgressCallback(event => {
    if (event.type !== "start" || !event.message) return;
    input.onProgress?.({ operation: operationFor(event.action), message: event.message });
  });

  const configured = (): readonly AgentPackageDescriptor[] =>
    packageManager.listConfiguredPackages()
      .filter(entry => entry.scope === "user")
      .map(entry => Object.freeze({
        source: entry.source,
        installedPath: entry.installedPath ?? null,
        filtered: entry.filtered,
      }));

  const isConfigured = (source: string): boolean =>
    configured().some(entry => entry.source === source || entry.source.startsWith(`${source}@`));

  return Object.freeze({
    capabilities: Object.freeze({ install: true, remove: true, update: true, refreshModels: true }),
    profileRoot,

    async list(): Promise<AgentPackageOutcome> {
      return await attempt("list", null, async () => agentPackageOutcome("list", "completed", null, null, configured()));
    },

    async install(source: string): Promise<AgentPackageOutcome> {
      return await attempt("install", source, async () => {
        await packageManager.installAndPersist(source);
        return agentPackageOutcome("install", "completed", null, source, configured());
      });
    },

    async remove(source: string): Promise<AgentPackageOutcome> {
      return await attempt("remove", source, async () => {
        const removed = await packageManager.removeAndPersist(source);
        if (!removed) return agentPackageOutcome("remove", "not-found", null, source);
        return agentPackageOutcome("remove", "completed", null, source, configured());
      });
    },

    async update(source?: string): Promise<AgentPackageOutcome> {
      return await attempt("update", source ?? null, async () => {
        // Asking first keeps "that package is not installed here" a structural
        // answer rather than a string a caller would have to recognize.
        if (source !== undefined && !isConfigured(source)) return agentPackageOutcome("update", "not-found", null, source);
        await packageManager.update(source);
        return agentPackageOutcome("update", "completed", null, source ?? null, configured());
      });
    },

    async refreshModels(): Promise<AgentPackageOutcome> {
      return await attempt("refresh-models", null, async () => {
        await refreshModelCatalogs(profileRoot);
        return agentPackageOutcome("refresh-models", "completed");
      });
    },
  });
}

async function attempt(
  operation: AgentPackageOperation,
  source: string | null,
  run: () => Promise<AgentPackageOutcome>,
): Promise<AgentPackageOutcome> {
  try {
    return await run();
  } catch (error) {
    return agentPackageOutcome(operation, "failed", describe(error), source);
  }
}

async function refreshModelCatalogs(profileRoot: string): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MODEL_REFRESH_TIMEOUT_MS);
  try {
    const modelRuntime = await ModelRuntime.create({
      authPath: join(profileRoot, "auth.json"),
      modelsPath: join(profileRoot, "models.json"),
      allowModelNetwork: false,
      signal: controller.signal,
    });
    const result = await modelRuntime.refresh({ allowNetwork: true, force: true, signal: controller.signal });
    if (result.aborted) throw new Error(`model catalog refresh timed out after ${MODEL_REFRESH_TIMEOUT_MS}ms`);
    if (result.errors.size > 0) {
      throw new Error(Array.from(result.errors, ([provider, error]) => `${provider}: ${error.message}`).join("; "));
    }
  } finally {
    clearTimeout(timeout);
  }
}

function operationFor(action: "install" | "remove" | "update" | "clone" | "pull"): AgentPackageOperation {
  if (action === "install") return "install";
  if (action === "remove") return "remove";
  return "update";
}

function describe(error: unknown): string {
  const message = (error instanceof Error ? error.message : String(error)).replace(/\s+/g, " ").trim();
  if (message.length === 0) return "unknown package failure";
  return message.length > 600 ? `${message.slice(0, 597)}...` : message;
}

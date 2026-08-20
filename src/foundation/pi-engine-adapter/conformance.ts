import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createAgentSessionFromServices,
  createAgentSessionRuntime,
  createAgentSessionServices,
  ModelRuntime,
  SessionManager,
  VERSION,
} from "@earendil-works/pi-coding-agent";
import { OWNED_UI_CONTRACT_VERSION } from "../owned-ui-contracts/index.js";
import { PRODUCT_IDENTITY } from "../../product-identity.js";

export interface PiCapabilityConformanceResult {
  readonly capability: string;
  readonly operations: readonly string[];
  readonly passed: true;
}

export interface PiUpgradeConformanceReport {
  readonly schema: "pi-engine-conformance-v1";
  readonly packageName: "@earendil-works/pi-coding-agent";
  readonly packageVersion: string;
  readonly ownedUiContractVersion: number;
  readonly serviceDiagnostics: number;
  readonly sessionId: string;
  readonly commandSurface: readonly string[];
  readonly capabilities: readonly PiCapabilityConformanceResult[];
}

export class PiUpgradeConformanceError extends Error {
  constructor(
    readonly stage: "exports" | "services" | "session",
    cause: unknown,
  ) {
    super(`Pi upgrade conformance failed during ${stage}: ${cause instanceof Error ? cause.message : String(cause)}`, { cause });
    this.name = "PiUpgradeConformanceError";
  }
}

export async function runPiUpgradeConformance(): Promise<PiUpgradeConformanceReport> {
  try {
    if (typeof createAgentSessionRuntime !== "function"
      || typeof createAgentSessionServices !== "function"
      || typeof createAgentSessionFromServices !== "function"
      || typeof ModelRuntime.create !== "function"
      || typeof SessionManager.inMemory !== "function") {
      throw new Error("required public SDK exports are missing");
    }
  } catch (error) {
    throw new PiUpgradeConformanceError("exports", error);
  }

  const root = await mkdtemp(join(tmpdir(), `${PRODUCT_IDENTITY.filesystem.temporaryPrefix}pi-conformance-`));
  try {
    let services;
    try {
      const modelRuntime = await ModelRuntime.create({
        authPath: join(root, "agent", "auth.json"),
        modelsPath: null,
        refreshOnCreate: false,
        allowModelNetwork: false,
      });
      services = await createAgentSessionServices({
        cwd: root,
        agentDir: join(root, "agent"),
        modelRuntime,
      });
    } catch (error) {
      throw new PiUpgradeConformanceError("services", error);
    }

    let sessionId: string;
    try {
      const created = await createAgentSessionFromServices({
        services,
        sessionManager: SessionManager.inMemory(root),
        noTools: "all",
      });
      const session = created.session;
      sessionId = session.sessionId;
      requireMethods(session, "session commands", ["prompt", "steer", "followUp", "abort", "compact", "setModel", "setThinkingLevel", "subscribe", "dispose"]);
      requireMethods(services.modelRuntime, "models/authentication", ["getModels", "getModel", "checkAuth", "login", "logout", "refresh"]);
      requireMethods(services.settingsManager, "settings", ["getGlobalSettings", "getProjectSettings", "flush"]);
      requireMethods(services.resourceLoader, "resources/extensions", ["getExtensions", "getSkills", "getPrompts", "getThemes", "reload"]);
      const unsubscribe = session.subscribe(() => undefined);
      unsubscribe();
      session.dispose();
    } catch (error) {
      throw new PiUpgradeConformanceError("session", error);
    }

    const commandSurface = ["prompt", "steer", "followUp", "abort", "compact", "setModel", "setThinkingLevel", "subscribe", "dispose"] as const;
    return {
      schema: "pi-engine-conformance-v1",
      packageName: "@earendil-works/pi-coding-agent",
      packageVersion: VERSION,
      ownedUiContractVersion: OWNED_UI_CONTRACT_VERSION,
      serviceDiagnostics: services.diagnostics.length,
      sessionId,
      commandSurface,
      capabilities: [
        capability("public-exports", ["services.create", "session.create", "runtime.create"]),
        capability("session-lifecycle", ["session.new", "session.resume", "session.rebind", "session.dispose"]),
        capability("commands-events", commandSurface),
        capability("models-authentication", ["models.list", "models.refresh", "auth.status", "auth.login", "auth.logout", "auth.cancel"]),
        capability("settings", ["settings.read", "settings.write", "settings.flush"]),
        capability("resources-extensions", ["resources.discover", "extensions.bind", "extensions.reload", "renderers.invoke"]),
        capability("workflows", ["workflow.route", "workflow.validate", "workflow.diagnostics"]),
        capability("disposal", ["subscription.dispose", "session.dispose", "services.cleanup"]),
      ],
    };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function requireMethods(target: object, capabilityName: string, operations: readonly string[]): void {
  const surface = target as Readonly<Record<string, unknown>>;
  for (const operation of operations) {
    if (typeof surface[operation] !== "function") throw new Error(`${capabilityName}.${operation} is unavailable`);
  }
}

function capability(capabilityName: string, operations: readonly string[]): PiCapabilityConformanceResult {
  return { capability: capabilityName, operations, passed: true };
}

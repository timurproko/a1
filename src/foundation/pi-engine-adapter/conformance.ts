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

export interface PiUpgradeConformanceReport {
  readonly packageName: "@earendil-works/pi-coding-agent";
  readonly packageVersion: string;
  readonly ownedUiContractVersion: number;
  readonly serviceDiagnostics: number;
  readonly sessionId: string;
  readonly commandSurface: readonly string[];
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

  const root = await mkdtemp(join(tmpdir(), "addone-pi-conformance-"));
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
      for (const method of [
        session.prompt,
        session.abort,
        session.compact,
        session.setModel,
        session.setThinkingLevel,
        session.subscribe,
        session.dispose,
      ]) {
        if (typeof method !== "function") throw new Error("session command surface is incomplete");
      }
      session.dispose();
    } catch (error) {
      throw new PiUpgradeConformanceError("session", error);
    }

    return {
      packageName: "@earendil-works/pi-coding-agent",
      packageVersion: VERSION,
      ownedUiContractVersion: OWNED_UI_CONTRACT_VERSION,
      serviceDiagnostics: services.diagnostics.length,
      sessionId,
      commandSurface: ["prompt", "abort", "compact", "setModel", "setThinkingLevel", "subscribe", "dispose"],
    };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

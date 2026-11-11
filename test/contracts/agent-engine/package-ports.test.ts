import { describe, expect, it } from "vitest";
import {
  agentPackageOutcome,
  assertAgentPackagesPort,
  type AgentPackagesPort,
} from "../../../src/contracts/agent-engine/index.js";

function port(overrides: Partial<AgentPackagesPort> = {}): AgentPackagesPort {
  const outcome = async () => agentPackageOutcome("list", "completed");
  return {
    capabilities: { install: true, remove: true, update: true, refreshModels: true },
    profileRoot: "/profile",
    list: outcome,
    install: outcome,
    remove: outcome,
    update: outcome,
    refreshModels: outcome,
    ...overrides,
  } as AgentPackagesPort;
}

describe("agent package contract", () => {
  it("accepts a port that names a root and every operation", () => {
    expect(() => assertAgentPackagesPort(port())).not.toThrow();
  });

  it("rejects a port with no profile root, because every operation needs one", () => {
    expect(() => assertAgentPackagesPort(port({ profileRoot: "" }))).toThrow(/profile root/);
  });

  it.each(["list", "install", "remove", "update", "refreshModels"] as const)("rejects a port missing %s", operation => {
    expect(() => assertAgentPackagesPort(port({ [operation]: undefined } as Partial<AgentPackagesPort>))).toThrow(operation);
  });

  it("requires every capability to be stated rather than inferred", () => {
    const capabilities = { install: true, remove: true, update: true } as AgentPackagesPort["capabilities"];
    expect(() => assertAgentPackagesPort(port({ capabilities }))).toThrow(/refreshModels/);
  });

  it("snapshots and freezes update facts independently of later operations", () => {
    const changes = ["npm:x 1.0.0 -> 1.1.0"];
    const summary = { offline: false, warningCount: 1, changes };
    const outcome = agentPackageOutcome("update", "completed", null, null, [], summary);
    changes.push("git:x abc -> def");
    summary.warningCount = 2;
    expect(outcome.updateSummary).toEqual({ offline: false, warningCount: 1, changes: ["npm:x 1.0.0 -> 1.1.0"] });
    expect(Object.isFrozen(outcome.updateSummary)).toBe(true);
    expect(Object.isFrozen(outcome.updateSummary?.changes)).toBe(true);
  });

  it("builds a frozen outcome with explicit absences", () => {
    const outcome = agentPackageOutcome("install", "failed", "npm is unavailable", "npm:x");
    expect(outcome).toEqual({
      operation: "install",
      status: "failed",
      source: "npm:x",
      packages: [],
      detail: "npm is unavailable",
    });
    expect(Object.isFrozen(outcome)).toBe(true);
    expect(agentPackageOutcome("list", "completed").detail).toBeNull();
  });
});

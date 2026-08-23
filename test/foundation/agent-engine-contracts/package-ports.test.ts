import { describe, expect, it } from "vitest";
import {
  agentPackageOutcome,
  assertAgentPackagesPort,
  type AgentPackagesPort,
} from "../../../src/foundation/agent-engine-contracts/index.js";

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

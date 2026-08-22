import { describe, expect, it } from "vitest";
import {
  assertLaunchInstance,
  assertLaunchInstanceTransition,
  type LaunchInstance,
} from "../../../src/foundation/lifecycle/index.js";

const createdAt = "2026-08-21T20:00:00.000Z";
const activatedAt = "2026-08-21T20:00:01.000Z";
const guardianIdentity = { pid: 1001, startIdentity: "1001:guardian-start" };
const rootIdentity = { pid: 1002, startIdentity: "1002:root-start" };
const containmentIdentity = { provider: "test-containment", token: "containment-1" };

function requested(overrides: Partial<LaunchInstance> = {}): LaunchInstance {
  return {
    id: "instance-1",
    ownerClientId: "client-1",
    profileId: "sandbox",
    state: "requested",
    shutdownPolicy: "terminate-tree-on-close",
    guardianIdentity,
    rootIdentity: null,
    containmentIdentity: null,
    createdAt,
    activatedAt: null,
    stoppingAt: null,
    completedAt: null,
    outcome: null,
    ...overrides,
  };
}

function active(overrides: Partial<LaunchInstance> = {}): LaunchInstance {
  return requested({
    state: "active",
    rootIdentity,
    containmentIdentity,
    activatedAt,
    ...overrides,
  });
}

describe("launch instance lifecycle", () => {
  it("accepts the requested, active, stopping, and completed transition sequence", () => {
    const initial = requested();
    const running = active();
    const stopping = active({ state: "stopping", stoppingAt: "2026-08-21T20:00:02.000Z" });
    const completed = active({
      state: "completed",
      stoppingAt: stopping.stoppingAt,
      completedAt: "2026-08-21T20:00:03.000Z",
      outcome: { kind: "exited", exitCode: 0 },
    });

    expect(() => assertLaunchInstanceTransition(initial, running)).not.toThrow();
    expect(() => assertLaunchInstanceTransition(running, stopping)).not.toThrow();
    expect(() => assertLaunchInstanceTransition(stopping, completed)).not.toThrow();
  });

  it("allows a spawn failure to complete before activation", () => {
    const failed = requested({
      state: "completed",
      completedAt: "2026-08-21T20:00:01.000Z",
      outcome: { kind: "spawn-error", message: "runtime could not start", code: "ENOENT" },
    });
    expect(() => assertLaunchInstanceTransition(requested(), failed)).not.toThrow();
  });

  it("makes terminal outcomes and established ownership immutable", () => {
    const completed = active({
      state: "completed",
      completedAt: "2026-08-21T20:00:03.000Z",
      outcome: { kind: "exited", exitCode: 0 },
    });
    const changedOutcome = { ...completed, outcome: { kind: "exited" as const, exitCode: 1 } };
    const changedRoot = active({ rootIdentity: { ...rootIdentity, startIdentity: "reused" } });

    expect(() => assertLaunchInstanceTransition(completed, changedOutcome)).toThrow(/invalid launch instance transition/);
    expect(() => assertLaunchInstanceTransition(active(), changedRoot)).toThrow(/invalid launch instance transition|root identity is immutable/);
  });

  it("rejects malformed identities and contradictory state", () => {
    expect(() => assertLaunchInstance(requested({ id: "" }))).toThrow(/launch instance identity/);
    expect(() => assertLaunchInstance(requested({ guardianIdentity: { pid: 0, startIdentity: "invalid" } }))).toThrow(/native process identity/);
    expect(() => assertLaunchInstance(active({ containmentIdentity: { provider: "", token: "token" } }))).toThrow(/containment provider/);
    expect(() => assertLaunchInstance(requested({ rootIdentity }))).toThrow(/requested launch instance/);
    expect(() => assertLaunchInstance(active({ outcome: { kind: "exited", exitCode: 0 } }))).toThrow(/cannot have a terminal outcome/);
  });

  it("requires interruption outcomes for interrupted instances", () => {
    const interrupted = active({
      state: "interrupted",
      completedAt: "2026-08-21T20:00:03.000Z",
      outcome: { kind: "interrupted", reason: "guardian-exit", message: "guardian disconnected" },
    });
    expect(() => assertLaunchInstance(interrupted)).not.toThrow();
    expect(() => assertLaunchInstance({ ...interrupted, outcome: { kind: "exited", exitCode: 1 } })).toThrow(/interrupted launch instance/);
  });
});

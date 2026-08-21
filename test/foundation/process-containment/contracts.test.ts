import { describe, expect, it, vi } from "vitest";
import type { LaunchInstanceOutcome, NativeProcessIdentity } from "../../../src/foundation/lifecycle/index.js";
import {
  closeVerifiedContainment,
  type NativeProcessInspector,
  type ProcessContainment,
} from "../../../src/foundation/process-containment/index.js";

const rootIdentity: NativeProcessIdentity = { pid: 7001, startIdentity: "7001:native-start" };

describe("process containment contracts", () => {
  it("stops gracefully after exact process and containment verification", async () => {
    const fixture = containmentFixture({ waitResults: [true] });
    const result = await closeVerifiedContainment(fixture.containment, fixture.inspector, rootIdentity, "user-request");

    expect(result).toEqual({ outcome: { kind: "stopped", reason: "user-request" }, graceful: true, forced: false });
    expect(fixture.inspector.matches).toHaveBeenCalledWith(rootIdentity);
    expect(fixture.containment.contains).toHaveBeenCalledWith(rootIdentity);
    expect(fixture.containment.stop).toHaveBeenCalledWith(false);
    expect(fixture.containment.stop).not.toHaveBeenCalledWith(true);
  });

  it("re-verifies ownership before one forced escalation", async () => {
    const fixture = containmentFixture({ waitResults: [false, true] });
    const result = await closeVerifiedContainment(fixture.containment, fixture.inspector, rootIdentity, "update", 25);

    expect(result).toMatchObject({ outcome: { kind: "stopped", reason: "update" }, graceful: false, forced: true });
    expect(fixture.inspector.matches).toHaveBeenCalledTimes(2);
    expect(fixture.containment.contains).toHaveBeenCalledTimes(2);
    expect(fixture.containment.stop.mock.calls).toEqual([[false], [true]]);
    expect(fixture.containment.waitForEmpty.mock.calls).toEqual([[25], [25]]);
  });

  it("refuses cleanup when a PID was reused before the graceful stage", async () => {
    const fixture = containmentFixture({ matchResults: [false] });
    await expect(closeVerifiedContainment(fixture.containment, fixture.inspector, rootIdentity, "owner-disconnect"))
      .resolves.toMatchObject({ outcome: { kind: "cleanup-error", code: "PROCESS_IDENTITY_MISMATCH" } });
    expect(fixture.containment.stop).not.toHaveBeenCalled();
  });

  it("refuses forced cleanup when ownership changes after the graceful deadline", async () => {
    const fixture = containmentFixture({ matchResults: [true, false], waitResults: [false] });
    await expect(closeVerifiedContainment(fixture.containment, fixture.inspector, rootIdentity, "supervisor-disconnect"))
      .resolves.toMatchObject({ outcome: { kind: "cleanup-error", code: "PROCESS_IDENTITY_MISMATCH" } });
    expect(fixture.containment.stop.mock.calls).toEqual([[false]]);
  });

  it("reports a bounded timeout after one forced attempt", async () => {
    const fixture = containmentFixture({ waitResults: [false, false] });
    await expect(closeVerifiedContainment(fixture.containment, fixture.inspector, rootIdentity, "update"))
      .resolves.toMatchObject({ outcome: { kind: "cleanup-error", code: "CONTAINMENT_CLEANUP_TIMEOUT" } });
    expect(fixture.containment.stop.mock.calls).toEqual([[false], [true]]);
  });
});

function containmentFixture(options: { matchResults?: boolean[]; membershipResults?: boolean[]; waitResults?: boolean[] }) {
  const matchResults = options.matchResults ?? [true, true];
  const membershipResults = options.membershipResults ?? [true, true];
  const waitResults = options.waitResults ?? [true];
  const inspector: NativeProcessInspector & { matches: ReturnType<typeof vi.fn> } = {
    observe: vi.fn(async () => rootIdentity),
    matches: vi.fn(async () => matchResults.shift() ?? true),
  };
  const containment: ProcessContainment & {
    contains: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    waitForEmpty: ReturnType<typeof vi.fn>;
  } = {
    identity: { provider: "test", token: "scope-1" },
    spawn: vi.fn(async () => ({ identity: rootIdentity, outcome: new Promise<LaunchInstanceOutcome>(() => undefined) })),
    contains: vi.fn(async () => membershipResults.shift() ?? true),
    stop: vi.fn(async () => undefined),
    waitForEmpty: vi.fn(async () => waitResults.shift() ?? false),
    close: vi.fn(async () => undefined),
  };
  return { inspector, containment };
}
